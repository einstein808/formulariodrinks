"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FiColumns, FiList, FiPlus, FiCalendar, FiMapPin, FiCopy, FiExternalLink, FiX } from 'react-icons/fi';
import { ref, update } from 'firebase/database';
import { db } from '../../../../lib/firebase';
import { cleanPhoneForWhatsApp } from '../../../../lib/utils';
import { choosePrimaryLead, findLeadDuplicateGroups, mergeLeadData } from '../../../../lib/leadDeduplication';
import { COLUMNS } from '../../../../lib/constants';
import { filterLeads, hasCustosLancados } from './filters';
import { useToast } from '../../../../hooks/useToast';
import { useConfirm } from '../../../../hooks/useConfirm';
import Toast from '../../../../components/ui/Toast';
import ConfirmModal from '../../../../components/ui/ConfirmModal';

import { useLeadsData } from './hooks/useLeadsData';
import { useLeadOperations } from './hooks/useLeadOperations';
import { useFinanceiroActions } from './hooks/useFinanceiroActions';
import { useEquipeActions } from './hooks/useEquipeActions';
import { useShoppingListActions } from './hooks/useShoppingListActions';
import { useWhatsAppActions } from './hooks/useWhatsAppActions';

import KanbanView from './views/KanbanView';
import TableView from './views/TableView';
import LeadDetailModal from './modals/LeadDetailModal';
import AddLeadModal from './modals/AddLeadModal';
import MediaPreviewModal from './modals/MediaPreviewModal';
import { sendWhatsAppQuote, generateWhatsAppQuote, logMessageToLead } from '../../../../lib/whatsappService';

