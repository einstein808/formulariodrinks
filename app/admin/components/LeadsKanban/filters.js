import { getCustoValor } from '@/lib/utils';

export const getFinanceStatusHelper = (lead) => {
  const fat = (parseFloat(lead.financeiro?.faturamento) || 0) - (parseFloat(lead.financeiro?.desconto) || 0);
  const pago = parseFloat(lead.financeiro?.valorPago) || 0;
  if (fat === 0) return { label: 'Pendente', color: '#7a8e7c', bg: 'rgba(122, 142, 124, 0.1)' };
  if (pago === 0) return { label: 'Pendente', color: '#F44336', bg: 'rgba(244, 67, 54, 0.1)' };
  if (pago >= fat) return { label: 'Quitado', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' };
  return { label: 'Parcial', color: '#FFD54F', bg: 'rgba(255, 213, 79, 0.1)' };
};

export const hasCustosLancados = (lead) => {
  const custosObj = lead?.financeiro?.custos || {};
  const total = Object.values(custosObj).reduce((acc, cost) => acc + getCustoValor(cost), 0);
  return total > 0;
};

export const getLeadStatusHelper = (lead) => {
  let isStale = false;
  let followUpCount = 0;
  
  if (lead) {
    const successMessages = lead.messages 
      ? Object.values(lead.messages).filter(m => m.success && m.sentAt)
      : [];
      
    const followUpTypes = ['script_autoridade', 'script_escassez', 'orcamento'];
    followUpCount = successMessages.filter(m => followUpTypes.includes(m.type)).length;
    
    if (!lead.status || lead.status === 'novo' || lead.status === 'negociacao') {
      let lastMessageTime = 0;
      if (successMessages.length > 0) {
        lastMessageTime = Math.max(...successMessages.map(m => new Date(m.sentAt).getTime()));
      }
      
      const referenceTime = lastMessageTime > 0 
        ? lastMessageTime 
        : (lead.criadoEm ? new Date(lead.criadoEm).getTime() : Date.now());
        
      if (Date.now() - referenceTime > 1296000000) {
        isStale = true;
      }
    }
  }
  
  return { isStale, followUpCount };
};

export function filterLeads(leads, filters = {}) {
  const {
    filterSearch = '',
    statusFilter = 'all',
    filterMonth = '',
    filterPacote = '',
    filterCidade = '',
    filterMinVal = '',
    filterMaxVal = '',
    filterSemCustos = false
  } = filters;

  return leads.filter(lead => {
    if (statusFilter !== 'all' && (lead.status || 'novo') !== statusFilter) {
      return false;
    }

    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      const nomeCompleto = `${lead.nome || ''} ${lead.sobrenome || ''}`.toLowerCase();
      const tel = (lead.telefone || '').toLowerCase();
      const cid = (lead.cidade || '').toLowerCase();
      const pac = (lead.pacote || '').toLowerCase();
      if (!nomeCompleto.includes(q) && !tel.includes(q) && !cid.includes(q) && !pac.includes(q)) {
        return false;
      }
    }

    if (filterMonth) {
      if (!lead.dataEvento || !lead.dataEvento.startsWith(filterMonth)) {
        return false;
      }
    }

    if (filterPacote) {
      if ((lead.pacote || '').toLowerCase() !== filterPacote.toLowerCase()) {
        return false;
      }
    }

    if (filterCidade) {
      if ((lead.cidade || '').toLowerCase() !== filterCidade.toLowerCase()) {
        return false;
      }
    }

    const fat = (parseFloat(lead.financeiro?.faturamento) || 0) - (parseFloat(lead.financeiro?.desconto) || 0);
    if (filterMinVal && fat < parseFloat(filterMinVal)) {
      return false;
    }
    if (filterMaxVal && fat > parseFloat(filterMaxVal)) {
      return false;
    }

    if (filterSemCustos && (lead.status === 'fechado' || lead.status === 'realizado')) {
      if (hasCustosLancados(lead)) {
        return false;
      }
    }

    return true;
  });
}
