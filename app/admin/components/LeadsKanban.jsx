import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiPhone, FiCalendar, FiMapPin, FiClock, FiX, FiTrash2, FiHeart, FiPlus, FiList, FiColumns, FiChevronLeft, FiChevronRight, FiEye, FiEdit2, FiSave, FiCheck, FiUsers, FiPackage } from 'react-icons/fi';
import { sendWhatsAppQuote, logMessageToLead } from '../../../lib/whatsappService';

const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: '#00E5FF' },
  { id: 'negociacao', title: 'Em Negociação', color: '#FFD54F' },
  { id: 'fechado', title: 'Fechado (Ganho)', color: '#4CAF50' },
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

export default function LeadsKanban() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [drinksMenu, setDrinksMenu] = useState({});
  const [pacotes, setPacotes] = useState([]);
  const [ajudantes, setAjudantes] = useState({});
  
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
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'equipe' | 'drinks' | 'scripts'

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [itemsPerPage, setItemsPerPage] = useState('20');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(false);

  // Auto reset tab when selecting a different lead
  useEffect(() => {
    if (selectedLead) {
      setModalTab('info');
    }
  }, [selectedLead?.id]);

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
      alert('Nome e Telefone são obrigatórios.');
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
      alert('Lead criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar lead:', err);
      alert('Erro ao criar lead manualmente.');
    }
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
      alert("Erro ao atualizar o status.");
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
    if (window.confirm("Tem certeza que deseja excluir este lead permanentemente? Essa ação não pode ser desfeita.")) {
      try {
        await remove(ref(db, `leads/${leadId}`));
        setSelectedLead(null);
      } catch (error) {
        console.error("Erro ao excluir lead:", error);
        alert("Erro ao excluir o lead.");
      }
    }
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
      alert('Erro ao salvar alterações.');
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
    if (!window.confirm("Remover este ajudante do evento?")) return;
    const path = `leads/${selectedLead.id}/ajudantes/${helperSlug}`;
    await remove(ref(db, path));
    setSelectedLead(prev => {
      const copy = { ...(prev.ajudantes || {}) };
      delete copy[helperSlug];
      return { ...prev, ajudantes: copy };
    });
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
      alert("Erro ao atualizar status do ajudante: " + err.message);
    }
  };

  const handleSendHelperAvailabilityCheck = async (helperSlug, helperInfo) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      alert('A API do WhatsApp não está configurada corretamente.');
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
      alert(`Mensagem de disponibilidade enviada com sucesso para ${helperInfo.nome}!`);
    } catch (err) {
      console.error('Erro ao enviar mensagem para ajudante:', err);
      alert(`Erro ao enviar mensagem: ${err.message}`);
      await logMessageToLead(selectedLead.id, `availability_check_${helperSlug}`, '55' + helperInfo.telefone.replace(/\D/g, ''), false, err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const handleSendHelperFinalConfirmation = async () => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      alert('A API do WhatsApp não está configurada corretamente.');
      return;
    }
    
    const assignedHelpers = selectedLead.ajudantes || {};
    const confirmedHelpersSlugs = Object.entries(assignedHelpers)
      .filter(([_, value]) => value.status === 'confirmado')
      .map(([slug, _]) => slug);
      
    if (confirmedHelpersSlugs.length === 0) {
      alert('Nenhum ajudante confirmado para este evento.');
      return;
    }
    
    if (!window.confirm(`Enviar confirmação final para os ${confirmedHelpersSlugs.length} ajudantes confirmados?`)) {
      return;
    }
    
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
      
      alert(`Confirmação enviada com sucesso para ${successCount} de ${confirmedHelpersSlugs.length} ajudantes!`);
    } catch (err) {
      console.error('Erro na confirmação final:', err);
    } finally {
      setSendingScript(false);
    }
  };

  const handleSendEvolution = async (scriptType) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      alert("A API Evolution não está configurada corretamente. Vá até a aba 'Pacotes & Drinks' > 'Scripts de Vendas' para configurar.");
      return;
    }
    
    const scriptConfig = scripts?.[scriptType];
    if (!scriptConfig || !scriptConfig.text) {
      alert("O texto deste script não está configurado. Vá até as configurações para escrevê-lo.");
      return;
    }

    if (!window.confirm("Deseja enviar essa mensagem automaticamente pelo WhatsApp agora?")) {
      return;
    }

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

      // Substituir variáveis
      let finalText = scriptConfig.text
        .replace(/\{\{nome\}\}/g, selectedLead.nome || '')
        .replace(/\{\{pacote\}\}/g, selectedLead.pacote || '')
        .replace(/\{\{dataEvento\}\}/g, selectedLead.dataEvento || '')
        .replace(/\{\{mes\}\}/g, mesNome)
        .replace(/\{\{ano\}\}/g, anoEvento)
        .replace(/\{\{cidade\}\}/g, selectedLead.cidade || '')
        .replace(/\{\{linkAvaliacao\}\}/g, linkAvaliacao);

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
      alert("Mensagem enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      await logMessageToLead(selectedLead.id, `script_${scriptType}`, '55' + selectedLead.telefone.replace(/\D/g, ''), false, err.message);
      alert("Erro ao enviar. Se você colocou um link na imagem, ele DEVE terminar em .jpg ou .png (ser um link direto da foto). Detalhes do erro: " + err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const handleSendShoppingListViaApi = async (lead) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      alert("A API Evolution não está configurada corretamente.");
      return;
    }
    
    if (!window.confirm("Deseja enviar o link da lista de compras automaticamente pelo WhatsApp via API agora?")) {
      return;
    }

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
      alert("Link da lista de compras enviado com sucesso via API!");
    } catch (err) {
      console.error("Erro ao enviar link da lista:", err);
      await logMessageToLead(lead.id, 'lista_compras', '55' + lead.telefone.replace(/\D/g, ''), false, err.message);
      alert("Erro ao enviar. Detalhes: " + err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const handleResendQuote = async (lead) => {
    if (!window.confirm("Deseja reenviar o orçamento deste lead via WhatsApp?")) {
      return;
    }
    setSendingScript(true);
    try {
      const result = await sendWhatsAppQuote(lead, pacotes, lead.id);
      if (result) {
        alert("Orçamento reenviado com sucesso!");
      } else {
        alert("Falha ao reenviar o orçamento. Verifique as configurações da API WhatsApp.");
      }
    } catch (err) {
      console.error("Erro ao reenviar orçamento:", err);
      alert("Erro ao reenviar: " + err.message);
    } finally {
      setSendingScript(false);
    }
  };

  const getLeadsByStatus = (statusId) => {
    return leads.filter(l => (l.status || 'novo') === statusId);
  };

  const totalLeads = leads.length;
  const fechadosCount = getLeadsByStatus('fechado').length;
  const conversao = totalLeads > 0 ? Math.round((fechadosCount / totalLeads) * 100) : 0;

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
          <div className="admin-stats" style={{ display: 'flex', gap: '16px', background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-around' : 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFF' }}>{totalLeads}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Leads</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>{fechadosCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fechados</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{conversao}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conversão</div>
          </div>
        </div>
      </div>
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
                  e.currentTarget.style.background = '#222'; // Efeito visual ao arrastar por cima
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.background = '#1A1A1A'; // Remove efeito
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = '#1A1A1A';
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (leadId) {
                    handleStatusChange(leadId, col.id);
                  }
                }}
                className="admin-kanban-col"
                style={{ 
                  minWidth: '300px', flex: 1, background: '#1A1A1A', borderRadius: '12px', padding: '16px',
                  display: 'flex', flexDirection: 'column', borderTop: `4px solid ${col.color}`,
                  transition: 'background 0.2s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#FFF' }}>{col.title}</h3>
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                    {colLeads.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {colLeads.map(lead => {
                    let isStale = false;
                    if ((!lead.status || lead.status === 'novo' || lead.status === 'negociacao') && lead.criadoEm) {
                      const createdTime = new Date(lead.criadoEm).getTime();
                      // 48 horas = 172800000 ms
                      if (Date.now() - createdTime > 172800000) {
                        isStale = true;
                      }
                    }

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
                          background: 'var(--bg-input)', padding: '16px', borderRadius: '8px',
                          cursor: isMobile ? 'pointer' : 'grab', border: isStale ? '1px solid #F44336' : '1px solid var(--border-color)',
                          transition: 'border-color 0.2s', ':hover': { borderColor: 'var(--primary)' }
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px', color: '#FFF', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{lead.nome} {lead.sobrenome}</span>
                          {isStale && <span title="Lead parado há mais de 48h!" style={{ fontSize: '0.8rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>🔥 Esfriando</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <FiCalendar /> {lead.dataEvento || 'Data não inf.'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiMapPin /> {lead.cidade}
                        </div>
                        
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(203, 161, 83, 0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>
                            {lead.pacote}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {lead.convidados} conv.
                          </span>
                        </div>

                        {/* Badge cerimonialista */}
                        {lead.cerimonialista && cerimonialistas[lead.cerimonialista] && (
                          <div style={{
                            marginTop: 8, fontSize: '0.75rem', color: '#E91E63',
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'rgba(233,30,99,0.08)', padding: '2px 6px',
                            borderRadius: 4, border: '1px solid rgba(233,30,99,0.2)'
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
                                color: '#FFF',
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
                  <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let filteredLeads = leads;
                  if (statusFilter !== 'all') {
                    // Trata leads sem status explícito como 'novo'
                    filteredLeads = leads.filter(l => (l.status || 'novo') === statusFilter);
                  }

                  const limit = itemsPerPage === 'all' ? filteredLeads.length : parseInt(itemsPerPage, 10);
                  const totalPages = Math.ceil(filteredLeads.length / limit) || 1;
                  const startIndex = (currentPage - 1) * limit;
                  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + limit);

                  if (paginatedLeads.length === 0) {
                    return <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum lead encontrado.</td></tr>;
                  }

                  return paginatedLeads.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                      <td style={{ padding: '12px 16px', color: '#FFF' }}>{lead.nome} {lead.sobrenome}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.telefone}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.dataEvento || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--primary)' }}>{lead.pacote || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select 
                          value={lead.status || 'novo'} 
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', border: 'none', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          style={{ background: 'none', border: '1px solid var(--border-color)', color: '#FFF', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        >
                          <FiEye size={14} /> Detalhes
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {itemsPerPage !== 'all' && (() => {
            const totalFilteredLeads = statusFilter === 'all' ? leads.length : leads.filter(l => (l.status || 'novo') === statusFilter).length;
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
              background: '#0a140d', width: '100%', maxWidth: isMobile ? '100%' : '680px',
            borderRadius: isMobile ? '20px 20px 0 0' : '16px', overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.25)',
            maxHeight: isMobile ? '95vh' : '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.7)',
            animation: isMobile ? 'slideUp 0.3s ease' : 'fadeInUp 0.3s ease',
            borderBottom: isMobile ? 'none' : undefined
          }}>
            {/* HEADER */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(203, 161, 83, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#070e09' }}>
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
                <button onClick={() => handleDeleteLead(selectedLead.id)} title="Excluir Lead" style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 36, justifyContent: 'center' }}>
                  <FiTrash2 size={18} />
                </button>
                <button onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 36, justifyContent: 'center' }}>
                  <FiX size={22} />
                </button>
              </div>
            </div>
            
            {/* TABS SELECTOR */}
            <div style={{ 
              display: 'flex', 
              background: '#070e09', 
              borderBottom: '1px solid rgba(203, 161, 83, 0.12)',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {[
                { id: 'info', label: isMobile ? 'Cadastro' : 'Cadastro', icon: FiList },
                { id: 'equipe', label: isMobile ? 'Equipe' : 'Equipe / Escala', icon: FiUsers },
                { id: 'drinks', label: isMobile ? 'Bebidas' : 'Bebidas & Lista', icon: FiPackage },
                { id: 'scripts', label: isMobile ? 'WhatsApp' : 'Ações WhatsApp', icon: FiPhone }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    style={{
                      flex: isMobile ? 'none' : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? '5px' : '8px',
                      padding: isMobile ? '14px 14px' : '14px 16px',
                      background: isActive ? 'rgba(203, 161, 83, 0.05)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      border: 'none',
                      borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.78rem' : '0.85rem',
                      fontWeight: isActive ? 'bold' : 'normal',
                      transition: 'all 0.2s',
                      outline: 'none',
                      minWidth: isMobile ? 'auto' : '120px',
                      minHeight: '48px',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
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
                background: '#070e09', 
                borderRadius: '10px', 
                padding: '12px 16px', 
                marginBottom: '20px', 
                border: '1px solid rgba(203, 161, 83, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FFF' }}>
                    {selectedLead.nome} {selectedLead.sobrenome || ''}
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
                        background: '#050a06', 
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
                  {/* Call WhatsApp shortcut */}
                  <div style={{ display: 'flex', gap: '12px' }}>
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
                  </div>

                  {/* Cerimonialista Parceiro */}
                  <div style={{ background: '#070e09', borderRadius: '10px', padding: '16px', border: '1px solid rgba(203, 161, 83, 0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
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
                          background: '#050a06', 
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
                  <div style={{ background: '#070e09', borderRadius: '10px', padding: '20px', border: '1px solid rgba(203, 161, 83, 0.12)' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#FFF', fontSize: '0.92rem', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '8px' }}>
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
                </div>
              )}

              {/* 👥 TAB 2: STAFF & SCHEDULES */}
              {modalTab === 'equipe' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
                  {/* Event Team management */}
                  <div style={{ background: '#070e09', borderRadius: '10px', padding: '18px', border: '1px solid rgba(203, 161, 83, 0.12)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: '#FFF', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                            color: '#FFF', 
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
                          background: '#050a06', 
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
                              alert(`Atenção: Este ajudante já está escalado no mesmo dia em: ${overlap}`);
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
                                  <div style={{ fontWeight: 600, color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
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
                      O cliente receberá um link para escolher os drinks e o sistema calculará os insumos.
                    </p>
                    
                    {selectedLead.shoppingListFinalizada ? (
                      <div style={{ padding: '10px 12px', background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '6px', color: '#4CAF50', fontSize: '0.85rem' }}>
                        ✅ <strong>O cliente já finalizou a lista!</strong> Insumos calculados e listados abaixo.
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
                          minHeight: 40,
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}
                      >
                        <FiPhone /> Enviar Link da Lista via API WhatsApp
                      </button>
                    )}
                  </div>

                  {/* Chosen drinks */}
                  <div style={{ background: '#070e09', borderRadius: '10px', padding: '20px', border: '1px solid rgba(203, 161, 83, 0.12)' }}>
                    <h4 style={{ margin: '0 0 14px 0', color: '#FFF', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '8px', fontSize: '0.92rem' }}>
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
                    <div style={{ background: '#070e09', borderRadius: '10px', padding: '20px', border: '1px solid rgba(76, 175, 80, 0.15)', borderLeft: '4px solid #4CAF50' }}>
                      <h4 style={{ margin: '0 0 14px 0', color: '#4CAF50', borderBottom: '1px solid rgba(76, 175, 80, 0.1)', paddingBottom: '8px', fontSize: '0.92rem' }}>
                        🛒 Detalhes dos Insumos (Lista Calculada)
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                        {selectedLead.shoppingListResult.insumos && Object.keys(selectedLead.shoppingListResult.insumos).length > 0 && (
                          <div>
                            <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Insumos e Bebidas:</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                              {Object.entries(selectedLead.shoppingListResult.insumos).map(([insumo, qtd]) => (
                                <div key={insumo} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{insumo}</span>
                                  <strong style={{ color: 'var(--primary)' }}>{qtd}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedLead.shoppingListResult.fixos && selectedLead.shoppingListResult.fixos.length > 0 && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                            <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Itens Fixos / Descartáveis:</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                              {selectedLead.shoppingListResult.fixos.map((item, idx) => (
                                <div key={idx} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{item.nome}</span>
                                  <strong style={{ color: 'var(--primary)' }}>{item.quantidade} {item.unidade}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 💬 TAB 4: SCRIPTS & MESSAGES HISTORY */}
              {modalTab === 'scripts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>
                  
                  {/* WhatsApp actions */}
                  <div style={{ background: '#070e09', borderRadius: '10px', padding: '18px', border: '1px solid rgba(203, 161, 83, 0.12)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#FFF', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '8px', fontSize: '0.92rem' }}>
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
                          borderRadius: '8px', minHeight: 40
                        }}
                      >
                        <FiPhone size={14} /> Reenviar PDF de Orçamento (Completo)
                      </button>

                      {/* Script 1: Autoridade */}
                      <button 
                        onClick={() => handleSendEvolution('autoridade')}
                        disabled={sendingScript}
                        style={{ 
                          textAlign: 'left', fontSize: '0.85rem', padding: '10px 14px', 
                          color: '#FFF', border: '1px solid rgba(203, 161, 83, 0.2)', 
                          background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 40
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
                          color: '#FFF', border: '1px solid rgba(203, 161, 83, 0.2)', 
                          background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 40
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
                          color: '#FFF', border: '1px solid rgba(203, 161, 83, 0.2)', 
                          background: 'rgba(255,255,255,0.02)', cursor: sendingScript ? 'not-allowed' : 'pointer',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', minHeight: 40
                        }}
                      >
                        <span style={{ color: '#4CAF50', marginRight: '8px', fontWeight: 'bold' }}>⭐ 3. NPS / Pós:</span>
                        Mensagem pós-evento (feedback/avaliação).
                      </button>
                    </div>
                  </div>

                  {/* Message history */}
                  {selectedLead.messages && (
                    <div style={{ background: '#070e09', borderRadius: '10px', padding: '18px', border: '1px solid rgba(0, 229, 255, 0.15)', borderLeft: '4px solid #00E5FF' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#00E5FF', borderBottom: '1px solid rgba(0, 229, 255, 0.1)', paddingBottom: '8px', fontSize: '0.92rem' }}>
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
                                  <span style={{ color: '#FFF' }}>{label}</span>
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

            </div>
            
            {/* MODAL FOOTER */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(203, 161, 83, 0.15)', display: 'flex', justifyContent: 'flex-end', background: '#070e09' }}>
              <button 
                onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} 
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFF',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
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
              <button onClick={() => setIsAddingManual(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
                  <button type="button" onClick={() => setIsAddingManual(false)} className="btn btn--outline" style={{ color: '#FFF' }}>Cancelar</button>
                  <button type="submit" className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiPlus size={18} /> Salvar Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
