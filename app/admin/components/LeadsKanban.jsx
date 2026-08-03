import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, remove, push, set } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiPhone, FiCalendar, FiMapPin, FiClock, FiX, FiTrash2, FiHeart, FiPlus, FiList, FiColumns, FiChevronLeft, FiChevronRight, FiEye, FiEdit2, FiSave, FiCheck, FiUsers, FiFileText, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { FiPackage as FiPackageIcon } from 'react-icons/fi';
import { sendWhatsAppQuote, logMessageToLead } from '../../../lib/whatsappService';
import MinioImageUpload from './MinioImageUpload';

const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: '#00E5FF' },
  { id: 'negociacao', title: 'Em Negociação', color: '#FFD54F' },
  { id: 'fechado', title: 'Fechado (Ganho)', color: '#4CAF50' },
  { id: 'realizado', title: 'Realizados', color: '#9E9E9E' },
  { id: 'perdido', title: 'Perdido', color: '#F44336' }
];

function firebaseObjToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function formatPhone(value) {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '')        // Remove non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/--+/g, '-')           // Replace multiple hyphens
    .trim();
}

const getFinanceStatusHelper = (lead) => {
  const fat = (parseFloat(lead.financeiro?.faturamento) || 0) - (parseFloat(lead.financeiro?.desconto) || 0);
  const pago = parseFloat(lead.financeiro?.valorPago) || 0;
  if (fat === 0) return { label: 'Pendente', color: '#7a8e7c', bg: 'rgba(122, 142, 124, 0.1)' };
  if (pago === 0) return { label: 'Pendente', color: '#F44336', bg: 'rgba(244, 67, 54, 0.1)' };
  if (pago >= fat) return { label: 'Quitado', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.1)' };
  return { label: 'Parcial', color: '#FFD54F', bg: 'rgba(255, 213, 79, 0.1)' };
};

const getLeadStatusHelper = (lead) => {
  let isStale = false;
  let followUpCount = 0;
  
  if (lead) {
    const successMessages = lead.messages 
      ? Object.values(lead.messages).filter(m => m.success && m.sentAt)
      : [];
      
    // 1. Calcular a contagem de follow-ups (Autoridade, Escassez e Orçamento)
    const followUpTypes = ['script_autoridade', 'script_escassez', 'orcamento'];
    followUpCount = successMessages.filter(m => followUpTypes.includes(m.type)).length;
    
    // 2. Calcular inatividade (esfriando por tempo)
    if (!lead.status || lead.status === 'novo' || lead.status === 'negociacao') {
      let lastMessageTime = 0;
      if (successMessages.length > 0) {
        lastMessageTime = Math.max(...successMessages.map(m => new Date(m.sentAt).getTime()));
      }
      
      const referenceTime = lastMessageTime > 0 
        ? lastMessageTime 
        : (lead.criadoEm ? new Date(lead.criadoEm).getTime() : Date.now());
        
      // 15 dias = 15 * 24 * 60 * 60 * 1000 = 1296000000 ms
      if (Date.now() - referenceTime > 1296000000) {
        isStale = true;
      }
    }
  }
  
  return { isStale, followUpCount };
};

