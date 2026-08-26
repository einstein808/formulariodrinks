import { ref, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { logMessageToLead } from '@/lib/whatsappService';

export function useEquipeActions({
  leads,
  selectedLead,
  setSelectedLead,
  ajudantes,
  evolutionApi,
  generalConfigs,
  setSendingScript,
  showToast,
  showConfirm
}) {
  const checkHelperOverlap = (helperSlug) => {
    if (!selectedLead || !selectedLead.dataEvento) return null;
    
    const overlappingLeads = leads.filter(l => 
      l.id !== selectedLead.id && 
      l.dataEvento === selectedLead.dataEvento && 
      l.ajudantes && 
      l.ajudantes[helperSlug] &&
      l.status !== 'perdido'
    );
    
    if (overlappingLeads.length > 0) {
      return overlappingLeads.map(l => {
        const time = l.horarioEvento ? ` às ${l.horarioEvento}` : '';
        return `"${l.nome}" (${l.tipoEvento || 'Evento'}${time})`;
      }).join(', ');
    }
    return null;
  };

  const handleAddHelperToLead = async (helperSlug) => {
    if (!helperSlug || !selectedLead) return;
    const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
    await update(ref(db, path), {
      status: 'pendente',
      perguntouEm: null,
      confirmouEm: null
    });
    setSelectedLead(prev => ({
      ...prev,
      ajudantes: {
        ...(prev?.ajudantes || {}),
        [helperSlug]: { status: 'pendente', perguntouEm: null, confirmouEm: null }
      }
    }));
  };

  const handleRemoveHelperFromLead = async (helperSlug) => {
    if (!selectedLead) return;
    showConfirm("Remover este ajudante do evento?", async () => {
      const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
      await remove(ref(db, path));
      setSelectedLead(prev => {
        const copy = { ...(prev?.ajudantes || {}) };
        delete copy[helperSlug];
        return { ...prev, ajudantes: copy };
      });
      showToast("Ajudante removido com sucesso!", "success");
    }, "Remover Ajudante");
  };

  const handleUpdateHelperStatus = async (helperSlug, status) => {
    if (!selectedLead) return;
    try {
      const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
      const data = { status };
      if (status === 'confirmado') {
        data.confirmouEm = new Date().toISOString();
      } else {
        data.confirmouEm = null;
      }
      await update(ref(db, path), data);
      setSelectedLead(prev => {
        const prevHelper = prev?.ajudantes?.[helperSlug];
        const prevHelperObj = typeof prevHelper === 'object' && prevHelper !== null ? prevHelper : { status: prevHelper };
        return {
          ...prev,
          ajudantes: {
            ...(prev?.ajudantes || {}),
            [helperSlug]: { ...prevHelperObj, ...data }
          }
        };
      });
    } catch (err) {
      console.error("Erro ao atualizar status do ajudante:", err);
      showToast("Erro ao atualizar status do ajudante: " + err.message, 'error');
    }
  };

  const handleSendHelperAvailabilityCheck = async (helperSlug, helperInfo) => {
    if (!selectedLead) return;
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast('A API do WhatsApp não está configurada corretamente.', 'warning');
      return;
    }
    
    const dataStr = selectedLead.dataEvento ? selectedLead.dataEvento.split('-').reverse().join('/') : '—';
    const horarioStr = selectedLead.horarioEvento || '—';
    const cidadeStr = selectedLead.cidade || '—';
    
    const baseSiteUrl = generalConfigs?.siteUrl 
      ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
      : (typeof window !== 'undefined' ? window.location.origin : '');
      
    const linkConfirmacao = `${baseSiteUrl}/escala/${selectedLead.id}?h=${helperSlug}`;
    
    const messageText = `Olá ${helperInfo.nome}! Temos um evento dia ${dataStr} às ${horarioStr} em ${cidadeStr}.\n\nVocê tem disponibilidade? Por favor, confirme ou recuse sua participação acessando o link a seguir:\n${linkConfirmacao}`;
    
    setSendingScript(true);
    try {
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      const instance = evolutionApi.instance;
      const apiKey = evolutionApi.apikey;
      const phoneFormatted = '55' + helperInfo.telefone.replace(/\D/g, '');
      
      const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          number: phoneFormatted,
          text: messageText,
          linkPreview: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem pela API do Evolution');
      }
      
      const now = new Date().toISOString();
      const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
      await update(ref(db, path), { perguntouEm: now });
      
      setSelectedLead(prev => ({
        ...prev,
        ajudantes: {
          ...(prev?.ajudantes || {}),
          [helperSlug]: { ...(prev?.ajudantes?.[helperSlug] || {}), perguntouEm: now }
        }
      }));
      
      await logMessageToLead(selectedLead.id, `availability_check_${helperSlug}`, phoneFormatted, true);
      showToast(`Mensagem de disponibilidade enviada com sucesso para ${helperInfo.nome}!`, 'success');
    } catch (err) {
      console.error('Erro ao enviar mensagem para ajudante:', err);
      showToast(`Erro ao enviar mensagem: ${err.message}`, 'error');
      await logMessageToLead(selectedLead.id, `availability_check_${helperSlug}`, '55' + helperInfo.telefone.replace(/\D/g, ''), false, err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const handleSendHelperFinalConfirmation = async () => {
    if (!selectedLead) return;
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast('A API do WhatsApp não está configurada corretamente.', 'warning');
      return;
    }
    
    const assignedHelpers = selectedLead.ajudantes || {};
    const confirmedHelpersSlugs = Object.entries(assignedHelpers)
      .filter(([_, value]) => (typeof value === 'object' ? value.status : value) === 'confirmado')
      .map(([slug]) => slug);
      
    if (confirmedHelpersSlugs.length === 0) {
      showToast('Nenhum ajudante confirmado para este evento.', 'warning');
      return;
    }
    
    showConfirm(`Enviar confirmação final para os ${confirmedHelpersSlugs.length} ajudantes confirmados?`, async () => {
      setSendingScript(true);
      let successCount = 0;
      
      const dataStr = selectedLead.dataEvento ? selectedLead.dataEvento.split('-').reverse().join('/') : '—';
      const horarioStr = selectedLead.horarioEvento || '—';
      const cidadeStr = selectedLead.cidade || '—';
      const clientName = `${selectedLead.nome} ${selectedLead.sobrenome || ''}`.trim();
      
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      const instance = evolutionApi.instance;
      const apiKey = evolutionApi.apikey;
      
      try {
        for (const slug of confirmedHelpersSlugs) {
          const helperInfo = ajudantes[slug];
          if (!helperInfo) continue;
          
          const messageText = `Evento confirmado! 🍹\nCliente: ${clientName}\nData: ${dataStr} às ${horarioStr}\nCidade: ${cidadeStr}\nNos vemos lá!`;
          const phoneFormatted = '55' + helperInfo.telefone.replace(/\D/g, '');
          
          try {
            const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
              },
              body: JSON.stringify({
                number: phoneFormatted,
                text: messageText,
                linkPreview: false
              })
            });
            
            if (response.ok) {
              successCount++;
              await logMessageToLead(selectedLead.id, `final_confirmation_${slug}`, phoneFormatted, true);
            } else {
              await logMessageToLead(selectedLead.id, `final_confirmation_${slug}`, phoneFormatted, false, 'API HTTP status: ' + response.status);
            }
          } catch (err) {
            await logMessageToLead(selectedLead.id, `final_confirmation_${slug}`, phoneFormatted, false, err.message);
          }
        }
        
        showToast(`Confirmação enviada com sucesso para ${successCount} de ${confirmedHelpersSlugs.length} ajudantes!`, 'success');
      } catch (err) {
        console.error('Erro na confirmação final:', err);
      } finally {
        setSendingScript(false);
      }
    }, "Confirmação Final");
  };

  return {
    checkHelperOverlap,
    handleAddHelperToLead,
    handleRemoveHelperFromLead,
    handleUpdateHelperStatus,
    handleSendHelperAvailabilityCheck,
    handleSendHelperFinalConfirmation
  };
}
export default useEquipeActions;
