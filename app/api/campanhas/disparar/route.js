import { NextResponse } from 'next/server';
import { ref, get, set, push, update } from 'firebase/database';
import { db } from '../../../../lib/firebase';
import { cleanPhoneForWhatsApp } from '../../../../lib/utils';

const DELAY_MS = 1500;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatDateBr(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function interpolarParceiro(template, parceiro, categoriasList) {
  const pCats = Array.isArray(parceiro.categorias) 
    ? parceiro.categorias 
    : (parceiro.categoria ? [parceiro.categoria] : []);
  
  const catNames = pCats.map(cSlug => {
    const found = categoriasList.find(c => c.slug === cSlug);
    return found ? found.nome : cSlug;
  }).join(', ');

  const currentMonth = MESES[new Date().getMonth()];

  return (template || '')
    .replace(/\{\{nome\}\}/gi, parceiro.nome || '')
    .replace(/\{\{categorias\}\}/gi, catNames || 'Parceiro')
    .replace(/\{\{categoria\}\}/gi, catNames || 'Parceiro')
    .replace(/\{\{mes\}\}/gi, currentMonth);
}

function interpolarLead(template, lead) {
  const currentMonth = MESES[new Date().getMonth()];
  const primeiroNome = (lead.nome || '').trim().split(' ')[0] || 'Cliente';
  const dataFormatada = formatDateBr(lead.dataEvento);

  return (template || '')
    .replace(/\{\{nome\}\}/gi, primeiroNome)
    .replace(/\{\{nomeCompleto\}\}/gi, `${lead.nome || ''} ${lead.sobrenome || ''}`.trim())
    .replace(/\{\{tipoEvento\}\}/gi, lead.tipoEvento || 'evento')
    .replace(/\{\{dataEvento\}\}/gi, dataFormatada || 'sua data')
    .replace(/\{\{cidade\}\}/gi, lead.cidade || 'sua região')
    .replace(/\{\{pacote\}\}/gi, lead.pacote || 'personalizado')
    .replace(/\{\{convidados\}\}/gi, (lead.convidados || '').toString())
    .replace(/\{\{mes\}\}/gi, currentMonth);
}

async function getEvolutionConfig() {
  let endpoint = process.env.NEXT_PUBLIC_WPP_API_URL || 'https://api.gabryelamaro.com/message/sendText/BarmanJF';
  let apiKey = process.env.NEXT_PUBLIC_WPP_API_KEY || '';
  let baseUrl = 'https://api.gabryelamaro.com';
  let instance = 'BarmanJF';

  try {
    const configSnap = await get(ref(db, 'config/evolutionApi'));
    if (configSnap.exists()) {
      const apiInst = configSnap.val();
      if (apiInst && apiInst.url && apiInst.apikey && apiInst.instance) {
        baseUrl = apiInst.url.endsWith('/') ? apiInst.url.slice(0, -1) : apiInst.url;
        instance = apiInst.instance;
        apiKey = apiInst.apikey;
      }
    } else {
      if (endpoint.includes('/message/sendText/')) {
        const parts = endpoint.split('/message/sendText/');
        baseUrl = parts[0];
        instance = parts[1] || 'BarmanJF';
      }
    }
  } catch (error) {
    console.error('Erro ao obter configuração Evolution API:', error);
  }

  return { baseUrl, instance, apiKey };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      mensagem, 
      tipo = 'texto', 
      midia = '', 
      publico = 'parceiros', // 'parceiros' | 'leads'
      parceiroSlugs, 
      leadIds,
      segmentoLead = 'todos'
    } = body;

    if (!mensagem || !mensagem.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const { baseUrl, instance, apiKey } = await getEvolutionConfig();
    const campanhaId = `camp_${Date.now()}`;
    const agoraIso = new Date().toISOString();

    let targetItems = [];
    let isLeads = publico === 'leads';

    if (isLeads) {
      // Disparo para LEADS / CLIENTES
      const leadsSnap = await get(ref(db, 'leads'));
      if (!leadsSnap.exists()) {
        return NextResponse.json({ error: 'Nenhum lead encontrado' }, { status: 404 });
      }

      const allLeads = Object.entries(leadsSnap.val()).map(([id, val]) => ({ id, ...val }));
      
      if (Array.isArray(leadIds) && leadIds.length > 0) {
        targetItems = allLeads.filter(l => leadIds.includes(l.id));
      } else {
        targetItems = allLeads;
      }
    } else {
      // Disparo para PARCEIROS
      const [parceirosSnap, categoriasSnap] = await Promise.all([
        get(ref(db, 'config/cerimonialistas')),
        get(ref(db, 'config/categorias-parceiros'))
      ]);

      if (!parceirosSnap.exists()) {
        return NextResponse.json({ error: 'Nenhum parceiro cadastrado' }, { status: 404 });
      }

      const parceirosData = parceirosSnap.val();
      const categoriasList = categoriasSnap.exists() 
        ? Object.entries(categoriasSnap.val()).map(([slug, item]) => ({ slug, ...item })) 
        : [];

      let list = Object.entries(parceirosData)
        .map(([slug, item]) => ({ slug, ...item }))
        .filter(p => p.ativo !== false);

      if (Array.isArray(parceiroSlugs) && parceiroSlugs.length > 0) {
        list = list.filter(p => parceiroSlugs.includes(p.slug));
      }

      targetItems = list.map(p => ({ ...p, _categoriasList: categoriasList }));
    }

    if (targetItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum destinatário selecionado para disparo' }, { status: 400 });
    }

    // Registra início da campanha no Firebase
    await set(ref(db, `campanhas/${campanhaId}`), {
      id: campanhaId,
      publico: isLeads ? 'leads' : 'parceiros',
      segmentoLead: isLeads ? segmentoLead : null,
      mensagem,
      tipo,
      midia: midia || '',
      criadaEm: agoraIso,
      status: 'em_andamento',
      total: targetItems.length,
      sucesso: 0,
      erro: 0,
      resultados: {}
    });

    let sucessoCount = 0;
    let erroCount = 0;
    const resultados = {};

    for (let i = 0; i < targetItems.length; i++) {
      const item = targetItems[i];
      const rawPhone = isLeads ? (item.telefone || item.whatsapp || '') : (item.whatsapp || '');
      const cleaned = cleanPhoneForWhatsApp(rawPhone);
      const itemKey = isLeads ? item.id : item.slug;
      const itemNome = isLeads ? `${item.nome || ''} ${item.sobrenome || ''}`.trim() : item.nome;

      if (!cleaned || cleaned.length < 10) {
        erroCount++;
        resultados[itemKey] = {
          nome: itemNome,
          success: false,
          error: 'Número de telefone inválido ou incompleto'
        };
        continue;
      }

      const textPersonalizado = isLeads
        ? interpolarLead(mensagem, item)
        : interpolarParceiro(mensagem, item, item._categoriasList || []);

      let sendEndpoint = `${baseUrl}/message/sendText/${instance}`;
      let sendPayload = {
        number: cleaned,
        text: textPersonalizado
      };

      if (tipo === 'imagem' && midia) {
        sendEndpoint = `${baseUrl}/message/sendMedia/${instance}`;
        sendPayload = {
          number: cleaned,
          mediatype: 'image',
          media: midia,
          caption: textPersonalizado
        };
      } else if (tipo === 'instagram' && midia) {
        sendPayload.text = `${textPersonalizado}\n\n👉 Confira nossa publicação: ${midia}`;
      }

      try {
        const response = await fetch(sendEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify(sendPayload)
        });

        if (response.ok) {
          sucessoCount++;
          const updateTime = new Date().toISOString();
          resultados[itemKey] = {
            nome: itemNome,
            success: true,
            sentAt: updateTime
          };

          if (isLeads) {
            // Atualiza último contato e registra na timeline de mensagens do lead
            await update(ref(db, `leads/${item.id}`), {
              ultimoContato: updateTime
            });

            await push(ref(db, `leads/${item.id}/messages`), {
              type: 'campanha_whatsapp',
              number: cleaned,
              success: true,
              text: textPersonalizado,
              sentAt: updateTime
            });
          } else {
            // Atualiza último contato no parceiro
            await set(ref(db, `config/cerimonialistas/${item.slug}/ultimoContato`), updateTime);
          }
        } else {
          erroCount++;
          const errText = await response.text();
          resultados[itemKey] = {
            nome: itemNome,
            success: false,
            error: errText || 'Erro retornado pela Evolution API'
          };
        }
      } catch (err) {
        erroCount++;
        resultados[itemKey] = {
          nome: itemNome,
          success: false,
          error: err.message || 'Falha de conexão com Evolution API'
        };
      }

      // Atualiza progresso da campanha em tempo real
      await set(ref(db, `campanhas/${campanhaId}/sucesso`), sucessoCount);
      await set(ref(db, `campanhas/${campanhaId}/erro`), erroCount);
      await set(ref(db, `campanhas/${campanhaId}/resultados/${itemKey}`), resultados[itemKey]);

      // Delay entre mensagens
      if (i < targetItems.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    // Finaliza status da campanha
    await set(ref(db, `campanhas/${campanhaId}/status`), 'concluida');
    await set(ref(db, `campanhas/${campanhaId}/concluidaEm`), new Date().toISOString());

    return NextResponse.json({
      ok: true,
      campanhaId,
      publico: isLeads ? 'leads' : 'parceiros',
      total: targetItems.length,
      sucesso: sucessoCount,
      erro: erroCount,
      resultados
    });

  } catch (error) {
    console.error('Erro no processamento da campanha:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
