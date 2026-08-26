import { ref, push, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { logMessageToLead } from '@/lib/whatsappService';

export function useLeadOperations({
  leads,
  selectedLead,
  setSelectedLead,
  cerimonialistas,
  evolutionApi,
  showToast,
  showConfirm,
  setIsAddingManual,
  setNewLeadData,
  setIsEditingLead
}) {
  const notificarCerimonialista = async (lead, cerim) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) return;
    try {
      const number = '55' + cerim.whatsapp.replace(/\D/g, '');
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      const nomeCliente = `${lead.nome} ${lead.sobrenome || ''}`.trim();
      const text =
        `Olá *${cerim.nome}*! 🎉 Boa notícia!\n\n` +
        `O cliente *${nomeCliente}* (evento em *${lead.dataEvento || 'data n/inf.'}*) que veio da sua indicação acabou de *fechar o pacote ${lead.pacote || ''}* conosco!\n\n` +
        `Obrigado pela parceria! 🥂`;
      const resp = await fetch(`${baseUrl}/message/sendText/${evolutionApi.instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApi.apikey },
        body: JSON.stringify({ number, text, linkPreview: false }),
      });
      await logMessageToLead(lead.id, 'notif_cerimonialista', number, resp.ok, resp.ok ? null : 'Falha HTTP');
    } catch (err) {
      console.error('Erro ao notificar cerimonialista:', err);
      await logMessageToLead(lead.id, 'notif_cerimonialista', '', false, err.message);
    }
  };

  const handleSaveManualLead = async (newLeadData) => {
    if (!newLeadData.nome || !newLeadData.telefone) {
      showToast('Nome e Telefone são obrigatórios.', 'warning');
      return;
    }
    try {
      const dataToSave = {
        ...newLeadData,
        criadoEm: new Date().toISOString(),
        status: 'novo',
        order: Date.now()
      };
      await push(ref(db, 'leads'), dataToSave);
      setIsAddingManual(false);
      setNewLeadData({
        nome: '', sobrenome: '', telefone: '', dataEvento: '', horarioEvento: '', cidade: '',
        convidados: '', tipoEvento: '', pacote: '', cerimonialista: ''
      });
      showToast('Lead criado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao criar lead:', err);
      showToast('Erro ao criar lead manualmente.', 'error');
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await update(ref(db, `leads/${leadId}`), { status: newStatus });

      if (newStatus === 'fechado') {
        const lead = leads.find(l => l.id === leadId) || selectedLead;
        if (lead?.cerimonialista && cerimonialistas[lead.cerimonialista]) {
          const cerim = cerimonialistas[lead.cerimonialista];
          notificarCerimonialista(lead, cerim);
        }
      }

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast("Erro ao atualizar o status.", 'error');
    }
  };

  const handleDeleteLead = async (leadId) => {
    showConfirm("Tem certeza que deseja excluir este lead permanentemente? Essa ação não pode ser desfeita.", async () => {
      try {
        await remove(ref(db, `leads/${leadId}`));
        if (selectedLead?.id === leadId) {
          setSelectedLead(null);
        }
        showToast("Lead excluído com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao excluir lead:", error);
        showToast("Erro ao excluir o lead.", "error");
      }
    }, "Excluir Lead");
  };

  const handleSaveEditLead = async (editLeadData) => {
    if (!selectedLead) return;
    try {
      await update(ref(db, `leads/${selectedLead.id}`), editLeadData);
      setSelectedLead(prev => ({ ...prev, ...editLeadData }));
      setIsEditingLead(false);
      showToast('Alterações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      showToast('Erro ao salvar alterações.', 'error');
    }
  };

  const toggleLeadAbGroup = async (leadId, currentGroup) => {
    const nextGroup = currentGroup === 'B' ? 'A' : 'B';
    const labelNext = nextGroup === 'B' ? 'Grupo B (Preço Fixo por Faixa)' : 'Grupo A (Preço por Convidado)';
    try {
      await update(ref(db, `leads/${leadId}`), { abGroup: nextGroup });
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, abGroup: nextGroup }));
      }
      showToast(`Lead alterado para ${labelNext}!`);
    } catch (err) {
      console.error("Erro ao alterar grupo A/B:", err);
      showToast("Erro ao alterar o grupo do lead.", "error");
    }
  };

  return {
    handleSaveManualLead,
    handleStatusChange,
    handleDeleteLead,
    handleSaveEditLead,
    toggleLeadAbGroup
  };
}
export default useLeadOperations;
