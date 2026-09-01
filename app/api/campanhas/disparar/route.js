import { NextResponse } from 'next/server';
import { ref, get, set, push, update } from 'firebase/database';
import { db } from '../../../../lib/firebase';
import { cleanPhoneForWhatsApp } from '../../../../lib/utils';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

/**
 * Processa sintaxe Spintax {Opção 1|Opção 2|Opção 3} recursivamente
 */
function processSpintax(text) {
  if (!text) return '';
  let result = text;
  const spintaxRegex = /\{([^{}]+)\}/g;
  
  let match;
  while ((match = spintaxRegex.exec(result)) !== null) {
    const choices = match[1].split('|');
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    result = result.replace(match[0], chosen);
    spintaxRegex.lastIndex = 0;
  }
  
  return result;
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

  let raw = (template || '')
    .replace(/\{\{nome\}\}/gi, parceiro.nome || '')
    .replace(/\{\{categorias\}\}/gi, catNames || 'Parceiro')
    .replace(/\{\{categoria\}\}/gi, catNames || 'Parceiro')
    .replace(/\{\{mes\}\}/gi, currentMonth);

  return processSpintax(raw);
}

function interpolarLead(template, lead) {
  const currentMonth = MESES[new Date().getMonth()];
  const primeiroNome = (lead.nome || '').trim().split(' ')[0] || 'Cliente';
  const dataFormatada = formatDateBr(lead.dataEvento);

  let raw = (template || '')
    .replace(/\{\{nome\}\}/gi, primeiroNome)
    .replace(/\{\{nomeCompleto\}\}/gi, `${lead.nome || ''} ${lead.sobrenome || ''}`.trim())
    .replace(/\{\{tipoEvento\}\}/gi, lead.tipoEvento || 'evento')
    .replace(/\{\{dataEvento\}\}/gi, dataFormatada || 'sua data')
    .replace(/\{\{cidade\}\}/gi, lead.cidade || 'sua região')
    .replace(/\{\{pacote\}\}/gi, lead.pacote || 'personalizado')
    .replace(/\{\{convidados\}\}/gi, (lead.convidados || '').toString())
    .replace(/\{\{mes\}\}/gi, currentMonth);

  return processSpintax(raw);
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

/**
 * Simula presença "Digitando..." via Evolution API
 */
async function simulateTypingPresence(baseUrl, instance, apiKey, number, durationMs = 2500) {
  try {
    const presenceEndpoint = `${baseUrl}/chat/sendPresence/${instance}`;
    await fetch(presenceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number,
        presence: 'composing',
        delay: durationMs
      })
    });
  } catch (err) {
    // Falha silenciosa de presença para não interromper fluxo principal
    console.warn('Presença de digitação ignorada:', err.message);
  }
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

    // Registra início da campanha com flags anti-ban
    await set(ref(db, `campanhas/${campanhaId}`), {
      id: campanhaId,
      publico: isLeads ? 'leads' : 'parceiros',
      segmentoLead: isLeads ? segmentoLead : null,
      mensagem,
      tipo,
      midia: midia || '',
      criadaEm: agoraIso,
      status: 'em_andamento',
      antiBan: {
        spintaxAtivo: true,
        typingSimulated: true,
        jitterDelay: '4s-8s + pausas de lote'
      },
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

      // 1. Interpolação + Spintax dinâmico único para cada contato
      const textPersonalizado = isLeads
        ? interpolarLead(mensagem, item)
        : interpolarParceiro(mensagem, item, item._categoriasList || []);

      // 2. Simulação de Digitação Humana (2.0s a 3.5s)
      const typingDuration = getRandomInt(2000, 3500);
      await simulateTypingPresence(baseUrl, instance, apiKey, cleaned, typingDuration);
      await sleep(typingDuration);

      // 3. Montagem do payload de envio
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

      // 4. Jitter Delay Humanizado entre mensagens (4s a 7s)
      if (i < targetItems.length - 1) {
        const humanDelay = getRandomInt(4000, 7000);
        await sleep(humanDelay);

        // 5. Pausa de Lote a cada 8 envios (15s a 25s) para resfriamento do socket
        if ((i + 1) % 8 === 0) {
          const batchCoolingPause = getRandomInt(15000, 25000);
          await sleep(batchCoolingPause);
        }
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
