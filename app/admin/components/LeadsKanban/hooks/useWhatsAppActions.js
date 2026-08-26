import { useState } from 'react';
import { logMessageToLead } from '@/lib/whatsappService';
import { MONTH_NAMES } from '@/lib/constants';

export function useWhatsAppActions({
  selectedLead,
  evolutionApi,
  scripts,
  generalConfigs,
  setSendingScript,
  showToast,
  showConfirm
}) {
  const [aiFollowupLoading, setAiFollowupLoading] = useState(false);
  const [aiFollowupResult, setAiFollowupResult] = useState(null);
  const [aiFollowupCopied, setAiFollowupCopied] = useState(false);

  const handleGenerateFollowup = async () => {
    if (!selectedLead) return;
    setAiFollowupLoading(true);
    setAiFollowupResult(null);
    setAiFollowupCopied(false);
    try {
      const res = await fetch('/api/gerar-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
      setAiFollowupResult(data.message);
    } catch (err) {
      showToast(`Erro ao gerar follow-up: ${err.message}`, 'error');
    } finally {
      setAiFollowupLoading(false);
    }
  };

  const handleCopyFollowup = () => {
    if (!aiFollowupResult) return;
    navigator.clipboard.writeText(aiFollowupResult);
    setAiFollowupCopied(true);
    setTimeout(() => setAiFollowupCopied(false), 2500);
  };

  const handleSendEvolution = async (scriptType) => {
    if (!selectedLead) return;
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast("A API Evolution não está configurada corretamente. Vá até as configurações.", "warning");
      return;
    }
    
    let scriptConfig = scripts?.[scriptType];
    if (scriptType === 'contrato' && (!scriptConfig || !scriptConfig.text)) {
      scriptConfig = {
        text: "Olá {{nome}},\n\nPara gerarmos o contrato do seu evento no dia {{dataEvento}}, por favor preencha os seus dados de contratante e selecione os drinks da sua festa acessando o link abaixo:\n\n{{linkContrato}}\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\nEquipe Formulário Drinks",
        image: ""
      };
    } else if (scriptType === 'aCaminho' && (!scriptConfig || !scriptConfig.text)) {
      scriptConfig = {
        text: "Olá, {{nome}}! 🚗💨 A equipe do Laboratório de Drinks já está a caminho do seu evento em {{cidade}}! Qualquer orientação sobre a chegada ou acesso ao local, pode nos avisar por aqui. Até breve! 🍸",
        image: ""
      };
    } else if (!scriptConfig || !scriptConfig.text) {
      showToast("O texto deste script não está configurado. Vá até as configurações para escrevê-lo.", "warning");
      return;
    }

    showConfirm("Deseja enviar essa mensagem automaticamente pelo WhatsApp agora?", async () => {
      setSendingScript(true);
      try {
        const baseSiteUrl = generalConfigs?.siteUrl 
          ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
          : (typeof window !== 'undefined' ? window.location.origin : '');
        const linkAvaliacao = `${baseSiteUrl}/avaliacao/${selectedLead.id}`;
        const linkContrato = `${baseSiteUrl}/contrato/${selectedLead.id}`;

        let mesNome = '';
        let anoEvento = '';
        if (selectedLead.dataEvento) {
          const parts = selectedLead.dataEvento.split('-');
          if (parts.length >= 2) {
            anoEvento = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
              mesNome = MONTH_NAMES[monthIndex];
            }
          }
        }

        const hasLinkPlaceholder = /\{\{(linkAvaliacao|linkavaliacao|linkAvaliação|link_avaliacao|linkNps|linknps|linkReview|linkreview)\}\}/gi.test(scriptConfig.text);
        const hasContractPlaceholder = /\{\{linkContrato\}\}/gi.test(scriptConfig.text);

        let finalText = scriptConfig.text
          .replace(/\{\{nome\}\}/gi, selectedLead.nome || '')
          .replace(/\{\{pacote\}\}/gi, selectedLead.pacote || '')
          .replace(/\{\{dataEvento\}\}/gi, selectedLead.dataEvento || '')
          .replace(/\{\{mes\}\}/gi, mesNome)
          .replace(/\{\{ano\}\}/gi, anoEvento)
          .replace(/\{\{cidade\}\}/gi, selectedLead.cidade || '')
          .replace(/\{\{(linkAvaliacao|linkavaliacao|linkAvaliação|link_avaliacao|linkNps|linknps|linkReview|linkreview)\}\}/gi, linkAvaliacao)
          .replace(/\{\{linkContrato\}\}/gi, linkContrato);

        if (scriptType === 'posEvento' && !hasLinkPlaceholder) {
          finalText += `\n\nLink para avaliação: ${linkAvaliacao}`;
        }
        if (scriptType === 'contrato' && !hasContractPlaceholder) {
          finalText += `\n\nLink do contrato: ${linkContrato}`;
        }

        const number = '55' + (selectedLead.telefone || '').replace(/\D/g, '');
        const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
        
        let endpoint = '';
        let payload = {};

        if (scriptConfig.image) {
          const imgStr = scriptConfig.image.toLowerCase();
          const isSocialLink = imgStr.includes('instagram.com') || imgStr.includes('youtube.com') || imgStr.includes('tiktok.com') || imgStr.includes('facebook.com') || imgStr.includes('drive.google.com');

          if (isSocialLink) {
            endpoint = `${baseUrl}/message/sendText/${evolutionApi.instance}`;
            payload = {
              number: number,
              text: finalText + '\n\n' + scriptConfig.image,
              linkPreview: false
            };
          } else {
            endpoint = `${baseUrl}/message/sendMedia/${evolutionApi.instance}`;
            payload = {
              number: number,
              mediatype: "image",
              media: scriptConfig.image,
              caption: finalText,
              linkPreview: false
            };
          }
        } else {
          endpoint = `${baseUrl}/message/sendText/${evolutionApi.instance}`;
          payload = {
            number: number,
            text: finalText,
            linkPreview: false
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApi.apikey
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Falha ao enviar mensagem pela API do Evolution (Status ' + response.status + ')');
        }

        await logMessageToLead(selectedLead.id, `script_${scriptType}`, number, true);
        showToast("Script enviado com sucesso pelo WhatsApp!", "success");
      } catch (err) {
        console.error("Erro ao enviar script:", err);
        showToast(`Erro ao enviar script: ${err.message}`, "error");
        await logMessageToLead(selectedLead.id, `script_${scriptType}`, '55' + (selectedLead.telefone || '').replace(/\D/g, ''), false, err.message);
      } finally {
        setSendingScript(false);
      }
    }, "Disparo WhatsApp");
  };

  return {
    aiFollowupLoading,
    aiFollowupResult,
    aiFollowupCopied,
    handleGenerateFollowup,
    handleCopyFollowup,
    handleSendEvolution
  };
}
export default useWhatsAppActions;
