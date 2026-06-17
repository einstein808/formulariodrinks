// src/services/whatsappService.js
import { ref, get, push, serverTimestamp } from 'firebase/database'
import { db } from './firebase'

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
  // Limpar número (remover tudo que não for dígito)
  let number = formData.telefone.replace(/\D/g, '')
  
  // Adicionar DDI (55 para o Brasil) se não tiver
  if (number.length === 10 || number.length === 11) {
    number = `55${number}`
  }

  const convidados = Math.max(formData.convidados || 40, 40)

  // Construir o texto da mensagem
  let text = `Olá, *${formData.nome}*! Tudo bem? 😊\n`
  text += `Agradecemos o interesse no *Laboratório de Drinks*. Para o seu evento com *${convidados} convidados*, preparamos os seguintes orçamentos baseados nos nossos pacotes para facilitar sua decisão:\n\n`

  if (formData.upsellFrozen) {
    if (formData.pacote === 'mao-de-obra') {
      text += `❄️ *Excelente escolha!* Como você optou pela Experiência Frozen, já adicionamos a Máquina (+ R$ 250) aos valores abaixo para garantir que o seu Laboratório seja inesquecível!\n\n`
    } else {
      text += `❄️ *Excelente escolha!* Como você optou pela Experiência Frozen, já adicionamos a Máquina (+ R$ 10 por convidado) aos valores abaixo para garantir que o seu Laboratório seja inesquecível!\n\n`
    }
  }

  // Usar todos os pacotes disponíveis
  const pacotesValidos = pacotes;

  pacotesValidos.forEach(p => {
    // Calcular o preço final
    const numericPrice = parseInt(p.price.replace(/\D/g, ''), 10) || 0;
    let finalPrice = numericPrice;
    
    if (p.priceLabel && p.priceLabel.toLowerCase().includes('por pessoa')) {
      finalPrice = numericPrice * convidados;
    }

    if (formData.upsellFrozen) {
      if (p.id === 'mao-de-obra') {
        finalPrice += 250;
      } else if (p.id !== 'standard-frozen') {
        finalPrice += (10 * convidados);
      }
    }
    
    text += `*${p.emoji || ''} Pacote ${p.name}*\n`
    text += `💵 *Valor Total:* R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
    text += `_${p.price} ${p.priceLabel}_\n`
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

  text += `Qualquer dúvida ou quando quiser fechar um pacote, é só me responder aqui! 🥂`

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
      console.error('Falha ao enviar mensagem via WhatsApp:', errorText);
      await logMessageToLead(leadId, 'orcamento', number, false, errorText);
      throw new Error('Falha ao enviar mensagem via WhatsApp');
    }

    const result = await response.json()
    await logMessageToLead(leadId, 'orcamento', number, true);
    return result
  } catch (error) {
    console.error('Erro no envio de WhatsApp:', error)
    if (error.message !== 'Falha ao enviar mensagem via WhatsApp') {
      await logMessageToLead(leadId, 'orcamento', number, false, error.message);
    }
    return null
  }
}