export default function LeadsKanban() {
  const { toast, showToast, hideToast } = useToast();
  const { confirmModal, showConfirm } = useConfirm();

  const {
    leads,
    setLeads,
    loading,
    cerimonialistas,
    drinksMenu,
    pacotes,
    ajudantes,
    estoque,
    financeiroPresets,
    custosCategorias,
    evolutionApi,
    scripts,
    generalConfigs
  } = useLeadsData();

  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nome: '', sobrenome: '', telefone: '', dataEvento: '', horarioEvento: '', cidade: '',
    convidados: '', tipoEvento: '', pacote: '', cerimonialista: ''
  });
  const [isEditingLead, setIsEditingLead] = useState(false);

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [showDuplicateReview, setShowDuplicateReview] = useState(false);
  const [manualQuote, setManualQuote] = useState(null);
  const [manualQuoteCopied, setManualQuoteCopied] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState('20');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPacote, setFilterPacote] = useState('');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterMinVal, setFilterMinVal] = useState('');
  const [filterMaxVal, setFilterMaxVal] = useState('');
  const [filterSemCustos, setFilterSemCustos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [sendingScript, setSendingScript] = useState(false);

  // Shopping list editing state
  const [isEditingShoppingList, setIsEditingShoppingList] = useState(false);
  const [editedShoppingList, setEditedShoppingList] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');

  // Financial inputs state
  const [faturamentoInput, setFaturamentoInput] = useState('');
  const [descontoInput, setDescontoInput] = useState('');
  const [newCost, setNewCost] = useState({ descricao: '', valor: '', quantidade: '', valorUnitario: '', categoria: 'insumos', itemIdEstoque: '' });

  const lastModalRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync financial inputs when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      setFaturamentoInput(selectedLead.financeiro?.faturamento ?? '');
      setDescontoInput(selectedLead.financeiro?.desconto ?? '');
      setIsEditingShoppingList(false);
      setEditedShoppingList(null);
      setModalSearchTerm('');
      setModalCategoryFilter('all');
    }
  }, [selectedLead?.id, selectedLead?.financeiro?.faturamento, selectedLead?.financeiro?.desconto]);

  // Modal browser history popstate handlers
  useEffect(() => {
    if (isAddingManual && lastModalRef.current !== 'addLead') {
      window.history.pushState({ modal: 'addLead' }, '');
      lastModalRef.current = 'addLead';
    } else if (!isAddingManual && lastModalRef.current === 'addLead') {
      lastModalRef.current = null;
      if (window.history.state?.modal === 'addLead') {
        window.history.back();
      }
    }

    if (selectedLead && lastModalRef.current !== 'leadDetail') {
      window.history.pushState({ modal: 'leadDetail' }, '');
      lastModalRef.current = 'leadDetail';
    } else if (!selectedLead && lastModalRef.current === 'leadDetail') {
      lastModalRef.current = null;
      if (window.history.state?.modal === 'leadDetail') {
        window.history.back();
      }
    }
  }, [selectedLead, isAddingManual]);

  useEffect(() => {
    const handlePopState = (e) => {
      const targetModal = e.state?.modal || null;
      lastModalRef.current = targetModal;
      if (isAddingManual && targetModal !== 'addLead') setIsAddingManual(false);
      if (selectedLead && targetModal !== 'leadDetail') setSelectedLead(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedLead, isAddingManual]);

  // Hook Actions
  const leadOps = useLeadOperations({
    leads,
    setLeads,
    selectedLead,
    setSelectedLead,
    cerimonialistas,
    evolutionApi,
    showToast,
    showConfirm,
    setIsAddingManual,
    setNewLeadData,
    setIsEditingLead
  });

  const finActions = useFinanceiroActions({
    selectedLead,
    setSelectedLead,
    setLeads,
    pacotes,
    estoque,
    newCost,
    setNewCost,
    setFaturamentoInput,
    showToast,
    showConfirm
  });

  const equipeActions = useEquipeActions({
    leads,
    selectedLead,
    setSelectedLead,
    ajudantes,
    evolutionApi,
    generalConfigs,
    setSendingScript,
    showToast,
    showConfirm
  });

  const shoppingActions = useShoppingListActions({
    selectedLead,
    setSelectedLead,
    isEditingShoppingList,
    setIsEditingShoppingList,
    editedShoppingList,
    setEditedShoppingList,
    showToast
  });

  const waActions = useWhatsAppActions({
    selectedLead,
    evolutionApi,
    scripts,
    generalConfigs,
    setSendingScript,
    showToast,
    showConfirm
  });

  const handleResendQuote = async (lead) => {
    showConfirm("Deseja reenviar o orçamento deste lead via WhatsApp?", async () => {
      setSendingScript(true);
      try {
        const result = await sendWhatsAppQuote(lead, pacotes, lead.id);
        if (result?.success) {
          showToast("Orçamento reenviado com sucesso!", "success");
        } else {
          if (result?.message) {
            setManualQuote({ lead, message: result.message, error: result.error || 'A API não concluiu o envio.', status: 'failed' });
            setManualQuoteCopied(false);
          } else {
            showToast("Falha ao gerar a mensagem do orçamento. Tente novamente.", "error");
          }
        }
      } catch (err) {
        console.error("Erro ao reenviar orçamento:", err);
        showToast("Erro ao reenviar: " + err.message, "error");
      } finally {
        setSendingScript(false);
      }
    }, "Reenviar Orçamento");
  };

  const handlePrepareManualQuote = async (lead) => {
    setSendingScript(true);
    try {
      const result = await generateWhatsAppQuote(lead, pacotes);
      let copied = false;
      try {
        await navigator.clipboard.writeText(result.message);
        copied = true;
      } catch (clipboardError) {
        console.warn('Clipboard indisponível; mensagem mostrada para cópia manual.', clipboardError);
      }
      setManualQuote({ lead, message: result.message, status: 'ready' });
      setManualQuoteCopied(copied);
      showToast(copied ? 'Orçamento copiado. Você já pode colar no WhatsApp.' : 'Orçamento pronto. Toque em “Copiar mensagem” ou selecione o texto.', copied ? 'success' : 'info');
    } catch (error) {
      console.error('Erro ao preparar orçamento para envio manual:', error);
      showToast('Não foi possível preparar a mensagem do orçamento.', 'error');
    } finally {
      setSendingScript(false);
    }
  };

  const handleCopyManualQuote = async () => {
    if (!manualQuote?.message) return;
    try {
      await navigator.clipboard.writeText(manualQuote.message);
      setManualQuoteCopied(true);
      showToast('Mensagem do orçamento copiada.', 'success');
    } catch (error) {
      console.error('Falha ao copiar orçamento:', error);
      showToast('Não foi possível copiar automaticamente. Selecione o texto e copie.', 'error');
    }
  };

  const handleSendShoppingListViaApi = async (lead) => {
    if (!evolutionApi?.url || !evolutionApi?.instance || !evolutionApi?.apikey) {
      showToast("A API do WhatsApp não está configurada.", "warning");
      return;
    }
    showConfirm("Enviar o link da lista de compras por WhatsApp?", async () => {
      setSendingScript(true);
      try {
        const baseSiteUrl = generalConfigs?.siteUrl 
          ? (generalConfigs.siteUrl.endsWith('/') ? generalConfigs.siteUrl.slice(0, -1) : generalConfigs.siteUrl)
          : window.location.origin;
        const link = `${baseSiteUrl}/lista-compras/${lead.id}`;
        const text = `Olá *${lead.nome}*! 🍹 Acesse o link abaixo para visualizar a lista de compras e selecionar os drinks do seu evento:\n\n${link}`;
        const number = '55' + lead.telefone.replace(/\D/g, '');
        const baseUrl = evolutionApi.url.endsWith('/') ? evolutionApi.url.slice(0, -1) : evolutionApi.url;

        const response = await fetch(`${baseUrl}/message/sendText/${evolutionApi.instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionApi.apikey },
          body: JSON.stringify({ number, text, linkPreview: false })
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        await logMessageToLead(lead.id, 'lista_compras', number, true);
        showToast("Link da lista de compras enviado com sucesso via WhatsApp!", "success");
      } catch (err) {
        console.error("Erro ao enviar link da lista:", err);
        await logMessageToLead(lead.id, 'lista_compras', '55' + lead.telefone.replace(/\D/g, ''), false, err.message);
        showToast("Erro ao enviar: " + err.message, "error");
      } finally {
        setSendingScript(false);
      }
    }, "Enviar Lista de Compras");
  };

  // Filter calculations
  const filteredLeads = filterLeads(leads, {
    filterSearch,
    statusFilter,
    filterMonth,
    filterPacote,
    filterCidade,
    filterMinVal,
    filterMaxVal,
    filterSemCustos
  });
  const duplicateGroups = findLeadDuplicateGroups(leads);

  const handleMergeDuplicateGroup = (group) => {
    const primary = choosePrimaryLead(group.leads);
    if (!primary) return;
    const secondaryLeads = group.leads.filter(lead => lead.id !== primary.id);
    const names = secondaryLeads.map(lead => `${lead.nome || ''} ${lead.sobrenome || ''}`.trim()).filter(Boolean);

    showConfirm(
      `Manteremos “${primary.nome || 'Lead principal'}” como registro principal, juntaremos os históricos e dados financeiros e marcaremos ${secondaryLeads.length} registro(s) como incorporado(s). Os IDs antigos serão preservados para não quebrar links e documentos.`,
      async () => {
        try {
          const merged = secondaryLeads.reduce((current, lead) => mergeLeadData(current, lead), primary);
          merged.atualizadoEm = new Date().toISOString();
          const updates = { [`leads/${primary.id}`]: merged };
          const mergedAt = new Date().toISOString();
          secondaryLeads.forEach(lead => {
            updates[`leads/${lead.id}/mergedInto`] = primary.id;
            updates[`leads/${lead.id}/mergedAt`] = mergedAt;
          });

          await update(ref(db), updates);
          setLeads(current => [
            ...current.filter(lead => !secondaryLeads.some(secondary => secondary.id === lead.id) && lead.id !== primary.id),
            { ...primary, ...merged }
          ]);
          showToast(`${secondaryLeads.length} duplicata(s) consolidada(s)${names.length ? `: ${names.join(', ')}` : ''}.`, 'success');
        } catch (error) {
          console.error('Erro ao consolidar duplicatas:', error);
          showToast('Não foi possível consolidar estes leads. Nenhum registro foi removido.', 'error');
        }
      },
      'Consolidar leads duplicados'
    );
  };

  const getLeadsByStatus = (statusId) => {
    let filtered = leads.filter(l => (l.status || 'novo') === statusId);
    filtered = filterLeads(filtered, {
      filterSearch,
      statusFilter: 'all',
      filterMonth,
      filterPacote,
      filterCidade,
      filterMinVal,
      filterMaxVal,
      filterSemCustos
    });
    if (statusId === 'fechado' || statusId === 'realizado') {
      return [...filtered].sort((a, b) => {
        const dateA = a.dataEvento ? new Date(a.dataEvento) : new Date(8640000000000000);
        const dateB = b.dataEvento ? new Date(b.dataEvento) : new Date(8640000000000000);
        return statusId === 'realizado' ? dateB - dateA : dateA - dateB;
      });
    }
    return filtered;
  };

  const totalLeads = leads.length;
  const fechadosCount = leads.filter(l => l.status === 'fechado' || l.status === 'realizado').length;
  const conversao = totalLeads > 0 ? Math.round((fechadosCount / totalLeads) * 100) : 0;
  const activeFilterCount = [filterSearch, filterMonth, filterPacote, filterCidade, filterMinVal, filterMaxVal, filterSemCustos].filter(Boolean).length;
  const semCustosTotalCount = leads.filter(l => (l.status === 'fechado' || l.status === 'realizado') && !hasCustosLancados(l)).length;

  const uniquePacotes = [...new Set(leads.map(l => l.pacote).filter(Boolean))].sort();
  const uniqueCidades = [...new Set(leads.map(l => l.cidade).filter(Boolean))].sort();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div>
      {/* HEADER */}
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

          {/* Stats Bar */}
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

      {duplicateGroups.length > 0 && (
        <section className="admin-duplicate-review" aria-label="Revisão de possíveis leads duplicados">
          <div className="admin-duplicate-review-header">
            <div>
              <h2>Possíveis duplicados <span>{duplicateGroups.length}</span></h2>
              <p>Mesmo telefone e mesma data completa do evento. Eventos em outros anos ficam separados.</p>
            </div>
            <button type="button" className="btn btn--outline" onClick={() => setShowDuplicateReview(value => !value)} aria-expanded={showDuplicateReview}>
              {showDuplicateReview ? 'Fechar revisão' : 'Revisar leads'}
            </button>
          </div>
          {showDuplicateReview && (
            <div className="admin-duplicate-review-list">
              {duplicateGroups.map(group => {
                const primary = choosePrimaryLead(group.leads);
                return (
                  <article className="admin-duplicate-group" key={group.identity}>
                    <div className="admin-duplicate-group-records">
                      {group.leads.map(lead => (
                        <div key={lead.id} className="admin-duplicate-record">
                          <strong>{lead.nome} {lead.sobrenome || ''}</strong>
                          <span>{lead.telefone} · {lead.dataEvento}</span>
                          <small>{lead.status || 'novo'}{lead.pacote ? ` · ${lead.pacote}` : ''}{lead.id === primary?.id ? ' · registro principal sugerido' : ''}</small>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn--primary" onClick={() => handleMergeDuplicateGroup(group)}>
                      Consolidar {group.leads.length - 1} duplicata(s)
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PRÓXIMOS EVENTOS WIDGET */}
      {(() => {
        const proximosEventos = leads.filter(l => {
          if (!l.dataEvento || (l.status !== 'fechado' && l.status !== 'realizado')) return false;
          const evDate = new Date(l.dataEvento + 'T00:00:00');
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((evDate - now) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        }).sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));

        if (proximosEventos.length === 0) return null;

        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.12), rgba(10, 15, 11, 0.95))',
            border: '1px solid rgba(203, 161, 83, 0.35)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎉</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  Próximos Eventos da Semana ({proximosEventos.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Próximos 7 dias</span>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '6px',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
              {proximosEventos.map(ev => {
                const evDate = new Date(ev.dataEvento + 'T00:00:00');
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((evDate - now) / (1000 * 60 * 60 * 24));
                const helperCount = ev.ajudantes ? Object.values(ev.ajudantes).filter(a => (typeof a === 'object' ? a.status : a) === 'confirmado').length : 0;
                const semCustos = !hasCustosLancados(ev);

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedLead(ev)}
                    style={{
                      minWidth: '220px',
                      background: 'rgba(5, 10, 6, 0.75)',
                      border: '1px solid rgba(203, 161, 83, 0.25)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {ev.nome} {ev.sobrenome || ''}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: diffDays === 0 ? '#E91E63' : (diffDays === 1 ? '#FF9800' : 'rgba(203, 161, 83, 0.2)'),
                        color: '#FFF'
                      }}>
                        {diffDays === 0 ? 'HOJE!' : (diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiCalendar size={11} /> {ev.dataEvento.split('-').reverse().join('/')} {ev.horarioEvento ? `às ${ev.horarioEvento}` : ''}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiMapPin size={11} /> {ev.cidade || 'Juiz de Fora'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: helperCount > 0 ? '#4CAF50' : '#FFD54F', fontWeight: 'bold' }}>
                        👥 {helperCount} ajudante(s)
                      </span>
                      {semCustos && (
                        <span style={{ fontSize: '0.68rem', color: '#FF9800', background: 'rgba(255, 152, 0, 0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                          ⚠️ Sem custos
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* FILTER BUTTONS & TOOLBAR */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowFilters(s => !s)}
          className="btn btn--outline"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem', width: 'auto' }}
        >
          🔍 Filtros Avançados {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>

        {semCustosTotalCount > 0 && (
          <button
            onClick={() => setFilterSemCustos(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: filterSemCustos ? 'rgba(255, 152, 0, 0.25)' : 'rgba(255, 152, 0, 0.1)',
              border: `1px solid ${filterSemCustos ? '#FF9800' : 'rgba(255, 152, 0, 0.3)'}`,
              color: '#FF9800',
              fontWeight: 'bold'
            }}
          >
            ⚠️ Fechados Sem Custos ({semCustosTotalCount})
          </button>
        )}
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Pesquisar (Nome/Tel/Cidade)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Digite para buscar..."
              value={filterSearch}
              onChange={e => { setFilterSearch(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Mês do Evento</label>
            <input
              type="month"
              className="form-input"
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Pacote</label>
            <select
              className="form-select"
              value={filterPacote}
              onChange={e => { setFilterPacote(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="">Todos os pacotes</option>
              {uniquePacotes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Cidade</label>
            <select
              className="form-select"
              value={filterCidade}
              onChange={e => { setFilterCidade(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="">Todas as cidades</option>
              {uniqueCidades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Valor Mínimo (R$)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={filterMinVal}
              onChange={e => { setFilterMinVal(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Valor Máximo (R$)</label>
            <input
              type="number"
              className="form-input"
              placeholder="99999"
              value={filterMaxVal}
              onChange={e => { setFilterMaxVal(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterSearch(''); setFilterMonth(''); setFilterPacote('');
                setFilterCidade(''); setFilterMinVal(''); setFilterMaxVal('');
                setFilterSemCustos(false); setCurrentPage(1);
              }}
              style={{
                background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)',
                color: '#F44336', borderRadius: '8px', padding: '8px 16px',
                cursor: 'pointer', fontSize: '0.85rem', alignSelf: 'flex-end', height: '38px'
              }}
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>
      )}

      {/* VIEWS */}
      {viewMode === 'kanban' ? (
        <KanbanView
          columns={COLUMNS}
          isMobile={isMobile}
          getLeadsByStatus={getLeadsByStatus}
          cerimonialistas={cerimonialistas}
          onSelectLead={setSelectedLead}
          onStatusChange={leadOps.handleStatusChange}
          onToggleAbGroup={leadOps.toggleLeadAbGroup}
          onDeleteLead={leadOps.handleDeleteLead}
        />
      ) : (
        <TableView
          filteredLeads={filteredLeads}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onSelectLead={setSelectedLead}
          onStatusChange={leadOps.handleStatusChange}
          onDeleteLead={leadOps.handleDeleteLead}
        />
      )}

      {/* MODALS */}
      <LeadDetailModal
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        onClose={() => setSelectedLead(null)}
        onStatusChange={leadOps.handleStatusChange}
        onToggleAbGroup={leadOps.toggleLeadAbGroup}
        onSaveEditLead={leadOps.handleSaveEditLead}
        handleDeleteLead={leadOps.handleDeleteLead}
        pacotes={pacotes}
        cerimonialistas={cerimonialistas}
        drinksMenu={drinksMenu}
        ajudantes={ajudantes}
        estoque={estoque}
        financeiroPresets={financeiroPresets}
        custosCategorias={custosCategorias}
        evolutionApi={evolutionApi}
        scripts={scripts}
        generalConfigs={generalConfigs}
        setPreviewUrl={setPreviewUrl}
        sendingScript={sendingScript}
        showToast={showToast}
        showConfirm={showConfirm}
        // Financial actions
        handleUpdateFaturamento={finActions.handleUpdateFaturamento}
        handleUpdateDesconto={finActions.handleUpdateDesconto}
        handleImportFromPackage={finActions.handleImportFromPackage}
        handleUpdateAplicarDescontoMaoDeObra={finActions.handleUpdateAplicarDescontoMaoDeObra}
        handleRegisterRecebimento={finActions.handleRegisterRecebimento}
        handleDeleteRecebimento={finActions.handleDeleteRecebimento}
        handleAddCost={finActions.handleAddCost}
        handleUpdateCostCategory={finActions.handleUpdateCostCategory}
        handleRemoveCost={finActions.handleRemoveCost}
        handleApplyPackageCostsTemplate={finActions.handleApplyPackageCostsTemplate}
        // Equipe actions
        checkHelperOverlap={equipeActions.checkHelperOverlap}
        handleAddHelperToLead={equipeActions.handleAddHelperToLead}
        handleRemoveHelperFromLead={equipeActions.handleRemoveHelperFromLead}
        handleUpdateHelperStatus={equipeActions.handleUpdateHelperStatus}
        handleSendHelperAvailabilityCheck={equipeActions.handleSendHelperAvailabilityCheck}
        handleSendHelperFinalConfirmation={equipeActions.handleSendHelperFinalConfirmation}
        // Shopping list & quotes
        handleSendShoppingListViaApi={handleSendShoppingListViaApi}
        handleResendQuote={handleResendQuote}
        handlePrepareManualQuote={handlePrepareManualQuote}
        handleSendEvolution={waActions.handleSendEvolution}
        aiFollowupLoading={waActions.aiFollowupLoading}
        aiFollowupResult={waActions.aiFollowupResult}
        aiFollowupCopied={waActions.aiFollowupCopied}
        handleGenerateFollowup={waActions.handleGenerateFollowup}
        handleCopyFollowup={waActions.handleCopyFollowup}
        isEditingShoppingList={isEditingShoppingList}
        setIsEditingShoppingList={setIsEditingShoppingList}
        editedShoppingList={editedShoppingList}
        setEditedShoppingList={setEditedShoppingList}
        handleStartEditShoppingList={shoppingActions.handleStartEditShoppingList}
        handleSaveShoppingList={shoppingActions.handleSaveShoppingList}
        toggleShoppingListItem={shoppingActions.toggleShoppingListItem}
        updateInsumoKey={shoppingActions.updateInsumoKey}
        updateInsumoVal={shoppingActions.updateInsumoVal}
        deleteInsumo={shoppingActions.deleteInsumo}
        addInsumo={shoppingActions.addInsumo}
        updateFixoField={shoppingActions.updateFixoField}
        deleteFixo={shoppingActions.deleteFixo}
        addFixo={shoppingActions.addFixo}
        modalSearchTerm={modalSearchTerm}
        setModalSearchTerm={setModalSearchTerm}
        modalCategoryFilter={modalCategoryFilter}
        setModalCategoryFilter={setModalCategoryFilter}
        faturamentoInput={faturamentoInput}
        setFaturamentoInput={setFaturamentoInput}
        descontoInput={descontoInput}
        setDescontoInput={setDescontoInput}
        newCost={newCost}
        setNewCost={setNewCost}
      />

      <AddLeadModal
        isOpen={isAddingManual}
        onClose={() => setIsAddingManual(false)}
        onSave={leadOps.handleSaveManualLead}
        pacotes={pacotes}
        cerimonialistas={cerimonialistas}
      />

      <MediaPreviewModal
        previewUrl={previewUrl}
        onClose={() => setPreviewUrl(null)}
        showToast={showToast}
      />

      {manualQuote && (
        <div className="admin-manual-quote-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setManualQuote(null); }}>
          <section className="admin-manual-quote-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-quote-title">
            <header>
              <div>
                <span className="admin-manual-quote-eyebrow">Envio manual</span>
                <h2 id="manual-quote-title">Revisar e copiar orçamento</h2>
              </div>
              <button type="button" className="admin-manual-quote-close" onClick={() => setManualQuote(null)} aria-label="Fechar">
                <FiX size={20} />
              </button>
            </header>
            <p className="admin-manual-quote-recipient">
              Para <strong>{manualQuote.lead.nome} {manualQuote.lead.sobrenome || ''}</strong> · {manualQuote.lead.telefone || 'telefone não informado'}
            </p>
            {manualQuote.status === 'failed' ? (
              <div className="admin-manual-quote-error" role="status">
                O envio automático falhou. O pedido e o texto do orçamento estão preservados; copie a mensagem e envie-a pelo WhatsApp.
                {manualQuote.error && <small>{manualQuote.error.slice(0, 220)}</small>}
              </div>
            ) : (
              <p className="admin-manual-quote-ready">A mensagem foi preparada sem usar a API. Confira o texto, copie ou abra a conversa com o cliente.</p>
            )}
            <label className="sr-only" htmlFor="manual-quote-message">Mensagem completa do orçamento</label>
            <textarea id="manual-quote-message" value={manualQuote.message} readOnly rows={12} onFocus={event => event.target.select()} />
            <div className="admin-manual-quote-actions">
              <button type="button" className="btn btn--outline" onClick={handleCopyManualQuote}>
                <FiCopy size={16} /> {manualQuoteCopied ? 'Copiado' : 'Copiar mensagem'}
              </button>
              {cleanPhoneForWhatsApp(manualQuote.lead.telefone).length >= 10 ? (
                <a
                  className="btn btn--primary"
                  href={`https://wa.me/${cleanPhoneForWhatsApp(manualQuote.lead.telefone)}?text=${encodeURIComponent(manualQuote.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FiExternalLink size={16} /> Abrir conversa com cliente
                </a>
              ) : <span className="admin-manual-quote-no-phone">Confira o telefone do lead para abrir o WhatsApp.</span>}
            </div>
          </section>
        </div>
      )}

      {/* NOTIFICATIONS & OVERLAYS */}
      <Toast toast={toast} onClose={hideToast} />
      <ConfirmModal confirmModal={confirmModal} />

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
          zIndex: 99999
        }}>
          <div className="btn__spinner" style={{ width: '40px', height: '40px' }} />
          <div style={{ color: 'var(--primary)', fontFamily: 'Cinzel, serif', fontSize: '1.1rem' }}>
            Processando disparo...
          </div>
        </div>
      )}
    </div>
  );
}