export default function LeadsKanban() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [drinksMenu, setDrinksMenu] = useState({});
  const [pacotes, setPacotes] = useState([]);
  const [ajudantes, setAjudantes] = useState({});

  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'warning' }
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, onCancel }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
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

  const showConfirm = (message, onConfirm, title = "Confirmação") => {
    setConfirmModal({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      },
      onCancel: () => {
        setConfirmModal(null);
      }
    });
  };
  
  const [evolutionApi, setEvolutionApi] = useState(null);
  const [scripts, setScripts] = useState(null);
  const [generalConfigs, setGeneralConfigs] = useState(null);
  const [sendingScript, setSendingScript] = useState(false);

  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nome: '', sobrenome: '', telefone: '', dataEvento: '', horarioEvento: '', cidade: '',
    convidados: '', tipoEvento: '', pacote: '', cerimonialista: ''
  });

  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadData, setEditLeadData] = useState({});
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'equipe' | 'drinks' | 'scripts' | 'financeiro'
  const [isEditingShoppingList, setIsEditingShoppingList] = useState(false);
  const [editedShoppingList, setEditedShoppingList] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [financeiroPresets, setFinanceiroPresets] = useState({});
  const [newCost, setNewCost] = useState({ descricao: '', valor: '', quantidade: '', valorUnitario: '', categoria: 'insumos', itemIdEstoque: '' });
  const [estoque, setEstoque] = useState([]);
  const [newPaymentVal, setNewPaymentVal] = useState('');
  const [newPaymentForma, setNewPaymentForma] = useState('Pix');
  const [custosCategorias, setCustosCategorias] = useState([]);

  // AI Follow-up state
  const [aiFollowupLoading, setAiFollowupLoading] = useState(false);
  const [aiFollowupResult, setAiFollowupResult] = useState(null);
  const [aiFollowupCopied, setAiFollowupCopied] = useState(false);

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [itemsPerPage, setItemsPerPage] = useState('20');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPacote, setFilterPacote] = useState('');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterMinVal, setFilterMinVal] = useState('');
  const [filterMaxVal, setFilterMaxVal] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const lastModalRef = useRef(null);

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

  // Watch modal changes in LeadsKanban
  useEffect(() => {
    if (isEditingLead && lastModalRef.current !== 'editLead') {
      window.history.pushState({ modal: 'editLead' }, '');
      lastModalRef.current = 'editLead';
    } else if (!isEditingLead && lastModalRef.current === 'editLead') {
      lastModalRef.current = null;
      if (window.history.state?.modal === 'editLead') {
        window.history.back();
      }
    }

    if (isAddingManual && lastModalRef.current !== 'addLead') {
      window.history.pushState({ modal: 'addLead' }, '');
      lastModalRef.current = 'addLead';
    } else if (!isAddingManual && lastModalRef.current === 'addLead') {
      lastModalRef.current = null;
      if (window.history.state?.modal === 'addLead') {
        window.history.back();
      }
    }

    if (selectedLead && !isEditingLead && lastModalRef.current !== 'leadDetail') {
      window.history.pushState({ modal: 'leadDetail' }, '');
      lastModalRef.current = 'leadDetail';
    } else if (!selectedLead && lastModalRef.current === 'leadDetail') {
      lastModalRef.current = null;
      if (window.history.state?.modal === 'leadDetail') {
        window.history.back();
      }
    }
  }, [selectedLead, isAddingManual, isEditingLead]);

  // Listen to popstate to handle mobile back button closing modals
  useEffect(() => {
    const handlePopState = (e) => {
      const targetModal = e.state?.modal || null;
      lastModalRef.current = targetModal;

      if (isEditingLead && targetModal !== 'editLead') {
        setIsEditingLead(false);
      }
      if (isAddingManual && targetModal !== 'addLead') {
        setIsAddingManual(false);
      }
      if (selectedLead && targetModal !== 'leadDetail') {
        setSelectedLead(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedLead, isAddingManual, isEditingLead]);

  const [faturamentoInput, setFaturamentoInput] = useState('');
  const [descontoInput, setDescontoInput] = useState('');
  const [valorPagoInput, setValorPagoInput] = useState('');

  // Auto reset tab when selecting a different lead and sync faturamento/desconto/pago
  useEffect(() => {
    if (selectedLead) {
      setModalTab('info');
      setIsEditingShoppingList(false);
      setEditedShoppingList(null);
      setModalSearchTerm('');
      setModalCategoryFilter('all');
      setFaturamentoInput(selectedLead.financeiro?.faturamento ?? '');
      setDescontoInput(selectedLead.financeiro?.desconto ?? '');
      setValorPagoInput(selectedLead.financeiro?.valorPago ?? '');
    } else {
      setIsEditingShoppingList(false);
      setEditedShoppingList(null);
      setModalSearchTerm('');
      setModalCategoryFilter('all');
      setFaturamentoInput('');
      setDescontoInput('');
      setValorPagoInput('');
    }
  }, [selectedLead?.id, selectedLead?.financeiro?.faturamento, selectedLead?.financeiro?.valorPago, selectedLead?.financeiro?.desconto]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const leadsArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        leadsArray.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
        setLeads(leadsArray);
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    const configRef = ref(db, 'config');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.evolutionApi) setEvolutionApi(data.evolutionApi);
        if (data.scripts) setScripts(data.scripts);
        if (data.general) setGeneralConfigs(data.general);
        if (data.cerimonialistas) setCerimonialistas(data.cerimonialistas);
        if (data.drinksMenu) setDrinksMenu(data.drinksMenu);
        if (data.pacotes) setPacotes(firebaseObjToArray(data.pacotes));
        if (data.ajudantes) setAjudantes(data.ajudantes); else setAjudantes({});
        if (data.estoque) {
          setEstoque(Object.entries(data.estoque).map(([id, val]) => ({ id, ...val })));
        } else {
          setEstoque([]);
        }
        if (data.financeiroPresets) {
          setFinanceiroPresets(data.financeiroPresets);
        } else {
          setFinanceiroPresets({
            'barman': { descricao: 'Barman', valor: 150 },
            'ajudante': { descricao: 'Ajudante', valor: 120 },
            'transporte': { descricao: 'Transporte', valor: 80 },
            'outros': { descricao: 'Outros', valor: 0 }
          });
        }
        if (data.custosCategorias) {
          setCustosCategorias(firebaseObjToArray(data.custosCategorias));
        } else {
          setCustosCategorias([
            { id: 'insumos', label: 'Insumos / Bebidas', color: '#00E5FF', emoji: '🧃' },
            { id: 'equipe', label: 'Mão de Obra / Equipe', color: '#FFD54F', emoji: '👥' },
            { id: 'logistica', label: 'Logística / Transporte', color: '#FF8A65', emoji: '🚚' },
            { id: 'descartaveis', label: 'Descartáveis / Copos', color: '#EF5350', emoji: '🥤' },
            { id: 'outros', label: 'Outros / Diversos', color: '#a8b8aa', emoji: '✨' }
          ]);
        }
      }
    });

    return () => {
      unsubscribeLeads();
      unsubscribeConfig();
    };
  }, []);

  const handleSaveManualLead = async (e) => {
    e.preventDefault();
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

  const handleStartEditShoppingList = () => {
    setEditedShoppingList({
      insumos: { ...(selectedLead.shoppingListResult?.insumos || {}) },
      fixos: (selectedLead.shoppingListResult?.fixos || []).map(f => ({ ...f }))
    });
    setIsEditingShoppingList(true);
  };

  const handleSaveShoppingList = async () => {
    try {
      await update(ref(db, `leads/${selectedLead.id}`), {
        shoppingListResult: editedShoppingList
      });
      setSelectedLead(prev => ({
        ...prev,
        shoppingListResult: editedShoppingList
      }));
      setIsEditingShoppingList(false);
      setEditedShoppingList(null);
      showToast("Lista de compras atualizada com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar lista:", err);
      showToast("Erro ao salvar alterações da lista.", "error");
    }
  };

  const toggleShoppingListItem = async (lead, itemId) => {
    const currentChecked = lead.shoppingListChecked || {};
    const newChecked = { ...currentChecked, [itemId]: !currentChecked[itemId] };
    setSelectedLead(prev => ({
      ...prev,
      shoppingListChecked: newChecked
    }));
    try {
      await update(ref(db, `leads/${lead.id}`), {
        shoppingListChecked: newChecked
      });
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar conferência do item.", "error");
    }
  };

  const updateInsumoKey = (oldKey, newKey) => {
    if (oldKey === newKey) return;
    const insumos = { ...editedShoppingList.insumos };
    insumos[newKey] = insumos[oldKey];
    delete insumos[oldKey];
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const updateInsumoVal = (key, val) => {
    const insumos = { ...editedShoppingList.insumos };
    insumos[key] = val;
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const deleteInsumo = (key) => {
    const insumos = { ...editedShoppingList.insumos };
    delete insumos[key];
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const addInsumo = () => {
    const insumos = { ...editedShoppingList.insumos, "Novo Insumo": "1 Litros" };
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const updateFixoField = (idx, field, val) => {
    const fixos = [...editedShoppingList.fixos];
    fixos[idx] = { ...fixos[idx], [field]: val };
    setEditedShoppingList({ ...editedShoppingList, fixos });
  };

  const deleteFixo = (idx) => {
    const fixos = [...editedShoppingList.fixos];
    fixos.splice(idx, 1);
    setEditedShoppingList({ ...editedShoppingList, fixos });
  };

  const addFixo = () => {
    const fixos = [
      ...editedShoppingList.fixos,
      { id: 'custom_' + Date.now(), nome: 'Novo Item Fixo', quantidade: 1, unidade: 'un', categoria: 'bar' }
    ];
    setEditedShoppingList({ ...editedShoppingList, fixos });
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await update(ref(db, `leads/${leadId}`), { status: newStatus });

      // Notificação WhatsApp para cerimonialista ao fechar
      if (newStatus === 'fechado') {
        const lead = leads.find(l => l.id === leadId) || selectedLead;
        if (lead?.cerimonialista && cerimonialistas[lead.cerimonialista]) {
          const cerim = cerimonialistas[lead.cerimonialista];
          notificarCerimonialista(lead, cerim);
        }
      }

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast("Erro ao atualizar o status.", 'error');
    }
  };

  const notificarCerimonialista = async (lead, cerim) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) return;
    try {
      const number = '55' + cerim.whatsapp.replace(/\D/g, '');
      const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
      const nomeCliente = `${lead.nome} ${lead.sobrenome}`.trim();
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

  const handleDeleteLead = async (leadId) => {
    showConfirm("Tem certeza que deseja excluir este lead permanentemente? Essa ação não pode ser desfeita.", async () => {
      try {
        await remove(ref(db, `leads/${leadId}`));
        setSelectedLead(null);
        showToast("Lead excluído com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao excluir lead:", error);
        showToast("Erro ao excluir o lead.", "error");
      }
    }, "Excluir Lead");
  };

  const startEditingLead = () => {
    setEditLeadData({
      nome: selectedLead.nome || '',
      sobrenome: selectedLead.sobrenome || '',
      telefone: selectedLead.telefone || '',
      cidade: selectedLead.cidade || '',
      dataEvento: selectedLead.dataEvento || '',
      horarioEvento: selectedLead.horarioEvento || '',
      convidados: selectedLead.convidados || '',
      tipoEvento: selectedLead.tipoEvento || '',
      pacote: selectedLead.pacote || '',
    });
    setIsEditingLead(true);
  };

  const handleSaveEditLead = async () => {
    try {
      await update(ref(db, `leads/${selectedLead.id}`), editLeadData);
      setSelectedLead(prev => ({ ...prev, ...editLeadData }));
      setIsEditingLead(false);
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      showToast('Erro ao salvar alterações.', 'error');
    }
  };

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
    if (!helperSlug) return;
    const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
    await update(ref(db, path), {
      status: 'pendente',
      perguntouEm: null,
      confirmouEm: null
    });
    setSelectedLead(prev => ({
      ...prev,
      ajudantes: {
        ...(prev.ajudantes || {}),
        [helperSlug]: { status: 'pendente', perguntouEm: null, confirmouEm: null }
      }
    }));
  };

  const handleRemoveHelperFromLead = async (helperSlug) => {
    showConfirm("Remover este ajudante do evento?", async () => {
      const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
      await remove(ref(db, path));
      setSelectedLead(prev => {
        const copy = { ...(prev.ajudantes || {}) };
        delete copy[helperSlug];
        return { ...prev, ajudantes: copy };
      });
      showToast("Ajudante removido com sucesso!", "success");
    }, "Remover Ajudante");
  };

  const handleUpdateHelperStatus = async (helperSlug, status) => {
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
        const prevHelper = prev.ajudantes?.[helperSlug];
        const prevHelperObj = typeof prevHelper === 'object' && prevHelper !== null ? prevHelper : { status: prevHelper };
        return {
          ...prev,
          ajudantes: {
            ...(prev.ajudantes || {}),
            [helperSlug]: { ...prevHelperObj, ...data }
          }
        };
      });
    } catch (err) {
      console.error("Erro ao atualizar status do ajudante:", err);
      showToast("Erro ao atualizar status do ajudante: " + err.message, 'error');
    }
  };

  const handleUpdateFaturamento = async (valor) => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { faturamento: numValor });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev.financeiro || {}),
          faturamento: numValor
        }
      }));
    } catch (err) {
      console.error("Erro ao atualizar faturamento:", err);
      showToast("Erro ao atualizar faturamento.", "error");
    }
  };

  const handleImportFromPackage = () => {
    if (!selectedLead) return;
    const normalizedSelectedPackage = (selectedLead.pacote || '').toLowerCase().trim();
    const pac = pacotes.find(p => 
      (p.name || '').toLowerCase().trim() === normalizedSelectedPackage ||
      (p.id || '').toLowerCase().trim() === normalizedSelectedPackage
    );
    if (!pac) {
      showToast("Não foi possível encontrar um pacote correspondente nas configurações.", "warning");
      return;
    }
    const cleanPriceStr = (pac.price || '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const basePrice = parseFloat(cleanPriceStr) || 0;
    let total = basePrice;
    const isPerGuest = (pac.priceLabel || '').toLowerCase().includes('convidado') || 
                       (pac.priceLabel || '').toLowerCase().includes('pessoa') ||
                       (pac.priceLabel || '').toLowerCase().includes('pax');
    if (isPerGuest && selectedLead.convidados) {
      const numGuests = parseInt(selectedLead.convidados, 10) || 0;
      total = basePrice * numGuests;
    }
    setFaturamentoInput(total.toString());
    handleUpdateFaturamento(total.toString());
    showToast(`Faturamento importado do pacote "${pac.name}": R$ ${total.toFixed(2)}`, "success");
  };

  const handleUpdateDesconto = async (valor) => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { desconto: numValor });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev.financeiro || {}),
          desconto: numValor
        }
      }));
    } catch (err) {
      console.error("Erro ao atualizar desconto:", err);
      showToast("Erro ao atualizar desconto.", "error");
    }
  };

  const handleUpdateAplicarDescontoMaoDeObra = async (checked) => {
    if (!selectedLead) return;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { aplicarDescontoMaoDeObra: checked });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev.financeiro || {}),
          aplicarDescontoMaoDeObra: checked
        }
      }));
      showToast(checked ? "Desconto ativado para Mão de Obra!" : "Desconto desativado para Mão de Obra.", "success");
    } catch (err) {
      console.error("Erro ao atualizar desconto de Mão de Obra:", err);
      showToast("Erro ao atualizar desconto de Mão de Obra.", "error");
    }
  };

  const handleUpdateValorPago = async (valor) => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { valorPago: numValor });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev.financeiro || {}),
          valorPago: numValor
        }
      }));
    } catch (err) {
      console.error("Erro ao atualizar valor pago:", err);
      showToast("Erro ao atualizar valor pago.", "error");
    }
  };

  const handleRegisterRecebimento = async (valor, forma, observacao = '') => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    if (numValor <= 0) {
      showToast("Insira um valor maior que zero.", "warning");
      return;
    }
    try {
      const recId = `rec-${Date.now()}`;
      const recData = {
        id: recId,
        valor: numValor,
        formaPagamento: forma || 'Pix',
        data: new Date().toISOString(),
        observacao: observacao.trim()
      };
      await set(ref(db, `leads/${selectedLead.id}/financeiro/recebimentos/${recId}`), recData);
      const currentRecebimentos = selectedLead.financeiro?.recebimentos || {};
      const newRecebimentos = { ...currentRecebimentos, [recId]: recData };
      const newTotalPaid = Object.values(newRecebimentos).reduce((acc, cur) => acc + (parseFloat(cur.valor) || 0), 0);
      await update(ref(db, `leads/${selectedLead.id}/financeiro`), { valorPago: newTotalPaid });
      setSelectedLead(prev => {
        const currentFinanceiro = prev.financeiro || {};
        return {
          ...prev,
          financeiro: {
            ...currentFinanceiro,
            recebimentos: newRecebimentos,
            valorPago: newTotalPaid
          }
        };
      });
      showToast("Recebimento registrado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao registrar recebimento.", "error");
    }
  };

  const handleDeleteRecebimento = async (recId) => {
    if (!selectedLead || !recId) return;
    try {
      await remove(ref(db, `leads/${selectedLead.id}/financeiro/recebimentos/${recId}`));
      const currentRecebimentos = { ...(selectedLead.financeiro?.recebimentos || {}) };
      delete currentRecebimentos[recId];
      const newTotalPaid = Object.values(currentRecebimentos).reduce((acc, cur) => acc + (parseFloat(cur.valor) || 0), 0);
      await update(ref(db, `leads/${selectedLead.id}/financeiro`), { valorPago: newTotalPaid });
      setSelectedLead(prev => {
        const currentFinanceiro = prev.financeiro || {};
        return {
          ...prev,
          financeiro: {
            ...currentFinanceiro,
            recebimentos: currentRecebimentos,
            valorPago: newTotalPaid
          }
        };
      });
      showToast("Recebimento removido.", "info");
    } catch (err) {
      console.error(err);
      showToast("Erro ao remover recebimento.", "error");
    }
  };

  const detectCategoryByDescription = (desc) => {
    const normalized = (desc || '').toLowerCase().trim();
    if (normalized.includes('barman') || normalized.includes('ajudante') || normalized.includes('equipe') || normalized.includes('garçom') || normalized.includes('staff')) {
      return 'equipe';
    }
    if (normalized.includes('transporte') || normalized.includes('carreto') || normalized.includes('logistica') || normalized.includes('logística') || normalized.includes('combustivel') || normalized.includes('combustível') || normalized.includes('viagem') || normalized.includes('frete')) {
      return 'logistica';
    }
    if (normalized.includes('copo') || normalized.includes('canudo') || normalized.includes('guardanapo') || normalized.includes('descartavel') || normalized.includes('descartáveis')) {
      return 'descartaveis';
    }
    if (normalized.includes('gelo') || normalized.includes('fruta') || normalized.includes('bebida') || normalized.includes('vodka') || normalized.includes('gin') || normalized.includes('insumo') || normalized.includes('suco') || normalized.includes('xarope') || normalized.includes('gengibre') || normalized.includes('limao') || normalized.includes('limão')) {
      return 'insumos';
    }
    return 'outros';
  };

  const handleAddCost = async (descricao, valor, categoriaInput) => {
    if (!selectedLead || !descricao.trim()) {
      showToast("Descrição do custo é obrigatória.", "warning");
      return;
    }
    const numValor = parseFloat(valor) || 0;
    const cat = categoriaInput || detectCategoryByDescription(descricao);
    const costId = `custo-${Date.now()}`;
    const numQty = parseFloat(newCost.quantidade) || 0;
    const numUnit = parseFloat(newCost.valorUnitario) || 0;
    try {
      const costData = {
        id: costId,
        descricao: descricao.trim(),
        valor: numValor,
        categoria: cat,
        ...(numQty > 0 ? { quantidade: numQty } : {}),
        ...(numUnit > 0 ? { valorUnitario: numUnit } : {}),
        ...(newCost.itemIdEstoque ? { itemIdEstoque: newCost.itemIdEstoque } : {})
      };

      // Bidirectional logic: deduct from stock if vinculado
      if (newCost.itemIdEstoque && numQty > 0) {
        const itemEstoque = estoque.find(i => i.id === newCost.itemIdEstoque);
        if (itemEstoque) {
          const novaQtd = Math.max(0, (itemEstoque.quantidadeAtual || 0) - numQty);
          await update(ref(db, `config/estoque/${newCost.itemIdEstoque}`), { quantidadeAtual: novaQtd });
          
          const movRef = push(ref(db, 'config/estoqueMovimentacoes'));
          await set(movRef, {
            itemId: newCost.itemIdEstoque,
            tipo: 'saida',
            quantidade: numQty,
            motivo: `Uso no evento: ${selectedLead.nome} ${selectedLead.sobrenome || ''}`.trim(),
            data: new Date().toISOString()
          });
        }
      }

      const pathCost = `leads/${selectedLead.id}/financeiro/custos/${costId}`;
      await set(ref(db, pathCost), costData);

      const slug = slugify(descricao);
      if (slug) {
        const pathPreset = `config/financeiroPresets/${slug}`;
        await set(ref(db, pathPreset), {
          descricao: descricao.trim(),
          valor: numValor,
          categoria: cat
        });
      }

      setSelectedLead(prev => {
        const currentFinanceiro = prev.financeiro || {};
        const currentCustos = currentFinanceiro.custos || {};
        return {
          ...prev,
          financeiro: {
            ...currentFinanceiro,
            custos: { ...currentCustos, [costId]: costData }
          }
        };
      });

      setNewCost({ descricao: '', valor: '', quantidade: '', valorUnitario: '', categoria: 'insumos', itemIdEstoque: '' });
      showToast("Custo adicionado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao adicionar custo:", err);
      showToast("Erro ao adicionar custo.", "error");
    }
  };

  const handleRemoveCost = async (costId) => {
    if (!selectedLead || !costId) return;
    showConfirm("Remover este custo do evento?", async () => {
      try {
        const path = `leads/${selectedLead.id}/financeiro/custos/${costId}`;
        await remove(ref(db, path));
        setSelectedLead(prev => {
          const currentFinanceiro = prev.financeiro || {};
          const currentCustos = { ...(currentFinanceiro.custos || {}) };
          delete currentCustos[costId];
          return {
            ...prev,
            financeiro: {
              ...currentFinanceiro,
              custos: currentCustos
            }
          };
        });
        showToast("Custo removido com sucesso!", "success");
      } catch (err) {
        console.error("Erro ao remover custo:", err);
        showToast("Erro ao remover custo.", "error");
      }
    }, "Remover Custo");
  };

  const handleSendHelperAvailabilityCheck = async (helperSlug, helperInfo) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast('A API do WhatsApp não está configurada corretamente.', 'warning');
      return;
    }
    
    const dataStr = selectedLead.dataEvento ? selectedLead.dataEvento.split('-').reverse().join('/') : '—';
    const horarioStr = selectedLead.horarioEvento || '—';
    const cidadeStr = selectedLead.cidade || '—';
    
    const baseSiteUrl = generalConfigs?.siteUrl 
      ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
      : window.location.origin;
      
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
          ...(prev.ajudantes || {}),
          [helperSlug]: { ...(prev.ajudantes?.[helperSlug] || {}), perguntouEm: now }
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
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast('A API do WhatsApp não está configurada corretamente.', 'warning');
      return;
    }
    
    const assignedHelpers = selectedLead.ajudantes || {};
    const confirmedHelpersSlugs = Object.entries(assignedHelpers)
      .filter(([_, value]) => value.status === 'confirmado')
      .map(([slug, _]) => slug);
      
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

  const handleSendEvolution = async (scriptType) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast("A API Evolution não está configurada corretamente. Vá até a aba 'Pacotes & Drinks' > 'Scripts de Vendas' para configurar.", "warning");
      return;
    }
    
    let scriptConfig = scripts?.[scriptType];
    if (scriptType === 'contrato' && (!scriptConfig || !scriptConfig.text)) {
      scriptConfig = {
        text: "Olá {{nome}},\n\nPara gerarmos o contrato do seu evento no dia {{dataEvento}}, por favor preencha os seus dados de contratante e selecione os drinks da sua festa acessando o link abaixo:\n\n{{linkContrato}}\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\nEquipe Formulário Drinks",
        image: ""
      };
    } else if (!scriptConfig || !scriptConfig.text) {
      showToast("O texto deste script não está configurado. Vá até as configurações para escrevê-lo.", "warning");
      return;
    }

    showConfirm("Deseja enviar essa mensagem automaticamente pelo WhatsApp agora?", async () => {
      setSendingScript(true);
      try {
        // Preparar Link de Avaliação
        const baseSiteUrl = generalConfigs?.siteUrl 
          ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
          : window.location.origin;
        const linkAvaliacao = `${baseSiteUrl}/avaliacao/${selectedLead.id}`;

        // Extrair mês e ano
        let mesNome = '';
        let anoEvento = '';
        if (selectedLead.dataEvento) {
          const parts = selectedLead.dataEvento.split('-');
          if (parts.length >= 2) {
            anoEvento = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
            if (monthIndex >= 0 && monthIndex < 12) {
              mesNome = monthNames[monthIndex];
            }
          }
        }

        // Preparar Link do Contrato
        const linkContrato = `${baseSiteUrl}/contrato/${selectedLead.id}`;

        const hasLinkPlaceholder = /\{\{(linkAvaliacao|linkavaliacao|linkAvaliação|link_avaliacao|linkNps|linknps|linkReview|linkreview)\}\}/gi.test(scriptConfig.text);
        const hasContractPlaceholder = /\{\{linkContrato\}\}/gi.test(scriptConfig.text);

        // Substituir variáveis
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

        const number = '55' + selectedLead.telefone.replace(/\D/g, '');
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
          const errorText = await response.text();
          throw new Error(`Status ${response.status} - ${errorText}`);
        }

        await logMessageToLead(selectedLead.id, `script_${scriptType}`, number, true);
        if (scriptType === 'posEvento') {
          await update(ref(db, `leads/${selectedLead.id}`), { npsSent: true });
          setSelectedLead(prev => ({ ...prev, npsSent: true }));
        }
        showToast("Mensagem enviada com sucesso!", "success");
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        await logMessageToLead(selectedLead.id, `script_${scriptType}`, '55' + selectedLead.telefone.replace(/\D/g, ''), false, err.message);
        showToast("Erro ao enviar mensagem: " + err.message, "error");
      } finally {
        setSendingScript(false);
      }
    }, "Enviar Mensagem");
  };

  const handleSendShoppingListViaApi = async (lead) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast("A API Evolution não está configurada corretamente.", "warning");
      return;
    }
    
    showConfirm("Deseja enviar o link da lista de compras automaticamente pelo WhatsApp via API agora?", async () => {
      setSendingScript(true);
      try {
        const baseSiteUrl = generalConfigs?.siteUrl 
          ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
          : window.location.origin;
        const linkCompras = `${baseSiteUrl}/lista-compras/${lead.id}`;
        
        const text = `Olá ${lead.nome}, acesse este link para escolher os drinks do seu evento e gerar a lista de compras exata do que você precisa comprar:\n\n${linkCompras}`;

        const number = '55' + lead.telefone.replace(/\D/g, '');
        const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;
        const endpoint = `${baseUrl}/message/sendText/${evolutionApi.instance}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApi.apikey
          },
          body: JSON.stringify({ number, text, linkPreview: false })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Status ${response.status} - ${errorText}`);
        }

        await logMessageToLead(lead.id, 'lista_compras', number, true);
        showToast("Link da lista de compras enviado com sucesso via API!", "success");
      } catch (err) {
        console.error("Erro ao enviar link da lista:", err);
        await logMessageToLead(lead.id, 'lista_compras', '55' + lead.telefone.replace(/\D/g, ''), false, err.message);
        showToast("Erro ao enviar: " + err.message, "error");
      } finally {
        setSendingScript(false);
      }
    }, "Enviar Lista de Compras");
  };

  const handleResendQuote = async (lead) => {
    showConfirm("Deseja reenviar o orçamento deste lead via WhatsApp?", async () => {
      setSendingScript(true);
      try {
        const result = await sendWhatsAppQuote(lead, pacotes, lead.id);
        if (result) {
          showToast("Orçamento reenviado com sucesso!", "success");
        } else {
          showToast("Falha ao reenviar o orçamento. Verifique as configurações da API WhatsApp.", "error");
        }
      } catch (err) {
        console.error("Erro ao reenviar orçamento:", err);
        showToast("Erro ao reenviar: " + err.message, "error");
      } finally {
        setSendingScript(false);
      }
    }, "Reenviar Orçamento");
  };

  // Derived filter options
  const uniquePacotes = [...new Set(leads.map(l => l.pacote).filter(Boolean))].sort();
  const uniqueCidades = [...new Set(leads.map(l => l.cidade).filter(Boolean))].sort();

  const activeFilterCount = [filterSearch, filterMonth, filterPacote, filterCidade, filterMinVal, filterMaxVal].filter(Boolean).length;

  const applyAdvancedFilters = (list) => {
    return list.filter(l => {
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const name = `${l.nome || ''} ${l.sobrenome || ''} ${l.telefone || ''}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (filterMonth) {
        if (!l.dataEvento || !l.dataEvento.startsWith(filterMonth)) return false;
      }
      if (filterPacote && l.pacote !== filterPacote) return false;
      if (filterCidade && l.cidade !== filterCidade) return false;
      if (filterMinVal !== '') {
        const fat = parseFloat(l.financeiro?.faturamento) || 0;
        if (fat < parseFloat(filterMinVal)) return false;
      }
      if (filterMaxVal !== '') {
        const fat = parseFloat(l.financeiro?.faturamento) || 0;
        if (fat > parseFloat(filterMaxVal)) return false;
      }
      return true;
    });
  };

  const getLeadsByStatus = (statusId) => {
    let filtered = leads.filter(l => (l.status || 'novo') === statusId);
    filtered = applyAdvancedFilters(filtered);
    if (statusId === 'fechado' || statusId === 'realizado') {
      return [...filtered].sort((a, b) => {
        const dateA = a.dataEvento ? new Date(a.dataEvento) : new Date(8640000000000000);
        const dateB = b.dataEvento ? new Date(b.dataEvento) : new Date(8640000000000000);
        if (statusId === 'realizado') {
          return dateB - dateA;
        }
        return dateA - dateB;
      });
    }
    return filtered;
  };

  const totalLeads = leads.length;
  const fechadosCount = getLeadsByStatus('fechado').length + getLeadsByStatus('realizado').length;
  const conversao = totalLeads > 0 ? Math.round((fechadosCount / totalLeads) * 100) : 0;

  const faturamento = selectedLead ? (parseFloat(selectedLead.financeiro?.faturamento) || 0) : 0;
  const desconto = selectedLead ? (parseFloat(selectedLead.financeiro?.desconto) || 0) : 0;
  const valorPago = selectedLead ? (parseFloat(selectedLead.financeiro?.valorPago) || 0) : 0;
  const valorRestante = Math.max(0, (faturamento - desconto) - valorPago);
  const custosObj = selectedLead?.financeiro?.custos || {};
  const custosLista = Object.values(custosObj);
  const totalCustos = custosLista.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
  const lucro = (faturamento - desconto) - totalCustos;
  const margem = (faturamento - desconto) > 0 ? (lucro / (faturamento - desconto)) * 100 : 0;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Gestão de Leads</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Acompanhe os orçamentos solicitados.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`btn ${viewMode === 'kanban' ? 'btn--primary' : 'btn--outline'}`} 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', flex: isMobile ? 1 : 'none', width: 'auto', color: viewMode === 'kanban' ? '#000' : '#FFF' }}
            >
              <FiColumns size={16} /> Kanban
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`btn ${viewMode === 'table' ? 'btn--primary' : 'btn--outline'}`} 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', flex: isMobile ? 1 : 'none', width: 'auto', color: viewMode === 'table' ? '#000' : '#FFF' }}
            >
              <FiList size={16} /> Tabela
            </button>
          </div>

          <button 
            onClick={() => setIsAddingManual(true)}
            className="btn btn--primary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}
          >
            <FiPlus size={18} /> Novo Lead Manual
          </button>

          {/* Simplified Analytics Bar */}
          <div className="admin-stats" style={{ display: 'flex', gap: '20px', background: 'var(--bg-card)', padding: '14px 20px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-card)', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-around' : 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>{totalLeads}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500', letterSpacing: '0.3px' }}>Total Leads</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#4CAF50' }}>{fechadosCount}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500', letterSpacing: '0.3px' }}>Fechados</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)' }}>{conversao}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500', letterSpacing: '0.3px' }}>Conversão</div>
          </div>
        </div>
      </div>
      </div>

      {/* ── ADVANCED FILTERS & TEST SHORTCUTS ──────────────────────────────── */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: showFilters ? 'rgba(203, 161, 83, 0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${showFilters ? 'var(--primary)' : 'var(--border-color)'}`,
            color: showFilters ? 'var(--primary)' : 'var(--text-secondary)',
            borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          🔍 Filtros Avançados
          {activeFilterCount > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#000', borderRadius: '10px',
              fontSize: '0.72rem', fontWeight: 'bold', padding: '1px 7px'
            }}>{activeFilterCount}</span>
          )}
        </button>

        <a
          href="/orcamento?ab=A"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60A5FA', borderRadius: '10px', padding: '8px 14px',
            fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          title="Abrir o formulário no Teste A (Por Convidado)"
        >
          🅰️ Testar Grupo A (Por Convidado) ↗️
        </a>

        <a
          href="/orcamento?ab=B"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            color: '#C084FC', borderRadius: '10px', padding: '8px 14px',
            fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          title="Abrir o formulário no Teste B (Preço Fixo por Faixa)"
        >
          🧪 Testar Grupo B (Preço Fixo) ↗️
        </a>
      </div>

        {showFilters && (
          <div style={{
            marginTop: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end'
          }}>
            {/* Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '2', minWidth: '180px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Busca (nome / telefone)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Maria, (32)..."
                value={filterSearch}
                onChange={e => { setFilterSearch(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Month */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '140px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mês do Evento</label>
              <input
                type="month"
                className="form-input"
                value={filterMonth}
                onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Pacote */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '140px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pacote</label>
              <select
                className="form-select"
                value={filterPacote}
                onChange={e => { setFilterPacote(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="">Todos</option>
                {uniquePacotes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Cidade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '140px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cidade</label>
              <select
                className="form-select"
                value={filterCidade}
                onChange={e => { setFilterCidade(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="">Todas</option>
                {uniqueCidades.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Faturamento Min */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '110px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fat. Mínimo (R$)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={filterMinVal}
                onChange={e => { setFilterMinVal(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Faturamento Max */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '110px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fat. Máximo (R$)</label>
              <input
                type="number"
                className="form-input"
                placeholder="99999"
                value={filterMaxVal}
                onChange={e => { setFilterMaxVal(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterSearch(''); setFilterMonth(''); setFilterPacote('');
                  setFilterCidade(''); setFilterMinVal(''); setFilterMaxVal('');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
                  color: '#F44336', borderRadius: '8px', padding: '8px 16px',
                  cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'flex-end'
                }}
              >
                ✕ Limpar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <div className="admin-kanban-container" style={{ 
          display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: 'calc(100vh - 150px)' 
        }}>
          {COLUMNS.map(col => {
            const colLeads = getLeadsByStatus(col.id);
            return (
              <div 
                key={col.id} 
                onDragOver={(e) => {
                  e.preventDefault(); // Necessário para permitir o onDrop
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; // Efeito visual ao arrastar por cima
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; // Remove efeito
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (leadId) {
                    handleStatusChange(leadId, col.id);
                  }
                }}
                className="admin-kanban-col"
                style={{ 
                  minWidth: '300px', flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px',
                  display: 'flex', flexDirection: 'column', borderTop: `3px solid ${col.color}`,
                  transition: 'background 0.2s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600', letterSpacing: '0.2px' }}>{col.title}</h3>
                  <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {colLeads.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {colLeads.map(lead => {
                    const { isStale, followUpCount } = getLeadStatusHelper(lead);
                    const isFrozenLead = followUpCount >= 3;

                    return (
                      <div 
                        key={lead.id}
                        draggable={!isMobile}
                        onDragStart={(e) => {
                          if (isMobile) return;
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.currentTarget.style.opacity = '0.5'; // Efeito visual no item sendo arrastado
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        onClick={() => setSelectedLead(lead)}
                        style={{
                          background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '12px',
                          cursor: isMobile ? 'pointer' : 'grab', 
                          border: isFrozenLead 
                            ? '1px solid rgba(0, 229, 255, 0.4)' 
                            : (isStale ? '1px solid rgba(244, 67, 54, 0.4)' : '1px solid transparent'),
                          boxShadow: 'var(--shadow-card)',
                          transition: 'box-shadow 0.2s, border-color 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{lead.nome} {lead.sobrenome}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleLeadAbGroup(lead.id, lead.abGroup); }}
                              title="Clique para alternar entre Grupo A (Por Convidado) e Grupo B (Preço Fixo por Faixa)"
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                background: lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                                color: lead.abGroup === 'B' ? '#00E5FF' : 'var(--primary)',
                                border: `1px solid ${lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(203, 161, 83, 0.35)'}`,
                                cursor: 'pointer'
                              }}
                            >
                              {lead.abGroup === 'B' ? '🧪 Grupo B 🔄' : '🅰️ Grupo A 🔄'}
                            </button>
                            {isFrozenLead ? (
                              <span title={`Lead com ${followUpCount} tentativas de contato sem fechar. Marque como perdido!`} style={{ fontSize: '0.7rem', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>❄️ Esfriou</span>
                            ) : (
                              isStale && <span title="Lead sem novas interações há mais de 15 dias!" style={{ fontSize: '0.7rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>🔥 Esfriando</span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <FiCalendar size={12} /> {lead.dataEvento || 'Data não inf.'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiMapPin size={12} /> {lead.cidade}
                        </div>
                        
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(203, 161, 83, 0.12)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '6px', fontWeight: '600', letterSpacing: '0.2px' }}>
                            {lead.pacote}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {(() => {
                              const fin = getFinanceStatusHelper(lead);
                              return (
                                <span style={{ fontSize: '0.68rem', color: fin.color, background: fin.bg, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                  {fin.label}
                                </span>
                              );
                            })()}
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {lead.convidados} conv.
                            </span>
                          </div>
                        </div>

                        {/* Badge cerimonialista */}
                        {lead.cerimonialista && cerimonialistas[lead.cerimonialista] && (
                          <div style={{
                            marginTop: 8, fontSize: '0.72rem', color: '#E91E63',
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'rgba(233,30,99,0.06)', padding: '3px 8px',
                            borderRadius: 6
                          }}>
                            <FiHeart size={10} /> {cerimonialistas[lead.cerimonialista].nome}
                          </div>
                        )}

                        {/* Seletor rápido de status para celular */}
                        {isMobile && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Mover para etapa:
                            </label>
                            <select
                              value={lead.status || 'novo'}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className="form-select"
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '0.8rem',
                                background: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                minHeight: '36px',
                                marginTop: '2px'
                              }}
                            >
                              {COLUMNS.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {colLeads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Nenhum lead nesta etapa.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-table-container" style={{ background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', minHeight: 'calc(100vh - 150px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Lista de Leads</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status:</label>
                <select className="form-select" style={{ padding: '6px 12px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Todos</option>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mostrar:</label>
                <select className="form-select" style={{ width: '100px', padding: '6px 12px' }} value={itemsPerPage} onChange={(e) => { setItemsPerPage(e.target.value); setCurrentPage(1); }}>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="all">Todos</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Nome</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Telefone</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Data do Evento</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Pacote</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Financeiro</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let filteredLeads = statusFilter === 'all' ? leads : leads.filter(l => (l.status || 'novo') === statusFilter);
                  filteredLeads = applyAdvancedFilters(filteredLeads);
                  if (statusFilter === 'fechado' || statusFilter === 'realizado') {
                    filteredLeads = [...filteredLeads].sort((a, b) => {
                      const dateA = a.dataEvento ? new Date(a.dataEvento) : new Date(8640000000000000);
                      const dateB = b.dataEvento ? new Date(b.dataEvento) : new Date(8640000000000000);
                      return statusFilter === 'realizado' ? dateB - dateA : dateA - dateB;
                    });
                  }

                  const limit = itemsPerPage === 'all' ? filteredLeads.length : parseInt(itemsPerPage, 10);
                  const totalPages = Math.ceil(filteredLeads.length / limit) || 1;
                  const startIndex = (currentPage - 1) * limit;
                  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + limit);

                  if (paginatedLeads.length === 0) {
                    return <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum lead encontrado.</td></tr>;
                  }

                  return paginatedLeads.map(lead => {
                    const { isStale, followUpCount } = getLeadStatusHelper(lead);
                    const isFrozenLead = followUpCount >= 3;

                    return (
                      <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{lead.nome} {lead.sobrenome}</span>
                            <span
                              title={lead.abGroup === 'B' ? 'Lead variante do Teste A/B (Preços B / Regras B)' : 'Lead controle do Teste A/B (Preços A)'}
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                                color: lead.abGroup === 'B' ? '#00E5FF' : 'var(--primary)',
                                border: `1px solid ${lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(203, 161, 83, 0.35)'}`
                              }}
                            >
                              {lead.abGroup === 'B' ? '🧪 B' : '🅰️ A'}
                            </span>
                            {isFrozenLead ? (
                              <span title={`Lead com ${followUpCount} tentativas de contato sem fechar.`} style={{ fontSize: '0.65rem', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>❄️ Esfriou</span>
                            ) : (
                              isStale && <span title="Lead sem novas interações há mais de 15 dias!" style={{ fontSize: '0.65rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>🔥 Esfriando</span>
                            )}
                          </div>
                        </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.telefone}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.dataEvento || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--primary)' }}>{lead.pacote || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select 
                          value={lead.status || 'novo'} 
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          const fin = getFinanceStatusHelper(lead);
                          return (
                            <span style={{ fontSize: '0.72rem', color: fin.color, background: fin.bg, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                              {fin.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        >
                          <FiEye size={14} /> Detalhes
                        </button>
                      </td>
                    </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {itemsPerPage !== 'all' && (() => {
            let paginationLeads = statusFilter === 'all' ? leads : leads.filter(l => (l.status || 'novo') === statusFilter);
            paginationLeads = applyAdvancedFilters(paginationLeads);
            const totalFilteredLeads = paginationLeads.length;
            const limit = parseInt(itemsPerPage, 10);
            const totalPages = Math.ceil(totalFilteredLeads / limit) || 1;
            
            return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Mostrando página {currentPage} de {totalPages} ({totalFilteredLeads} leads no total)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn--outline"
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPage === 1 ? 0.5 : 1, width: 'auto' }}
                >
                  <FiChevronLeft /> Anterior
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="btn btn--outline"
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', width: 'auto', opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1 }}
                >
                  Próxima <FiChevronRight />
                </button>
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Modal de Detalhes do Lead */}
      {selectedLead && (
        <div 
          onClick={() => { setSelectedLead(null); setIsEditingLead(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', width: '100%', maxWidth: isMobile ? '100%' : '680px',
            borderRadius: isMobile ? '20px 20px 0 0' : '16px', overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.1)',
            maxHeight: isMobile ? '95vh' : '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.7)',
            animation: isMobile ? 'slideUp 0.3s ease' : 'fadeInUp 0.3s ease',
            borderBottom: isMobile ? 'none' : undefined
          }}>
            {/* HEADER */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(203, 161, 83, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif', fontSize: '1.2rem' }}>Detalhes do Lead</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {!isEditingLead ? (
                  <button onClick={startEditingLead} title="Editar Lead" style={{ background: 'rgba(203,161,83,0.15)', border: '1px solid var(--primary)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}>
                    <FiEdit2 size={14} /> Editar
                  </button>
                ) : (
                  <button onClick={handleSaveEditLead} title="Salvar Alterações" style={{ background: 'var(--primary)', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    <FiSave size={14} /> Salvar
                  </button>
                )}
                <button onClick={() => handleDeleteLead(selectedLead.id)} title="Excluir Lead" style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
                  <FiTrash2 size={18} />
                </button>
                <button onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
                  <FiX size={22} />
                </button>
              </div>
            </div>
            
            {/* TABS SELECTOR */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-app)', 
              borderBottom: '1px solid rgba(203, 161, 83, 0.08)',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              position: 'relative',
              flexShrink: 0
            }}>
              {[
                { id: 'info', label: 'Cadastro', icon: FiList },
                { id: 'equipe', label: 'Equipe', icon: FiUsers },
                { id: 'drinks', label: 'Bebidas', icon: FiPackageIcon },
                { id: 'scripts', label: 'Ações', icon: FiPhone },
                { id: 'financeiro', label: 'Financeiro', icon: FiTrendingUp }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: isMobile ? '12px 8px' : '14px 16px',
                      background: isActive ? 'rgba(203, 161, 83, 0.08)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.72rem' : '0.85rem',
                      fontWeight: isActive ? '700' : '500',
                      transition: 'all 0.2s',
                      outline: 'none',
                      minHeight: '44px',
                      flexShrink: 0,
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      letterSpacing: '0.2px'
                    }}
                  >
                    <TabIcon size={isMobile ? 13 : 14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            
            {/* MODAL CONTENT BODY */}
            <div style={{ padding: '24px 20px', overflowY: 'auto', flex: 1 }}>
              
              {/* Quick info header */}
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '12px', 
                padding: '12px 16px', 
                marginBottom: '20px', 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{selectedLead.nome} {selectedLead.sobrenome || ''}</span>
                    <button
                      type="button"
                      onClick={() => toggleLeadAbGroup(selectedLead.id, selectedLead.abGroup)}
                      title="Clique para alternar entre Grupo A (Por Convidado) e Grupo B (Preço Fixo por Faixa)"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: selectedLead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                        color: selectedLead.abGroup === 'B' ? '#00E5FF' : 'var(--primary)',
                        border: `1px solid ${selectedLead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(203, 161, 83, 0.35)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {selectedLead.abGroup === 'B' ? '🧪 Grupo B (Preço Fixo) 🔄' : '🅰️ Grupo A (Por Convidado) 🔄'}
                    </button>
                    {(() => {
                      const { isStale, followUpCount } = getLeadStatusHelper(selectedLead);
                      if (followUpCount >= 3) {
                        return <span title={`Lead com ${followUpCount} tentativas de contato sem fechar.`} style={{ fontSize: '0.7rem', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>❄️ Esfriou</span>;
                      } else if (isStale) {
                        return <span title="Lead sem novas interações há mais de 15 dias!" style={{ fontSize: '0.7rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>🔥 Esfriando</span>;
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Telefone: {formatPhone(selectedLead.telefone)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Status</label>
                    <select 
                      value={selectedLead.status || 'novo'}
                      onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                      className="form-select"
                      style={{ 
                        marginTop: 0, 
                        padding: '4px 10px', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px', 
                        background: 'var(--bg-input)', 
                        borderColor: 'rgba(203, 161, 83, 0.3)',
                        color: 'var(--primary)',
                        fontWeight: 'bold',
                        height: '32px',
                        width: '140px'
                      }}
                    >
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 📋 TAB 1: GENERAL INFO */}
              {modalTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
                  {/* Call WhatsApp shortcut + AI Follow-up */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a 
                      href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedLead.nome}, vi que solicitou um orçamento para o pacote ${selectedLead.pacote}!`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn"
                      style={{ 
                        background: '#25D366', 
                        border: 'none', 
                        color: 'white', 
                        textDecoration: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        flex: 1,
                        minHeight: 44,
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '0.88rem'
                      }}
                    >
                      <FiPhone /> Abrir WhatsApp do Cliente
                    </a>

                    <button
                      onClick={() => { setAiFollowupResult(null); handleGenerateFollowup(); }}
                      disabled={aiFollowupLoading}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                        background: aiFollowupLoading ? 'rgba(203,161,83,0.3)' : 'linear-gradient(135deg, rgba(203,161,83,0.18), rgba(203,161,83,0.08))',
                        border: '1px solid rgba(203,161,83,0.45)',
                        color: 'var(--primary)', borderRadius: '8px', padding: '10px 14px',
                        cursor: aiFollowupLoading ? 'not-allowed' : 'pointer',
                        fontWeight: '600', fontSize: '0.85rem', minHeight: 44, whiteSpace: 'nowrap'
                      }}
                    >
                      {aiFollowupLoading ? (
                        <><div className="btn__spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /> Gerando...</>
                      ) : (
                        <>✨ Follow-up com IA</>
                      )}
                    </button>
                  </div>

                  {/* AI Follow-up Result Modal */}
                  {aiFollowupResult && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(203,161,83,0.08), rgba(30,30,30,0.95))',
                      border: '1px solid rgba(203,161,83,0.35)',
                      borderRadius: '12px',
                      padding: '16px',
                      position: 'relative',
                      animation: 'fadeIn 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>✨ Mensagem gerada pela IA</span>
                        <button onClick={() => setAiFollowupResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>✕</button>
                      </div>
                      <p style={{
                        margin: 0, fontSize: '0.9rem', lineHeight: '1.6',
                        color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
                        background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '12px'
                      }}>{aiFollowupResult}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          onClick={handleCopyFollowup}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            background: aiFollowupCopied ? 'rgba(76,175,80,0.2)' : 'rgba(203,161,83,0.15)',
                            border: `1px solid ${aiFollowupCopied ? '#4CAF50' : 'rgba(203,161,83,0.4)'}`,
                            color: aiFollowupCopied ? '#4CAF50' : 'var(--primary)',
                            borderRadius: '8px', padding: '9px 14px', cursor: 'pointer',
                            fontWeight: '600', fontSize: '0.82rem', transition: 'all 0.2s'
                          }}
                        >
                          {aiFollowupCopied ? '✓ Copiado!' : '📋 Copiar Mensagem'}
                        </button>
                        <a
                          href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(aiFollowupResult)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            background: '#25D366', border: 'none', color: 'white',
                            borderRadius: '8px', padding: '9px 14px', textDecoration: 'none',
                            fontWeight: '600', fontSize: '0.82rem'
                          }}
                        >
                          <FiPhone size={14} /> Enviar no WhatsApp
                        </a>
                        <button
                          onClick={handleGenerateFollowup}
                          disabled={aiFollowupLoading}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)', borderRadius: '8px', padding: '9px 12px',
                            cursor: aiFollowupLoading ? 'not-allowed' : 'pointer', fontSize: '0.82rem'
                          }}
                          title="Gerar nova versão"
                        >
                          🔄
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cerimonialista Parceiro */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FiHeart size={16} style={{ color: '#E91E63', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cerimonialista Parceiro</label>
                      <select
                        value={selectedLead.cerimonialista || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await update(ref(db, `leads/${selectedLead.id}`), { cerimonialista: val });
                          setSelectedLead(prev => ({ ...prev, cerimonialista: val }));
                        }}
                        className="form-select"
                        style={{ 
                          marginTop: 0, 
                          background: 'var(--bg-input)', 
                          borderColor: 'rgba(203, 161, 83, 0.15)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          height: '40px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="">— Sem parceiro / Direto —</option>
                        {Object.entries(cerimonialistas).map(([slug, c]) => (
                          <option key={slug} value={slug}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Client & Event Data Forms */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px' }}>
                      Dados Cadastrais
                    </h4>
                    
                    {isEditingLead ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome</label>
                          <input className="form-input" value={editLeadData.nome} onChange={e => setEditLeadData({...editLeadData, nome: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Sobrenome</label>
                          <input className="form-input" value={editLeadData.sobrenome} onChange={e => setEditLeadData({...editLeadData, sobrenome: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Telefone</label>
                          <input className="form-input" value={editLeadData.telefone} onChange={e => setEditLeadData({...editLeadData, telefone: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cidade</label>
                          <input className="form-input" value={editLeadData.cidade} onChange={e => setEditLeadData({...editLeadData, cidade: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Data do Evento</label>
                          <input type="date" className="form-input" value={editLeadData.dataEvento} onChange={e => setEditLeadData({...editLeadData, dataEvento: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Horário</label>
                          <input type="time" className="form-input" value={editLeadData.horarioEvento} onChange={e => setEditLeadData({...editLeadData, horarioEvento: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Convidados</label>
                          <input type="number" className="form-input" value={editLeadData.convidados} onChange={e => setEditLeadData({...editLeadData, convidados: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tipo de Evento</label>
                          <input className="form-input" value={editLeadData.tipoEvento} onChange={e => setEditLeadData({...editLeadData, tipoEvento: e.target.value})} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pacote Contratado</label>
                          <select className="form-select" value={editLeadData.pacote} onChange={e => setEditLeadData({...editLeadData, pacote: e.target.value})}>
                            <option value="">Selecione</option>
                            {pacotes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Cliente:</strong> {selectedLead.nome} {selectedLead.sobrenome || ''}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Telefone:</strong> {formatPhone(selectedLead.telefone)}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Cidade:</strong> {selectedLead.cidade || '—'}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Tipo:</strong> {selectedLead.tipoEvento || '—'}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Data:</strong> {selectedLead.dataEvento ? selectedLead.dataEvento.split('-').reverse().join('/') : '—'}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Horário:</strong> {selectedLead.horarioEvento || '—'}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Convidados:</strong> {selectedLead.convidados || '—'}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Pacote:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{selectedLead.pacote || '—'}</span></div>
                      </div>
                    )}
                  </div>

                  {/* ✍️ CONTRATO ASSINADO & HISTÓRICO */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiFileText style={{ color: 'var(--primary)' }} /> Assinatura do Contrato
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Contrato Assinado pelo Cliente</label>
                      
                      {selectedLead.contratoAssinadoUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(76, 175, 80, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✓ Contrato Assinado Anexado
                            </span>
                            <button
                              onClick={() => {
                                showConfirm("Deseja remover o contrato assinado deste lead?", async () => {
                                  await update(ref(db, `leads/${selectedLead.id}`), { contratoAssinadoUrl: null });
                                  setSelectedLead(prev => ({ ...prev, contratoAssinadoUrl: null }));
                                  
                                  // Log removal in history
                                  await push(ref(db, `leads/${selectedLead.id}/messages`), {
                                    type: 'contrato_assinado_removido',
                                    success: true,
                                    sentAt: Date.now()
                                  });
                                  showToast("Contrato assinado removido com sucesso!", "success");
                                }, "Remover Contrato");
                              }}
                              style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                            >
                              Remover
                            </button>
                          </div>
                          <a 
                            href={selectedLead.contratoAssinadoUrl} 
                            target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', wordBreak: 'break-all' }}
                          >
                            Visualizar Contrato Assinado 📄
                          </a>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(255, 213, 79, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 213, 79, 0.12)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          ⏳ Aguardando assinatura do contrato.
                        </div>
                      )}

                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                          {selectedLead.contratoAssinadoUrl ? 'Atualizar Contrato Assinado (PDF ou Imagem):' : 'Fazer Upload do Contrato Assinado (PDF ou Imagem):'}
                        </label>
                        <MinioImageUpload 
                          value={selectedLead.contratoAssinadoUrl || ''} 
                          accept="application/pdf,image/*"
                          placeholder="Cole a URL ou suba o arquivo do contrato"
                          onChange={async (url) => {
                            if (url) {
                              await update(ref(db, `leads/${selectedLead.id}`), { contratoAssinadoUrl: url });
                              setSelectedLead(prev => ({ ...prev, contratoAssinadoUrl: url }));
                              
                              // Log upload in history
                              await push(ref(db, `leads/${selectedLead.id}/messages`), {
                                type: 'contrato_assinado_upload',
                                success: true,
                                sentAt: Date.now()
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 📜 HISTÓRICO DE INTERAÇÕES E ENVIOS */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiList style={{ color: 'var(--primary)' }} /> Histórico de Envios e Interações
                    </h4>

                    {selectedLead.messages ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                        {Object.entries(selectedLead.messages)
                          .map(([key, val]) => ({ key, ...val }))
                          .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0))
                          .map((msg) => {
                            const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleString('pt-BR') : '—';
                            
                            // Traduzir/Formatar tipos de ações
                            let actionLabel = 'Ação registrada';
                            let icon = '💬';
                            
                            if (msg.type === 'orcamento') {
                              actionLabel = 'Orçamento enviado (PDF)';
                              icon = '📄';
                            } else if (msg.type === 'contrato_gerado') {
                              actionLabel = 'Contrato gerado pelo cliente';
                              icon = '📝';
                            } else if (msg.type === 'contrato_gerado_admin') {
                              actionLabel = 'Contrato gerado pelo admin';
                              icon = '⚙️';
                            } else if (msg.type === 'script_contrato') {
                              actionLabel = 'Link do contrato enviado por WhatsApp';
                              icon = '🔗';
                            } else if (msg.type?.startsWith('script_')) {
                              const scriptName = msg.type.split('_')[1];
                              const namesMap = { autoridade: '1. Autoridade', escassez: '2. Escassez', posEvento: '3. Pós-Evento' };
                              actionLabel = `Script WhatsApp enviado: ${namesMap[scriptName] || scriptName}`;
                              icon = '📲';
                            } else if (msg.type === 'lista_compras') {
                              actionLabel = 'Link da Lista de Compras enviado';
                              icon = '🛒';
                            } else if (msg.type === 'notif_cerimonialista') {
                              actionLabel = 'Notificação de fechamento enviada ao Cerimonialista';
                              icon = '🤝';
                            } else if (msg.type?.startsWith('availability_check_')) {
                              actionLabel = 'Envio de teste de disponibilidade p/ ajudante';
                              icon = '⏳';
                            } else if (msg.type?.startsWith('final_confirmation_')) {
                              actionLabel = 'Confirmação final de escala enviada p/ ajudante';
                              icon = '✅';
                            } else if (msg.type === 'contrato_assinado_upload') {
                              actionLabel = 'Contrato assinado anexado pelo admin';
                              icon = '📁';
                            } else if (msg.type === 'contrato_assinado_removido') {
                              actionLabel = 'Contrato assinado removido pelo admin';
                              icon = '🗑️';
                            }

                            const statusColor = msg.success ? '#4CAF50' : '#F44336';
                            
                            return (
                              <div key={msg.key} style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px', borderLeft: `3px solid ${statusColor}`, fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{icon} {actionLabel}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dateStr}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                  <span>{msg.number ? `Destinatário: ${msg.number}` : ''}</span>
                                  <span style={{ color: statusColor, fontWeight: 'bold' }}>
                                    {msg.success ? 'Sucesso' : `Erro: ${msg.error || 'Falha no envio'}`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '12px 0' }}>
                        Nenhuma interação registrada para este lead.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 👥 TAB 2: STAFF & SCHEDULES */}
              {modalTab === 'equipe' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
                  {/* Event Team management */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '18px', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiUsers style={{ color: 'var(--primary)' }} /> Equipe do Evento
                      </h4>
                      {selectedLead.ajudantes && Object.values(selectedLead.ajudantes).some(a => a.status === 'confirmado') && (
                        <button
                          onClick={handleSendHelperFinalConfirmation}
                          disabled={sendingScript}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.75rem', 
                            height: 'auto', 
                            background: '#4CAF50', 
                            border: 'none', 
                            color: 'var(--text-primary)', 
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Confirmar Evento c/ Equipe
                        </button>
                      )}
                    </div>

                    {/* Add Helper Selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <select
                        id="add-helper-select"
                        className="form-select"
                        style={{ 
                          marginTop: 0, 
                          flex: 1, 
                          background: 'var(--bg-input)', 
                          borderColor: 'rgba(203, 161, 83, 0.15)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          height: '40px'
                        }}
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const overlap = checkHelperOverlap(val);
                            if (overlap) {
                              showToast(`Atenção: Este ajudante já está escalado no mesmo dia em: ${overlap}`, 'warning');
                            }
                            handleAddHelperToLead(val);
                            e.target.value = ""; // reset select
                          }
                        }}
                      >
                        <option value="">+ Adicionar Ajudante à Equipe</option>
                        {Object.entries(ajudantes)
                          .filter(([slug]) => !selectedLead.ajudantes || !selectedLead.ajudantes[slug])
                          .map(([slug, a]) => {
                            const overlap = checkHelperOverlap(slug);
                            return (
                              <option key={slug} value={slug}>
                                {a.nome} ({a.especialidade}) {overlap ? '⚠️ (Escalado)' : ''}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    {/* Helpers List */}
                    {(!selectedLead.ajudantes || Object.keys(selectedLead.ajudantes).length === 0) ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', border: '1px dashed rgba(203, 161, 83, 0.1)', borderRadius: '8px' }}>
                        Nenhum ajudante escalado para este evento.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.entries(selectedLead.ajudantes).map(([slug, data]) => {
                          const helperInfo = ajudantes[slug] || { nome: slug, telefone: '', displayName: slug, especialidade: 'Ajudante' };
                          const overlap = checkHelperOverlap(slug);
                          const helperData = typeof data === 'object' && data !== null ? data : { status: data };
                          const helperStatus = helperData.status || 'pendente';
                          
                          return (
                            <div key={slug} style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.1)' }}>
                              <div style={{ display: 'flex', justifyContext: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                                    {helperInfo.nome}
                                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'rgba(203, 161, 83, 0.08)', border: '1px solid rgba(203, 161, 83, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                                      {helperInfo.especialidade}
                                    </span>
                                  </div>
                                  {helperInfo.telefone && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                      📞 {formatPhone(helperInfo.telefone)}
                                    </div>
                                  )}
                                  {overlap && (
                                    <div style={{ fontSize: '0.72rem', color: '#FF9800', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      ⚠️ Escalado em: {overlap}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Badges de Status */}
                                <div>
                                  {helperStatus === 'confirmado' && (
                                    <span style={{ background: 'rgba(46, 139, 87, 0.12)', color: '#4CAF50', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                      ✅ Confirmado
                                    </span>
                                  )}
                                  {(helperStatus === 'indisponivel' || helperStatus === 'recusado') && (
                                    <span style={{ background: 'rgba(139, 0, 0, 0.12)', color: '#F44336', border: '1px solid rgba(244, 67, 54, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                      ❌ {helperStatus === 'indisponivel' ? 'Indisponível' : 'Recusado'}
                                    </span>
                                  )}
                                  {helperStatus === 'pendente' && (
                                    <span style={{ background: 'rgba(203, 161, 83, 0.12)', color: '#FFD54F', border: '1px solid rgba(255, 213, 79, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                      ⏳ Pendente
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions for helper */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => handleSendHelperAvailabilityCheck(slug, helperInfo)}
                                    disabled={sendingScript || !helperInfo.telefone}
                                    style={{ 
                                      padding: '6px 10px', 
                                      fontSize: '0.72rem', 
                                      height: 'auto', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      background: 'rgba(203, 161, 83, 0.05)',
                                      border: '1px solid rgba(203, 161, 83, 0.2)',
                                      color: 'var(--primary)',
                                      borderRadius: '6px',
                                      cursor: 'pointer'
                                    }}
                                    title="Perguntar disponibilidade via WhatsApp"
                                  >
                                    <FiPhone size={10} /> {helperData.perguntouEm ? 'Reenviar Pergunta' : 'Perguntar'}
                                  </button>
                                  
                                  {helperData.perguntouEm && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                      Perguntou: {new Date(helperData.perguntouEm).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleUpdateHelperStatus(slug, 'confirmado')}
                                    style={{ 
                                      background: helperStatus === 'confirmado' ? 'rgba(76,175,80,0.15)' : 'none', 
                                      border: '1px solid #4CAF50', 
                                      color: '#4CAF50', 
                                      cursor: 'pointer', 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      fontSize: '0.72rem', 
                                      fontWeight: 'bold', 
                                      minHeight: 30 
                                    }}
                                  >
                                    <FiCheck size={12} /> Confirmado
                                  </button>
                                  <button
                                    onClick={() => handleUpdateHelperStatus(slug, 'indisponivel')}
                                    style={{ 
                                      background: (helperStatus === 'indisponivel' || helperStatus === 'recusado') ? 'rgba(244,67,54,0.15)' : 'none', 
                                      border: '1px solid #F44336', 
                                      color: '#F44336', 
                                      cursor: 'pointer', 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      fontSize: '0.72rem', 
                                      fontWeight: 'bold', 
                                      minHeight: 30 
                                    }}
                                  >
                                    <FiX size={12} /> Indisponível
                                  </button>
                                  <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }} />
                                  <button
                                    onClick={() => handleRemoveHelperFromLead(slug)}
                                    style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '4px' }}
                                    title="Remover da equipe"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🍹 TAB 3: DRINKS & PURCHASES */}
              {modalTab === 'drinks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
                  {/* Generate shopping list widget */}
                  <div style={{ background: 'rgba(0, 229, 255, 0.03)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}>
                      🛒 Lista de Compras (Insumos)
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 12px 0' }}>
                      Acesse a lista interativa de compras para visualizar, marcar os itens e escolher os drinks.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                      {/* Client link */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>🔗 Link do Cliente (Escolher Drinks)</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            readOnly
                            value={`${generalConfigs?.siteUrl ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl) : window.location.origin}/lista-compras/${selectedLead.id}`}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-secondary)',
                              fontSize: '0.8rem',
                              outline: 'none'
                            }}
                            id="client-list-link-input"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById('client-list-link-input');
                              if (input) {
                                input.select();
                                navigator.clipboard.writeText(input.value);
                                showToast('Link do cliente copiado!', 'success');
                              }
                            }}
                            className="btn"
                            style={{
                              padding: '8px 14px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Copiar
                          </button>
                          <button
                            onClick={() => {
                              const url = `${generalConfigs?.siteUrl ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl) : window.location.origin}/lista-compras/${selectedLead.id}`;
                              setPreviewUrl(url);
                            }}
                            className="btn"
                            style={{
                              padding: '8px 14px',
                              background: 'var(--primary)',
                              border: 'none',
                              color: '#000',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FiEye size={12} /> Abrir
                          </button>
                        </div>
                      </div>

                      {/* Barman link */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>📋 Checklist do Barman (Marcar Itens Comprados)</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            readOnly
                            value={`${generalConfigs?.siteUrl ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl) : window.location.origin}/lista-compras/${selectedLead.id}?barman=true`}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-secondary)',
                              fontSize: '0.8rem',
                              outline: 'none'
                            }}
                            id="barman-list-link-input"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById('barman-list-link-input');
                              if (input) {
                                input.select();
                                navigator.clipboard.writeText(input.value);
                                showToast('Link do barman copiado!', 'success');
                              }
                            }}
                            className="btn"
                            style={{
                              padding: '8px 14px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Copiar
                          </button>
                          <button
                            onClick={() => {
                              const url = `${generalConfigs?.siteUrl ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl) : window.location.origin}/lista-compras/${selectedLead.id}?barman=true`;
                              setPreviewUrl(url);
                            }}
                            className="btn"
                            style={{
                              padding: '8px 14px',
                              background: 'var(--primary)',
                              border: 'none',
                              color: '#000',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 'bold'
                            }}
                          >
                            <FiEye size={12} /> Abrir
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {selectedLead.shoppingListFinalizada ? (
                      <div style={{ padding: '10px 12px', background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '6px', color: '#4CAF50', fontSize: '0.85rem' }}>
                        ✅ <strong>A lista já foi finalizada!</strong> Veja os insumos detalhados abaixo ou acesse o Checklist do Barman para gerenciar as compras.
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleSendShoppingListViaApi(selectedLead)}
                        disabled={sendingScript}
                        className="btn"
                        style={{ 
                          borderColor: '#00E5FF', 
                          color: '#00E5FF', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '8px', 
                          width: '100%', 
                          background: 'none', 
                          cursor: sendingScript ? 'not-allowed' : 'pointer',
                          border: '1px solid #00E5FF',
                          minHeight: 46,
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}
                      >
                        <FiPhone /> Enviar Link de Seleção ao Cliente via WhatsApp
                      </button>
                    )}
                  </div>

                  {/* Chosen drinks */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '20px', border: 'none' }}>
                    <h4 style={{ margin: '0 0 14px 0', color: 'var(--text-primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
                      Escolhas de Bebidas
                    </h4>
                    <div style={{ fontSize: '0.88rem' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Drinks Selecionados pelo Cliente:</strong>
                        {selectedLead.drinksEscolhidos && selectedLead.drinksEscolhidos.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {selectedLead.drinksEscolhidos.map(d => {
                              const drinkInfo = drinksMenu[d];
                              const displayName = drinkInfo ? `${drinkInfo.emoji || '🍹'} ${drinkInfo.name}`.trim() : d;
                              return (
                                <span key={d} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', color: '#e8eade' }}>
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum drink selecionado ainda.</span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Upsell Chopp:</strong> {selectedLead.upsellChopp ? 'Sim 🍺' : 'Não'}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Upsell Frozen:</strong> {selectedLead.upsellFrozen ? 'Sim ❄️' : 'Não'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Shopping List Results */}
                  {selectedLead.shoppingListFinalizada && selectedLead.shoppingListResult && (
                    <div style={{ background: 'rgba(76, 175, 80, 0.04)', borderRadius: '12px', padding: '20px', border: 'none', borderLeft: '4px solid #4CAF50' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(76, 175, 80, 0.06)', paddingBottom: '8px', marginBottom: '14px' }}>
                        <h4 style={{ margin: 0, color: '#4CAF50', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🛒 Detalhes dos Insumos (Lista Calculada)
                        </h4>
                        {!isEditingShoppingList ? (
                          <button
                            onClick={handleStartEditShoppingList}
                            className="btn btn--outline"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', minHeight: 'auto', borderColor: '#4CAF50', color: '#4CAF50' }}
                          >
                            Editar Itens
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => { setIsEditingShoppingList(false); setEditedShoppingList(null); }}
                              className="btn btn--outline"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', minHeight: 'auto', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveShoppingList}
                              className="btn btn--primary"
                              style={{ padding: '4px 12px', fontSize: '0.75rem', width: 'auto', minHeight: 'auto', background: '#4CAF50', color: '#FFF', border: 'none' }}
                            >
                              Salvar
                            </button>
                          </div>
                        )}
                      </div>

                      {!isEditingShoppingList ? (
                        /* 🔍 INTERACTIVE CHECKLIST VIEW */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                          {(() => {
                            const flatItems = [
                              ...Object.entries(selectedLead.shoppingListResult.insumos || {}).map(([nome, qtd]) => ({
                                id: `insumo_${nome}`,
                                nome,
                                quantidade: qtd,
                                categoria: 'drinks',
                              })),
                              ...(selectedLead.shoppingListResult.fixos || []).map((f, idx) => ({
                                id: `fixo_${f.id || f.nome?.toLowerCase().replace(/\s+/g, '_') || idx}`,
                                nome: f.nome,
                                quantidade: `${f.quantidade} ${f.unidade}`,
                                categoria: f.categoria || 'bar',
                              }))
                            ];

                            const totalCount = flatItems.length;
                            const checkedCount = flatItems.filter(item => selectedLead.shoppingListChecked && selectedLead.shoppingListChecked[item.id]).length;
                            const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                            const filteredItems = flatItems.filter(item => {
                              const matchesCategory = modalCategoryFilter === 'all' || item.categoria === modalCategoryFilter;
                              const matchesSearch = item.nome.toLowerCase().includes(modalSearchTerm.toLowerCase());
                              return matchesCategory && matchesSearch;
                            });

                            return (
                              <>
                                {/* Progress feedback */}
                                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Status da Conferência:</span>
                                    <strong style={{ color: progressPct === 100 ? '#4CAF50' : 'var(--primary)' }}>
                                      {checkedCount}/{totalCount} itens ({progressPct}%)
                                    </strong>
                                  </div>
                                  <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? '#4CAF50' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                                  </div>
                                </div>

                                {/* SEARCH & FILTER CHIPS */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                                  <div style={{ position: 'relative' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Pesquisar item..."
                                      value={modalSearchTerm}
                                      onChange={(e) => setModalSearchTerm(e.target.value)}
                                      style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem', width: '100%', background: 'var(--bg-input)' }}
                                    />
                                    <span style={{ position: 'absolute', left: '10px', top: '52%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
                                    {modalSearchTerm && (
                                      <button onClick={() => setModalSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                                        Limpar
                                      </button>
                                    )}
                                  </div>

                                  {/* Categories pills */}
                                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                                    {[
                                      { id: 'all', label: 'Todos' },
                                      { id: 'drinks', label: 'Bebidas/Insumos' },
                                      { id: 'insumo', label: 'Frescos' },
                                      { id: 'bar', label: 'Equipamentos' },
                                      { id: 'descartavel', label: 'Descartáveis' },
                                      { id: 'decoracao', label: 'Decoração' }
                                    ].map(tab => {
                                      const isActive = modalCategoryFilter === tab.id;
                                      return (
                                        <button
                                          key={tab.id}
                                          onClick={() => setModalCategoryFilter(tab.id)}
                                          style={{
                                            padding: '4px 10px',
                                            fontSize: '0.72rem',
                                            borderRadius: '12px',
                                            border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                                            background: isActive ? 'var(--primary)' : 'var(--bg-input)',
                                            color: isActive ? '#000' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.1s ease'
                                          }}
                                        >
                                          {tab.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* TABLE LIST */}
                                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--border-color)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '350px', overflowY: 'auto' }}>
                                  {/* Table Header */}
                                  <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '8px 12px', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
                                    <div style={{ width: '32px' }}>Status</div>
                                    <div style={{ flex: 1, paddingLeft: '6px' }}>Item</div>
                                    <div style={{ width: '80px', textAlign: 'right' }}>Qtd</div>
                                  </div>

                                  {filteredItems.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', fontSize: '0.8rem' }}>
                                      Nenhum item localizado.
                                    </div>
                                  ) : (
                                    filteredItems.map(item => {
                                      const isChecked = !!(selectedLead.shoppingListChecked && selectedLead.shoppingListChecked[item.id]);
                                      return (
                                        <div
                                          key={item.id}
                                          onClick={() => toggleShoppingListItem(selectedLead, item.id)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '10px 12px',
                                            background: isChecked ? 'rgba(76,175,80,0.04)' : 'var(--bg-card)',
                                            borderBottom: '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            fontSize: '0.8rem'
                                          }}
                                        >
                                          {/* Status checkbox */}
                                          <div style={{ width: '32px', display: 'flex', alignItems: 'center' }}>
                                            <div style={{
                                              width: '16px',
                                              height: '16px',
                                              borderRadius: '3px',
                                              border: `2px solid ${isChecked ? '#4CAF50' : 'var(--border-color)'}`,
                                              background: isChecked ? '#4CAF50' : 'transparent',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              transition: 'all 0.1s ease'
                                            }}>
                                              {isChecked && <FiCheck size={10} color="#fff" strokeWidth={3} />}
                                            </div>
                                          </div>

                                          {/* Name and labels */}
                                          <div style={{ flex: 1, paddingLeft: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{
                                              fontWeight: '600',
                                              color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
                                              textDecoration: isChecked ? 'line-through' : 'none'
                                            }}>
                                              {item.nome}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                                {item.categoria === 'drinks' ? 'Insumo Bebida' : (item.categoria === 'bar' ? 'Equipamento' : (item.categoria === 'insumo' ? 'Fresco' : (item.categoria === 'descartavel' ? 'Descartável' : 'Decoração')))}
                                              </span>
                                              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: isChecked ? 'rgba(76,175,80,0.08)' : 'rgba(203,161,83,0.04)', color: isChecked ? '#4CAF50' : 'var(--primary)', fontWeight: 'bold' }}>
                                                {isChecked ? 'CONFERIDO' : 'PENDENTE'}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Quantity */}
                                          <div style={{ width: '80px', textAlign: 'right' }}>
                                            <strong style={{ color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                              {item.quantidade}
                                            </strong>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        /* ✍️ EDITOR VIEW */
                        editedShoppingList && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.85rem' }}>
                            {/* Insumos Editor */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--text-secondary)' }}>Insumos e Bebidas:</strong>
                                <button
                                  onClick={addInsumo}
                                  className="btn btn--outline"
                                  style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto', minHeight: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                >
                                  + Add Insumo
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {Object.keys(editedShoppingList.insumos).length === 0 && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum insumo.</div>
                                )}
                                {Object.entries(editedShoppingList.insumos).map(([insumo, qtd]) => (
                                  <div key={insumo} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={insumo}
                                      style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 1 }}
                                      onChange={(e) => updateInsumoKey(insumo, e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={qtd}
                                      style={{ padding: '6px 10px', fontSize: '0.8rem', width: '120px' }}
                                      onChange={(e) => updateInsumoVal(insumo, e.target.value)}
                                    />
                                    <button
                                      onClick={() => deleteInsumo(insumo)}
                                      style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '6px' }}
                                      title="Remover"
                                    >
                                      <FiTrash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Fixos Editor */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--text-secondary)' }}>Itens Fixos / Descartáveis:</strong>
                                <button
                                  onClick={addFixo}
                                  className="btn btn--outline"
                                  style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'auto', minHeight: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                >
                                  + Add Item Fixo
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(editedShoppingList.fixos || []).length === 0 && (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhum item fixo.</div>
                                )}
                                {(editedShoppingList.fixos || []).map((item, idx) => (
                                  <div key={item.id || idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={item.nome || ''}
                                      placeholder="Nome"
                                      style={{ padding: '6px 10px', fontSize: '0.8rem', flex: 2, minWidth: '120px' }}
                                      onChange={(e) => updateFixoField(idx, 'nome', e.target.value)}
                                    />
                                    <input
                                      type="number"
                                      className="form-input"
                                      value={item.quantidade ?? ''}
                                      placeholder="Qtd"
                                      style={{ padding: '6px 10px', fontSize: '0.8rem', width: '80px' }}
                                      onChange={(e) => updateFixoField(idx, 'quantidade', Number(e.target.value))}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={item.unidade || ''}
                                      placeholder="Un"
                                      style={{ padding: '6px 10px', fontSize: '0.8rem', width: '70px' }}
                                      onChange={(e) => updateFixoField(idx, 'unidade', e.target.value)}
                                    />
                                    <select
                                      className="form-select"
                                      value={item.categoria || 'bar'}
                                      style={{ padding: '6px 10px', fontSize: '0.8rem', width: '110px' }}
                                      onChange={(e) => updateFixoField(idx, 'categoria', e.target.value)}
                                    >
                                      <option value="bar">🍸 Bar</option>
                                      <option value="insumo">🍋 Fresco</option>
                                      <option value="decoracao">✨ Decoração</option>
                                      <option value="descartavel">🧾 Descartável</option>
                                    </select>
                                    <button
                                      onClick={() => deleteFixo(idx)}
                                      style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '6px' }}
                                      title="Remover"
                                    >
                                      <FiTrash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 💬 TAB 4: SCRIPTS & MESSAGES HISTORY */}
              {modalTab === 'scripts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
                  
                  {/* WhatsApp actions */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '18px', border: 'none' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
                      Disparador de Mensagens
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Reenviar Orçamento */}
                      <button 
                        onClick={() => handleResendQuote(selectedLead)}
                        disabled={sendingScript}
                        style={{ 
                          textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
                          color: '#000', background: 'var(--primary)', 
                          border: '1px solid var(--primary)', cursor: sendingScript ? 'not-allowed' : 'pointer', 
                          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                          borderRadius: '8px', minHeight: 46
                        }}
                      >
                        <FiPhone size={14} /> Reenviar PDF de Orçamento (Completo)
                      </button>

                      {/* Enviar Contrato */}
                      <button 
                        onClick={() => handleSendEvolution('contrato')}
                        disabled={sendingScript}
                        style={{ 
                          textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
                          color: '#000', background: 'var(--primary)', 
                          border: '1px solid var(--primary)', cursor: sendingScript ? 'not-allowed' : 'pointer', 
                          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                          borderRadius: '8px', minHeight: 46
                        }}
                      >
                        <FiFileText size={14} /> Enviar Contrato via WhatsApp
                      </button>

                      {/* Script 1: Autoridade */}
                      <button 
                        onClick={() => handleSendEvolution('autoridade')}
                        disabled={sendingScript}
                        style={{ 
                          textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
                          color: 'var(--text-primary)', border: '1px solid rgba(203, 161, 83, 0.2)', 
                          background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46
                        }}
                      >
                        <span style={{ color: '#00E5FF', marginRight: '8px', fontWeight: 'bold' }}>📸 1. Autoridade:</span>
                        Disparo de imagens/portfólio cadastrado.
                      </button>

                      {/* Script 2: Escassez */}
                      <button 
                        onClick={() => handleSendEvolution('escassez')}
                        disabled={sendingScript}
                        style={{ 
                          textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
                          color: 'var(--text-primary)', border: '1px solid rgba(203, 161, 83, 0.2)', 
                          background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46
                        }}
                      >
                        <span style={{ color: '#F44336', marginRight: '8px', fontWeight: 'bold' }}>🔥 2. Escassez:</span>
                        Disparo de aviso de bloqueio de data/escassez.
                      </button>

                      {/* Script 3: Pós-Evento */}
                      <button 
                        onClick={() => handleSendEvolution('posEvento')}
                        disabled={sendingScript}
                        style={{ 
                          textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
                          color: 'var(--text-primary)', border: '1px solid rgba(203, 161, 83, 0.2)', 
                          background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 46
                        }}
                      >
                        <span style={{ color: '#4CAF50', marginRight: '8px', fontWeight: 'bold' }}>⭐ 3. NPS / Pós:</span>
                        Mensagem pós-evento (feedback/avaliação).
                      </button>
                    </div>
                  </div>

                  {/* Message history */}
                  {selectedLead.messages && (
                    <div style={{ background: 'rgba(0, 229, 255, 0.04)', borderRadius: '12px', padding: '18px', border: 'none', borderLeft: '4px solid #00E5FF' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#00E5FF', borderBottom: '1px solid rgba(0, 229, 255, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
                        📋 Histórico de Envios
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                        {Object.entries(selectedLead.messages)
                          .map(([id, msg]) => ({ id, ...msg }))
                          .sort((a, b) => {
                            const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
                            const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
                            return timeB - timeA;
                          })
                          .map(msg => {
                            const typeLabels = {
                              'orcamento': '💰 Orçamento',
                              'script_autoridade': '📸 Autoridade',
                              'script_escassez': '🔥 Escassez',
                              'script_posEvento': '⭐ NPS Pós',
                              'script_contrato': '📄 Contrato',
                              'lista_compras': '🛒 Lista Compras',
                              'notif_cerimonialista': '💌 Cerimonialista',
                            };
                            const label = typeLabels[msg.type] || msg.type;
                            const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

                            return (
                              <div key={msg.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem',
                                background: msg.success ? 'rgba(76, 175, 80, 0.06)' : 'rgba(244, 67, 54, 0.06)',
                                border: `1px solid ${msg.success ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)'}`,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: msg.success ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                                    {msg.success ? '✓' : '✗'}
                                  </span>
                                  <span style={{ color: 'var(--text-primary)' }}>{label}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {msg.error && (
                                    <span title={msg.error} style={{ fontSize: '0.72rem', color: '#F44336', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {msg.error}
                                    </span>
                                  )}
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                    {dateStr}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FINANCEIRO TAB PANEL */}
              {modalTab === 'financeiro' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease', overflowY: 'auto', paddingRight: '4px' }}>
                  {/* RESUMO CARDS */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: '12px' }}>
                    {/* FATURAMENTO */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Faturamento</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamento)}
                      </div>
                    </div>

                    {/* DESCONTO */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(244, 67, 54, 0.15)',
                      borderRadius: '12px',
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 12px rgba(244, 67, 54, 0.03)'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Desconto</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#F44336' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(desconto)}
                      </div>
                    </div>

                    {/* VALOR PAGO */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      borderRadius: '12px',
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 12px rgba(76, 175, 80, 0.03)'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Já Pago</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4CAF50' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPago)}
                      </div>
                    </div>

                    {/* A RECEBER (FALTA PAGAR) */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: `1px solid ${valorRestante > 0 ? 'rgba(255, 213, 79, 0.25)' : 'rgba(76, 175, 80, 0.2)'}`,
                      borderRadius: '12px',
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: `0 2px 12px ${valorRestante > 0 ? 'rgba(255, 213, 79, 0.03)' : 'rgba(76, 175, 80, 0.03)'}`,
                      gridColumn: isMobile ? 'span 2' : 'auto'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Falta Pagar</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: valorRestante > 0 ? '#FFD54F' : '#4CAF50' }}>
                        {valorRestante > 0 
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRestante)
                          : 'Quitado! 🎉'
                        }
                      </div>
                    </div>

                    {/* CUSTOS */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(244, 67, 54, 0.15)',
                      borderRadius: '12px',
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 12px rgba(244, 67, 54, 0.03)',
                      gridColumn: isMobile ? 'span 1' : 'auto'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Custos Totais</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#F44336' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustos)}
                      </div>
                    </div>

                    {/* LUCRO */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(203, 161, 83, 0.2)',
                      borderRadius: '12px',
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 12px rgba(203, 161, 83, 0.03)',
                      gridColumn: isMobile ? 'span 1' : 'auto'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Lucro Líquido</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro)}
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURAÇÃO DE FATURAMENTO E PAGAMENTOS */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '18px' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiDollarSign /> Valores e Pagamento
                    </h4>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      {/* FATURAMENTO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '180px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faturamento Total (R$)</label>
                          <button
                            type="button"
                            onClick={handleImportFromPackage}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: '0' }}
                          >
                            📋 Importar do Pacote
                          </button>
                        </div>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={faturamentoInput}
                          onChange={(e) => setFaturamentoInput(e.target.value)}
                          onBlur={() => handleUpdateFaturamento(faturamentoInput)}
                          style={{
                            background: '#0c1610',
                            border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px',
                            color: '#f0f2ec',
                            padding: '10px 14px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            width: '100%'
                          }}
                        />
                      </div>

                      {/* DESCONTO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '180px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Desconto Concedido (R$)</label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={descontoInput}
                          onChange={(e) => setDescontoInput(e.target.value)}
                          onBlur={() => handleUpdateDesconto(descontoInput)}
                          style={{
                            background: '#0c1610',
                            border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px',
                            color: '#f0f2ec',
                            padding: '10px 14px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            width: '100%'
                          }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '6px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedLead?.financeiro?.aplicarDescontoMaoDeObra || false}
                            onChange={(e) => handleUpdateAplicarDescontoMaoDeObra(e.target.checked)}
                            style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Aplicar desconto na Mão de Obra</span>
                        </label>
                      </div>
                    </div>

                    {/* REGISTRAR NOVO RECEBIMENTO */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.06)', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '12px' }}>💰 Registrar Novo Pagamento Recebido</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '120px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Valor (R$)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newPaymentVal}
                            onChange={(e) => setNewPaymentVal(e.target.value)}
                            style={{
                              background: '#0c1610',
                              border: '1px solid rgba(203, 161, 83, 0.12)',
                              borderRadius: '8px',
                              color: '#f0f2ec',
                              padding: '8px 12px',
                              fontSize: '0.88rem',
                              outline: 'none',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '140px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Forma de Pagamento</label>
                          <select
                            value={newPaymentForma}
                            onChange={(e) => setNewPaymentForma(e.target.value)}
                            style={{
                              background: '#0c1610',
                              border: '1px solid rgba(203, 161, 83, 0.12)',
                              borderRadius: '8px',
                              color: '#f0f2ec',
                              padding: '8px 12px',
                              fontSize: '0.88rem',
                              outline: 'none',
                              width: '100%',
                              height: '35px',
                              cursor: 'pointer'
                            }}
                          >
                            {['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência'].map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleRegisterRecebimento(newPaymentVal, newPaymentForma);
                            setNewPaymentVal('');
                          }}
                          style={{
                            background: 'var(--primary)',
                            border: 'none',
                            color: '#000',
                            fontWeight: 'bold',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            height: '35px'
                          }}
                        >
                          Confirmar Recebimento
                        </button>
                      </div>
                    </div>

                    {/* HISTÓRICO DE RECEBIMENTOS */}
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>Histórico de Lançamentos Recebidos:</div>
                      {selectedLead.financeiro?.recebimentos ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {Object.values(selectedLead.financeiro.recebimentos)
                            .sort((a,b) => new Date(b.data) - new Date(a.data))
                            .map((rec) => (
                              <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                <div style={{ fontSize: '0.82rem' }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.valor)}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    via {rec.formaPagamento} em {new Date(rec.data).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecebimento(rec.id)}
                                  style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', padding: '4px' }}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nenhum pagamento registrado ainda. Use o painel acima para registrar.</span>
                      )}
                    </div>
                  </div>

                  {/* CUSTOS SECTION */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.015)', borderRadius: '12px', padding: '18px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary)', borderBottom: '1px solid rgba(203, 161, 83, 0.06)', paddingBottom: '8px', fontSize: '0.92rem' }}>
                      💸 Lançar Custos do Evento
                    </h4>
                    
                    {/* PRESETS */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>Atalhos de Custos Comuns:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(financeiroPresets).map(([slug, item]) => (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => {
                              const cat = detectCategoryByDescription(item.descricao);
                              setNewCost({ descricao: item.descricao, valor: item.valor.toString(), categoria: cat });
                            }}
                            style={{
                              background: 'rgba(203, 161, 83, 0.04)',
                              border: '1px solid rgba(203, 161, 83, 0.2)',
                              borderRadius: '20px',
                              color: '#f0f2ec',
                              padding: '5px 10px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(203, 161, 83, 0.12)';
                              e.currentTarget.style.borderColor = 'var(--primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(203, 161, 83, 0.04)';
                              e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.2)';
                            }}
                          >
                            <span>{item.descricao}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                              (R$ {item.valor})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ADD COST FORM */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px', width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1.5', minWidth: '160px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📦 Vincular ao Estoque</label>
                        <select
                          value={newCost.itemIdEstoque || ''}
                          onChange={(e) => {
                            const itemId = e.target.value;
                            if (itemId) {
                              const item = estoque.find(i => i.id === itemId);
                              if (item) {
                                const qty = parseFloat(newCost.quantidade) || 1;
                                const uVal = parseFloat(item.custo) || 0;
                                setNewCost(prev => ({
                                  ...prev,
                                  itemIdEstoque: itemId,
                                  descricao: item.nome,
                                  categoria: item.categoria || 'insumos',
                                  valorUnitario: uVal.toString(),
                                  quantidade: prev.quantidade || '1',
                                  valor: (qty * uVal).toFixed(2)
                                }));
                              }
                            } else {
                              setNewCost(prev => ({ ...prev, itemIdEstoque: '', descricao: '', valorUnitario: '', valor: '' }));
                            }
                          }}
                          style={{
                            background: '#0c1610',
                            border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px',
                            color: '#f0f2ec',
                            padding: '10px 12px',
                            fontSize: '0.88rem',
                            outline: 'none',
                            width: '100%',
                            height: '38px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">-- Não vincular --</option>
                          {estoque.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.nome} (estoque: {item.quantidadeAtual} {item.unidade})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '2', minWidth: '180px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Descrição do Custo</label>
                        <input
                          type="text"
                          placeholder="Ex: Barman, Ajudante, Gelo, Copos..."
                          value={newCost.descricao}
                          list="custos-autocomplete-list"
                          onChange={(e) => {
                            const desc = e.target.value;
                            const matchedPreset = Object.values(financeiroPresets).find(
                              p => p.descricao.toLowerCase().trim() === desc.toLowerCase().trim()
                            );
                            if (matchedPreset) {
                              const cat = detectCategoryByDescription(matchedPreset.descricao);
                              setNewCost({
                                descricao: matchedPreset.descricao,
                                valor: matchedPreset.valor.toString(),
                                categoria: cat
                              });
                            } else {
                              const cat = detectCategoryByDescription(desc);
                              setNewCost(prev => ({ ...prev, descricao: desc, categoria: cat }));
                            }
                          }}
                          style={{
                            background: '#0c1610',
                            border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px',
                            color: '#f0f2ec',
                            padding: '10px 12px',
                            fontSize: '0.88rem',
                            outline: 'none',
                            width: '100%'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1.5', minWidth: '140px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categoria</label>
                        <select
                          value={newCost.categoria}
                          onChange={(e) => setNewCost(prev => ({ ...prev, categoria: e.target.value }))}
                          style={{
                            background: '#0c1610',
                            border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px',
                            color: '#f0f2ec',
                            padding: '10px 12px',
                            fontSize: '0.88rem',
                            outline: 'none',
                            width: '100%',
                            height: '38px',
                            cursor: 'pointer'
                          }}
                        >
                          {custosCategorias.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.emoji || '✨'} {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '80px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {newCost.categoria === 'equipe' ? 'Nº Pessoas' : 'Qtd (opcional)'}
                        </label>
                        <input
                          type="number"
                          placeholder={newCost.categoria === 'equipe' ? 'Ex: 3' : '1'}
                          value={newCost.quantidade}
                          onChange={(e) => {
                            const qty = e.target.value;
                            const unit = newCost.valorUnitario;
                            setNewCost(prev => ({
                              ...prev,
                              quantidade: qty,
                              valor: qty && unit ? (parseFloat(qty) * parseFloat(unit)).toFixed(2) : prev.valor
                            }));
                          }}
                          style={{
                            background: '#0c1610', border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px', color: '#f0f2ec', padding: '10px 12px',
                            fontSize: '0.88rem', outline: 'none', width: '100%'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '80px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {newCost.categoria === 'equipe' ? 'Diária / Valor' : 'R$ Unit. (opcional)'}
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newCost.valorUnitario}
                          onChange={(e) => {
                            const unit = e.target.value;
                            const qty = newCost.quantidade;
                            setNewCost(prev => ({
                              ...prev,
                              valorUnitario: unit,
                              valor: qty && unit ? (parseFloat(qty) * parseFloat(unit)).toFixed(2) : prev.valor
                            }));
                          }}
                          style={{
                            background: '#0c1610', border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px', color: '#f0f2ec', padding: '10px 12px',
                            fontSize: '0.88rem', outline: 'none', width: '100%'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '100px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {newCost.categoria === 'equipe' ? 'Custo Total (R$)' : 'Total (R$)'}
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newCost.valor}
                          onChange={(e) => setNewCost(prev => ({ ...prev, valor: e.target.value, quantidade: '', valorUnitario: '' }))}
                          style={{
                            background: '#0c1610', border: '1px solid rgba(203, 161, 83, 0.12)',
                            borderRadius: '8px', color: '#f0f2ec', padding: '10px 12px',
                            fontSize: '0.88rem', outline: 'none', width: '100%'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddCost(newCost.descricao, newCost.valor, newCost.categoria)}
                        style={{
                          background: 'var(--primary)',
                          border: 'none',
                          color: '#000',
                          fontWeight: 'bold',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          minHeight: 40,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FiPlus /> Adicionar
                      </button>

                      <datalist id="custos-autocomplete-list">
                        {Object.values(financeiroPresets).map((preset, idx) => (
                          <option key={`preset-${idx}`} value={preset.descricao} />
                        ))}
                        {custosLista.map((cost, idx) => (
                          <option key={`cost-${idx}-${cost.id}`} value={cost.descricao} />
                        ))}
                      </datalist>
                    </div>

                    {/* COSTS TABLE/LIST */}
                    {custosLista.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                              <th style={{ padding: '8px' }}>Custo</th>
                              <th style={{ padding: '8px' }}>Categoria</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Valor</th>
                              <th style={{ padding: '8px', textAlign: 'center', width: '44px' }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {custosLista.map((custo) => (
                              <tr key={custo.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                                <td style={{ padding: '10px 8px' }}>
                                  <div>{custo.descricao}</div>
                                  {custo.quantidade > 0 && custo.valorUnitario > 0 && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      {custo.quantidade} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custo.valorUnitario)}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                  {(() => {
                                    const catId = custo.categoria || detectCategoryByDescription(custo.descricao);
                                    const matched = custosCategorias.find(c => c.id === catId) || {
                                      label: 'Outros',
                                      color: '#a8b8aa',
                                      emoji: '✨'
                                    };
                                    
                                    const hexToRgb = (hex) => {
                                      const clean = (hex || '#ffffff').replace('#', '');
                                      const r = parseInt(clean.substring(0, 2), 16) || 255;
                                      const g = parseInt(clean.substring(2, 4), 16) || 255;
                                      const b = parseInt(clean.substring(4, 6), 16) || 255;
                                      return `${r}, ${g}, ${b}`;
                                    };
                                    
                                    const rgb = hexToRgb(matched.color);
                                    const bg = `rgba(${rgb}, 0.08)`;
                                    const border = `rgba(${rgb}, 0.25)`;
                                    const color = matched.color;
                                    
                                    return (
                                      <span style={{
                                        background: bg,
                                        border: `1px solid ${border}`,
                                        color: color,
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        fontSize: '0.72rem',
                                        fontWeight: '600',
                                        display: 'inline-block'
                                      }}>
                                        {matched.emoji || '✨'} {matched.label}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500' }}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custo.valor)}
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCost(custo.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#F44336',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: 32,
                                      minHeight: 32
                                    }}
                                    title="Excluir custo"
                                  >
                                    <FiTrash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr style={{ background: 'rgba(255, 255, 255, 0.015)', fontWeight: 'bold' }}>
                              <td colSpan={2} style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Total de Custos</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#F44336' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustos)}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Nenhum custo lançado para este evento ainda.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            
            {/* MODAL FOOTER */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(203, 161, 83, 0.08)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-app)' }}>
              <button 
                onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} 
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  minHeight: 44
                }}
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Novo Lead Manual */}
      {isAddingManual && (
        <div 
          onClick={() => setIsAddingManual(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-main)', width: '100%', maxWidth: '500px',
            borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif' }}>Novo Lead Manual</h2>
              <button onClick={() => setIsAddingManual(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <FiX size={24} />
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <form onSubmit={handleSaveManualLead} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="form-label">Nome *</label>
                    <input type="text" className="form-input" required value={newLeadData.nome} onChange={e => setNewLeadData({...newLeadData, nome: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Sobrenome</label>
                    <input type="text" className="form-input" value={newLeadData.sobrenome} onChange={e => setNewLeadData({...newLeadData, sobrenome: e.target.value})} />
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Telefone/WhatsApp *</label>
                  <input type="text" className="form-input" required value={newLeadData.telefone} onChange={e => setNewLeadData({...newLeadData, telefone: e.target.value})} placeholder="Ex: 32999999999" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="form-label">Data do Evento</label>
                    <input type="date" className="form-input" value={newLeadData.dataEvento} onChange={e => setNewLeadData({...newLeadData, dataEvento: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Horário</label>
                    <input type="time" className="form-input" value={newLeadData.horarioEvento} onChange={e => setNewLeadData({...newLeadData, horarioEvento: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Cidade</label>
                    <input type="text" className="form-input" value={newLeadData.cidade} onChange={e => setNewLeadData({...newLeadData, cidade: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="form-label">Tipo de Evento</label>
                    <input type="text" className="form-input" value={newLeadData.tipoEvento} onChange={e => setNewLeadData({...newLeadData, tipoEvento: e.target.value})} placeholder="Ex: Casamento" />
                  </div>
                  <div>
                    <label className="form-label">Convidados</label>
                    <input type="number" className="form-input" value={newLeadData.convidados} onChange={e => setNewLeadData({...newLeadData, convidados: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="form-label">Pacote de Interesse</label>
                  <select className="form-select" value={newLeadData.pacote} onChange={e => setNewLeadData({...newLeadData, pacote: e.target.value})}>
                    <option value="">Selecione um pacote</option>
                    {pacotes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Cerimonialista Parceiro</label>
                  <select className="form-select" value={newLeadData.cerimonialista} onChange={e => setNewLeadData({...newLeadData, cerimonialista: e.target.value})}>
                    <option value="">— Nenhum / Sem parceiro —</option>
                    {Object.entries(cerimonialistas).map(([slug, c]) => (
                      <option key={slug} value={slug}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setIsAddingManual(false)} className="btn btn--outline" style={{ color: 'var(--text-primary)' }}>Cancelar</button>
                  <button type="submit" className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiPlus size={18} /> Salvar Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ───────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(14, 26, 18, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${
            toast.type === 'success' ? '#4CAF50' : 
            toast.type === 'error' ? '#F44336' : '#FFD54F'
          }`,
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '360px',
          animation: 'slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 
              toast.type === 'success' ? '#4CAF50' : 
              toast.type === 'error' ? '#F44336' : '#FFD54F',
            boxShadow: `0 0 8px ${
              toast.type === 'success' ? '#4CAF50' : 
              toast.type === 'error' ? '#F44336' : '#FFD54F'
            }`,
            flexShrink: 0
          }} />
          <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500', lineHeight: 1.4 }}>
            {toast.message}
          </div>
          <button 
            onClick={() => setToast(null)} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* ── CUSTOM CONFIRM MODAL ─────────────────────────────── */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 10, 6, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(203, 161, 83, 0.15)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.15rem' }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={confirmModal.onCancel}
                className="btn btn--outline"
                style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="btn btn--primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none', color: '#050a06' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SENDING SCRIPT LOADING OVERLAY ───────────────────── */}
      {sendingScript && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 10, 6, 0.8)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="btn__spinner" style={{ width: '50px', height: '50px', borderWidth: '4px', borderColor: 'var(--primary) transparent transparent transparent' }} />
          <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontFamily: 'Cinzel, serif', letterSpacing: '1px' }}>
            Enviando Mensagem...
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Por favor, aguarde a confirmação da API do WhatsApp
          </div>
        </div>
      )}
      {/* ── LIVE LINK PREVIEW OVERLAY MODAL ─────────────────── */}
      {previewUrl && (
        <div 
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', 
              width: previewMode === 'mobile' ? '375px' : '90vw',
              height: previewMode === 'mobile' ? '80vh' : '85vh',
              maxHeight: '90vh',
              borderRadius: '16px', 
              overflow: 'hidden', 
              border: '1px solid rgba(203, 161, 83, 0.2)',
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            {/* PREVIEW HEADER */}
            <div style={{ 
              padding: '12px 18px', 
              borderBottom: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'var(--bg-input)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {previewUrl.includes('barman=true') ? '📋 Preview: Checklist do Barman' : '🍹 Preview: Formulário do Cliente'}
                </span>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                  Ao Vivo (Firebase Link)
                </span>
              </div>

              {/* View mode toggle */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setPreviewMode('mobile')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: previewMode === 'mobile' ? 'var(--primary)' : 'transparent',
                    color: previewMode === 'mobile' ? '#000' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.1s ease'
                  }}
                >
                  📱 Mobile
                </button>
                <button 
                  onClick={() => setPreviewMode('desktop')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: previewMode === 'desktop' ? 'var(--primary)' : 'transparent',
                    color: previewMode === 'desktop' ? '#000' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.1s ease'
                  }}
                >
                  💻 Desktop
                </button>
              </div>

              {/* Header Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewUrl);
                    showToast('Link copiado para a área de transferência!', 'success');
                  }}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    height: 'auto',
                    minHeight: 'auto'
                  }}
                >
                  Copiar Link
                </button>
                <button 
                  onClick={() => setPreviewUrl(null)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s'
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* PREVIEW FRAME */}
            <div style={{ flex: 1, background: '#000', position: 'relative' }}>
              <iframe
                src={previewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'var(--bg-main)'
                }}
                title="Live Link Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
