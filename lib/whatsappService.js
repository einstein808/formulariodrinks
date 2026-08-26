import { ref, get, push, serverTimestamp } from 'firebase/database'
import { db } from './firebase'
import { calculatePackagePrice } from './pricingUtils'
import { getRecommendation, cleanPhoneForWhatsApp } from './utils'

const API_URL = process.env.NEXT_PUBLIC_WPP_API_URL
const API_KEY = process.env.NEXT_PUBLIC_WPP_API_KEY

export const logMessageToLead = async (leadId, type, number, success, errorMsg = null) => {
  if (!leadId) return
  try {
    await push(ref(db, `leads/${leadId}/messages`), {
      type,
      number,
      success,
      error: errorMsg,
      sentAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Erro ao registrar log de mensagem:', err)
  }
}

export const sendWhatsAppQuote = async (formData, pacotes, leadId = null) => {
  let number = cleanPhoneForWhatsApp(formData.telefone)

  const convidadosTexto = (formData.convidados || 30).toString()
  const convidados = Math.max(formData.convidados || 40, 40)

  let orcamentoIntro = `Olá, *{{nome}}*! Tudo bem? 😊\nAgradecemos o interesse no *Laboratório de Drinks*. Para o seu evento com *{{convidados}} convidados*, preparamos os seguintes orçamentos baseados nos nossos pacotes para facilitar sua decisão:\n\n`;
  let orcamentoFim = `Qualquer dúvida ou quando quiser fechar um pacote, é só me responder aqui! 🥂`;

  let abTestingConfig = null;
  try {
    const generalSnap = await get(ref(db, 'config/general'));
    if (generalSnap.exists()) {
      const genData = generalSnap.val();
      if (genData.orcamentoIntro) orcamentoIntro = genData.orcamentoIntro;
      if (genData.orcamentoFim) orcamentoFim = genData.orcamentoFim;
    }
    const abSnap = await get(ref(db, 'config/abTesting'));
    if (abSnap.exists()) abTestingConfig = abSnap.val();
  } catch (error) {
    console.error('Erro ao obter configuração no Firebase:', error);
  }

  // Substituir variáveis na introdução
  let text = orcamentoIntro
    .replace(/\{\{nome\}\}/gi, formData.nome || '')
    .replace(/\{\{convidados\}\}/gi, convidadosTexto)
    .replace(/\{\{cidade\}\}/gi, formData.cidade || '')
    .replace(/\{\{duracao\}\}/gi, (formData.duracao || 5).toString())
    .replace(/\{\{horarioEvento\}\}/gi, formData.horarioEvento || '')
    .replace(/\{\{horarioInicio\}\}/gi, formData.horarioEvento || '');

  if (formData.upsellFrozen) {
    if (formData.pacote === 'mao-de-obra') {
      text += `❄️ *Excelente escolha!* Como você optou pela Experiência Frozen, já adicionamos a Máquina (+ R$ 250) aos valores abaixo para garantir que o seu Laboratório seja inesquecível!\n\n`
    } else {
      text += `❄️ *Excelente escolha!* Como você optou pela Experiência Frozen, já adicionamos a Máquina (+ R$ 10 por convidado) aos valores abaixo para garantir que o seu Laboratório seja inesquecível!\n\n`
    }
  }

  // Filtrar pacotes e aplicar preços A/B conforme o grupo do lead
  const isGroupB = formData.abGroup === 'B';
  const pacotesValidos = (pacotes || [])
    .filter(p => !p.hidden)
    .filter(p => {
      if (isGroupB && abTestingConfig?.hideMaoDeObraInB) {
        const name = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        if (name.includes('obra') || id.includes('obra')) return false;
      }
      return true;
    })
    .map(p => {
      if (isGroupB && p.priceB && p.priceB.trim() !== '') {
        return { ...p, price: p.priceB };
      }
      return p;
    });

  pacotesValidos.forEach(p => {
    const calc = calculatePackagePrice(p, convidados, formData.duracao || 5, {
      upsellFrozen: formData.upsellFrozen,
      abGroup: formData.abGroup || 'A'
    });
    
    let finalPrice = calc.finalPrice;
    
    // Fallback/Special case for Mão de Obra if not set as tier
    if (!calc.isTier && !calc.isPerPerson) {
      const rec = getRecommendation(convidados);
      const barmansCount = rec.barmans;
      const ajudantesCount = rec.ajudantes;
      const barmansBase = barmansCount > 0 ? 350 + (barmansCount - 1) * 200 : 0;
      const baseMaoDeObra = barmansBase + (ajudantesCount * 170);
      const additionalHours = Math.max(0, parseInt(formData.duracao || 5, 10) - 5);
      const extraHourRate = barmansCount * 70 + ajudantesCount * 40;
      finalPrice = baseMaoDeObra + (additionalHours * extraHourRate);
      if (formData.upsellFrozen) finalPrice += 250;
    }

    text += `*${p.emoji || ''} Pacote ${p.name}*\n`
    text += `💵 *Valor Total:* R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
    if (calc.isTier && calc.tierLabel) {
      text += `_Faixa: ${calc.tierLabel}_\n`
    } else if (!calc.isPerPerson) {
      text += `_Valor fixo do serviço_\n`
    } else {
      text += `_${p.price} ${p.priceLabel}_\n`
    }
    text += `*O que inclui:*\n`
    if (p.features && p.features.length) {
      p.features.forEach(f => {
        text += `✅ ${f}\n`
      })
    }
    text += `\n`
  })

  // Upsells secundários
  if (formData.upsellChopp) {
    text += `*Turbinamos o seu evento com:*\n`
    text += `🍺 Máquina de Chopp a Gelo (Valor sob consulta de barril)\n`
    text += `\n`
  }

  // Taxa de Deslocamento
  const city = formData.cidade || '';
  if (city) {
    const normalizeString = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isLocalCity = ['juiz de fora', 'matias barbosa', 'simao pereira'].some(
      c => normalizeString(city) === c
    );

    if (isLocalCity) {
      text += `🚗 *Deslocamento:* Já incluso para ${city}!\n\n`
    } else {
      text += `🚗 *Deslocamento para ${city}:* Frete a consultar.\n\n`
    }
  }

  // Substituir variáveis na conclusão
  text += orcamentoFim
    .replace(/\{\{nome\}\}/gi, formData.nome || '')
    .replace(/\{\{convidados\}\}/gi, convidadosTexto)
    .replace(/\{\{cidade\}\}/gi, formData.cidade || '')
    .replace(/\{\{duracao\}\}/gi, (formData.duracao || 5).toString())
    .replace(/\{\{horarioEvento\}\}/gi, formData.horarioEvento || '')
    .replace(/\{\{horarioInicio\}\}/gi, formData.horarioEvento || '');

  let endpoint = API_URL;
  let apiKey = API_KEY;

  try {
    const configSnap = await get(ref(db, 'config/evolutionApi'));
    if (configSnap.exists()) {
      const apiInst = configSnap.val();
      if (apiInst && apiInst.url && apiInst.apikey && apiInst.instance) {
        const baseUrl = apiInst.url.endsWith('/') ? apiInst.url.slice(0, -1) : apiInst.url;
        endpoint = `${baseUrl}/message/sendText/${apiInst.instance}`;
        apiKey = apiInst.apikey;
      }
    }
  } catch (error) {
    console.error('Erro ao obter configuração do Evolution API no Firebase:', error);
  }

  const payload = {
    number: number,
    text: text
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Aviso no envio de WhatsApp (API/Número):', errorText);
      await logMessageToLead(leadId, 'orcamento', number, false, errorText);
      return { 
        success: false, 
        error: errorText, 
        numberNotExists: errorText.includes('"exists":false') || errorText.includes('exists:false') 
      };
    }

    const result = await response.json();
    await logMessageToLead(leadId, 'orcamento', number, true);
    return { success: true, data: result };
  } catch (error) {
    console.warn('Aviso no envio de WhatsApp:', error.message || error);
    await logMessageToLead(leadId, 'orcamento', number, false, error.message || 'Erro de conexão');
    return { success: false, error: error.message || 'Erro de conexão' };
  }
}
