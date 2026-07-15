import { NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { db } from '../../../lib/firebase';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat'; // DeepSeek V3 — $0.27/1M tokens, $5 free credit on signup

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(val) {
  const num = parseFloat(val || 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildSimilarEventsContext(allLeads, targetLead) {
  const closed = Object.values(allLeads).filter(l =>
    l.status === 'fechado' || l.status === 'realizado'
  );

  const similar = closed
    .filter(l => l.id !== targetLead.id)
    .filter(l =>
      l.tipoEvento === targetLead.tipoEvento ||
      (l.pacote || '').toLowerCase() === (targetLead.pacote || '').toLowerCase()
    )
    .slice(0, 5);

  if (similar.length === 0) return '';

  const lines = similar.map(l => {
    const fat = parseFloat(l.financeiro?.faturamento || 0);
    return `- ${l.tipoEvento || 'Evento'} | ${l.convidados || '?'} convidados | ${l.pacote || 'Pacote?'} | Fechado por ${fat > 0 ? formatCurrency(fat) : 'valor não registrado'}`;
  });

  return `\nEventos similares já fechados no histórico:\n${lines.join('\n')}`;
}

function buildPrompt(lead, similarContext, scriptsConfig) {
  const lastUpdate = lead.updatedAt ? daysSince(lead.updatedAt) : null;
  const diasParado = lastUpdate ?? daysSince(lead.createdAt) ?? 'alguns';

  const nome = `${lead.nome || ''} ${lead.sobrenome || ''}`.trim();
  const dataEvento = lead.dataEvento
    ? new Date(lead.dataEvento).toLocaleDateString('pt-BR')
    : 'data não informada';

  let scriptInspiration = '';
  if (scriptsConfig) {
    const retarget = scriptsConfig.retarget15?.text || scriptsConfig.retarget30?.text || '';
    const autoridade = scriptsConfig.autoridade?.text || '';
    const escassez = scriptsConfig.escassez?.text || '';
    if (retarget || autoridade || escassez) {
      scriptInspiration = `\nReferência de tom e estilo (adapte livremente):
Retargeting: "${retarget.slice(0, 200)}"
Autoridade: "${autoridade.slice(0, 200)}"
Escassez: "${escassez.slice(0, 200)}"`;
    }
  }

  return `Você é um assistente de vendas do "Laboratório de Drinks" — serviço premium de bar e coquetelaria em Juiz de Fora, MG.

PERFIL DO LEAD:
- Nome: ${nome}
- Tipo de evento: ${lead.tipoEvento || 'não informado'}
- Data do evento: ${dataEvento}
- Cidade: ${lead.cidade || 'não informada'}
- Convidados: ${lead.convidados || 'não informado'}
- Pacote: ${lead.pacote || 'não definido'}
- Dias sem resposta: ${diasParado} dias
${similarContext}
${scriptInspiration}

TAREFA: Gere UMA mensagem de follow-up para WhatsApp.

REGRAS OBRIGATÓRIAS:
- Máximo 5 linhas
- Comece pelo nome da pessoa (sem "Olá, como vai?")
- Tom informal e próximo, mas profissional
- 1 ou 2 emojis no máximo
- Termine com UMA pergunta aberta
- NÃO mencione valores específicos
- NÃO inclua prefixos como "Mensagem:" ou explicações
- Responda APENAS com o texto da mensagem, sem aspas`;
}

export async function POST(request) {
  try {
    const { lead } = await request.json();

    if (!lead) {
      return NextResponse.json({ error: 'Dados do lead não fornecidos' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
      return NextResponse.json({
        error: 'DEEPSEEK_API_KEY não configurada. Acesse https://platform.deepseek.com/api_keys para obter sua chave (R$5 de crédito grátis).'
      }, { status: 500 });
    }

    // Fetch similar closed leads for RAG context
    let allLeads = {};
    try {
      const leadsSnap = await get(ref(db, 'leads'));
      if (leadsSnap.exists()) allLeads = leadsSnap.val();
    } catch (_) {}

    // Fetch scripts config for tone inspiration
    let scriptsConfig = null;
    try {
      const scriptsSnap = await get(ref(db, 'config/scripts'));
      if (scriptsSnap.exists()) scriptsConfig = scriptsSnap.val();
    } catch (_) {}

    const similarContext = buildSimilarEventsContext(allLeads, lead);
    const prompt = buildPrompt(lead, similarContext, scriptsConfig);

    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 300,
        top_p: 0.9
      })
    });

    if (!deepseekResponse.ok) {
      const err = await deepseekResponse.text();
      console.error('DeepSeek API error:', err);
      return NextResponse.json({ error: 'Falha ao gerar mensagem via DeepSeek API', details: err }, { status: 502 });
    }

    const deepseekData = await deepseekResponse.json();
    const message = deepseekData?.choices?.[0]?.message?.content?.trim();

    if (!message) {
      return NextResponse.json({ error: 'DeepSeek não retornou uma mensagem válida' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Erro na geração de follow-up:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar follow-up', details: error.message }, { status: 500 });
  }
}
