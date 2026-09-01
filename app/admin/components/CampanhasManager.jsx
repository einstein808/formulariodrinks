"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { 
  FiSend, FiImage, FiInstagram, FiFileText, FiClock, FiAlertCircle, 
  FiCheckCircle, FiXCircle, FiUsers, FiCheck, FiX, FiZap, FiSearch
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import MinioImageUpload from './MinioImageUpload';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function diasDesde(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getLeadLastContactDays(lead) {
  if (lead.ultimoContato) {
    return diasDesde(lead.ultimoContato);
  }
  if (lead.messages && typeof lead.messages === 'object') {
    const dates = Object.values(lead.messages)
      .map(m => m.sentAt)
      .filter(Boolean)
      .map(d => new Date(d).getTime());
    if (dates.length > 0) {
      const maxDate = Math.max(...dates);
      return Math.floor((Date.now() - maxDate) / (1000 * 60 * 60 * 24));
    }
  }
  if (lead.criadoEm) {
    return diasDesde(lead.criadoEm);
  }
  return null;
}

function formatPhone(value) {
  if (!value) return '';
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

function formatDateBr(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

const TEMPLATES_SUGERIDOS = {
  leads_esfriando: {
    label: '🟡 Reaquecer Leads Esfriando (7-14 dias)',
    text: "Olá, {{nome}}! Tudo bem? 😊\n\nPassando para saber se você conseguiu dar uma olhada na nossa proposta de coquetelaria para o seu {{tipoEvento}} em {{dataEvento}}!\n\nNossa agenda para esse período já está com alta procura. Se quiser ajustar algum drink ou o valor do pacote {{pacote}}, consigo uma condição especial para fecharmos ainda essa semana! 🍹🍸\n\nPodemos conversar?"
  },
  leads_esfriou: {
    label: '🧊 Reativar Leads que Esfriaram (+15 dias)',
    text: "Oi, {{nome}}! Como estão os preparativos para o seu {{tipoEvento}}? 🎉\n\nEstava revisando minha agenda aqui e lembrei de você! Sei que organizar festa é uma correria danada, mas ainda temos disponibilidade para a sua data em {{cidade}}.\n\nQuer que eu atualize o orçamento com novos drinks e uma condição exclusiva para o seu evento? Me dá um alô por aqui! 🥂🍹"
  },
  leads_negociacao: {
    label: '💬 Lembrete para Leads em Negociação',
    text: "Olá, {{nome}}! Tudo bem por aí? 🍹\n\nEstou finalizando o cronograma de contratações deste mês de {{mes}} e gostaria de saber se ficou alguma dúvida sobre o cardápio de drinks para o seu {{tipoEvento}}.\n\nQualquer ajuste que precisar fazer nos drinks ou na estrutura do bar, é só me avisar por aqui!"
  },
  leads_fechados: {
    label: '🏆 Pós-Venda / Reativação para Fechados',
    text: "Olá, {{nome}}! Tudo bem? 🍸\n\nPassando para agradecer mais uma vez a confiança no Laboratório de Drinks para o seu {{tipoEvento}}!\n\nSe tiver amigos ou familiares organizando eventos e precisando de barman profissional em {{cidade}}, pode me indicar por aqui! Sempre temos mimos especiais para indicações de vocês. Um abraço!"
  },
  parceiros_mes: {
    label: '🤝 Campanha Mensal para Parceiros',
    text: "Olá, {{nome}}! Tudo bem? 😊\n\nPassando para desejar um excelente mês de {{mes}} e lembrar que estamos sempre prontos para atender seus clientes com nossa coquetelaria premium! 🍹🥂\n\nQualquer orçamento que precisar para eventos, é só me chamar aqui!"
  }
};

export default function CampanhasManager() {
  const [publico, setPublico] = useState('leads'); // 'leads' | 'parceiros'
  const [leads, setLeads] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Segmentação Leads
  const [segmentoLead, setSegmentoLead] = useState('esfriando'); // 'esfriando' | 'esfriou' | 'negociacao' | 'novo' | 'fechado' | 'todos'
  const [searchFilter, setSearchFilter] = useState('');

  // Form states
  const [tipo, setTipo] = useState('texto'); // 'texto' | 'imagem' | 'instagram'
  const [mensagem, setMensagem] = useState(TEMPLATES_SUGERIDOS.leads_esfriando.text);
  const [midia, setMidia] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Dispatch states
  const [disparando, setDisparando] = useState(false);
  const [progresso, setProgresso] = useState({ total: 0, sucesso: 0, erro: 0, status: '' });
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const confirmModalRef = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4500);
  };

  const showConfirm = (message, onConfirm, title = "Confirmação de Disparo") => {
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
    window.history.pushState({ modal: 'confirm' }, '');
    confirmModalRef.current = true;
  };

  useEffect(() => {
    const handlePopState = () => {
      if (confirmModalRef.current) {
        confirmModalRef.current = false;
        setConfirmModal(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Firebase Listeners
  useEffect(() => {
    const unsubLeads = onValue(ref(db, 'leads'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        list.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
        setLeads(list);
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    const unsubParceiros = onValue(ref(db, 'config/cerimonialistas'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([slug, item]) => ({ slug, ...item }))
          .filter(p => p.ativo !== false);
        list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        setParceiros(list);
      } else {
        setParceiros([]);
      }
    });

    const unsubCategorias = onValue(ref(db, 'config/categorias-parceiros'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([slug, item]) => ({ slug, ...item }));
        setCategorias(list);
      } else {
        setCategorias([]);
      }
    });

    const unsubCampanhas = onValue(ref(db, 'campanhas'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        list.sort((a, b) => new Date(b.criadaEm || 0) - new Date(a.criadaEm || 0));
        setCampanhas(list);
      } else {
        setCampanhas([]);
      }
    });

    return () => {
      unsubLeads();
      unsubParceiros();
      unsubCategorias();
      unsubCampanhas();
    };
  }, []);

  // Classificação dos Leads
  const classifiedLeads = leads.map(l => {
    const days = getLeadLastContactDays(l);
    let tempStatus = 'normal';

    if (l.status === 'perdido') {
      tempStatus = 'esfriou';
    } else if (l.status === 'fechado' || l.status === 'realizado') {
      tempStatus = 'fechado';
    } else {
      if (days === null || days >= 15) {
        tempStatus = 'esfriou';
      } else if (days >= 7 && days < 15) {
        tempStatus = 'esfriando';
      } else {
        tempStatus = l.status || 'novo';
      }
    }

    return {
      ...l,
      _daysWithoutContact: days,
      _tempStatus: tempStatus
    };
  });

  // Filtro atual de leads
  const filteredLeads = classifiedLeads.filter(l => {
    if (l.optout) return false;

    let matchesSegment = true;
    if (segmentoLead === 'esfriando') {
      matchesSegment = l._tempStatus === 'esfriando';
    } else if (segmentoLead === 'esfriou') {
      matchesSegment = l._tempStatus === 'esfriou';
    } else if (segmentoLead === 'negociacao') {
      matchesSegment = l.status === 'negociacao';
    } else if (segmentoLead === 'novo') {
      matchesSegment = l.status === 'novo' || !l.status;
    } else if (segmentoLead === 'fechado') {
      matchesSegment = l.status === 'fechado' || l.status === 'realizado';
    }

    const q = searchFilter.toLowerCase().trim();
    const matchesSearch = !q ||
      (l.nome && l.nome.toLowerCase().includes(q)) ||
      (l.telefone && l.telefone.includes(q)) ||
      (l.tipoEvento && l.tipoEvento.toLowerCase().includes(q)) ||
      (l.cidade && l.cidade.toLowerCase().includes(q));

    return matchesSegment && matchesSearch;
  });

  // Itens atualmente ativos de acordo com o público
  const currentTargetItems = publico === 'leads' ? filteredLeads : parceiros;

  // Atualizar seleção quando muda de segmento ou público
  useEffect(() => {
    if (publico === 'leads') {
      setSelectedIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedIds(parceiros.map(p => p.slug));
    }
  }, [publico, segmentoLead, searchFilter, leads.length, parceiros.length]);

  const toggleItemSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === currentTargetItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentTargetItems.map(item => item.id || item.slug));
    }
  };

  // Contagens para badges
  const countEsfriando = classifiedLeads.filter(l => l._tempStatus === 'esfriando').length;
  const countEsfriou = classifiedLeads.filter(l => l._tempStatus === 'esfriou').length;
  const countNegociacao = classifiedLeads.filter(l => l.status === 'negociacao').length;
  const countFechados = classifiedLeads.filter(l => l.status === 'fechado' || l.status === 'realizado').length;

  // Trocar template sugerido
  const aplicarTemplate = (tplKey) => {
    const tpl = TEMPLATES_SUGERIDOS[tplKey];
    if (tpl) {
      setMensagem(tpl.text);
      showToast(`Template "${tpl.label}" aplicado!`);
    }
  };

  // Sample para Preview
  const sampleItem = publico === 'leads'
    ? (filteredLeads.find(l => selectedIds.includes(l.id)) || filteredLeads[0] || {
        nome: 'Mariana',
        sobrenome: 'Silva',
        tipoEvento: 'Casamento',
        dataEvento: '2026-11-20',
        cidade: 'Juiz de Fora',
        pacote: 'Laboratório'
      })
    : (parceiros.find(p => selectedIds.includes(p.slug)) || parceiros[0] || {
        nome: 'Cerimonial Maria',
        categorias: ['cerimonialista']
      });

  const getInterpolatedPreview = () => {
    const mes = MESES[new Date().getMonth()];
    let txt = mensagem;

    if (publico === 'leads') {
      const pNome = (sampleItem.nome || 'Cliente').trim().split(' ')[0];
      const dataFmt = formatDateBr(sampleItem.dataEvento);
      txt = txt
        .replace(/\{\{nome\}\}/gi, pNome)
        .replace(/\{\{nomeCompleto\}\}/gi, `${sampleItem.nome || ''} ${sampleItem.sobrenome || ''}`.trim())
        .replace(/\{\{tipoEvento\}\}/gi, sampleItem.tipoEvento || 'evento')
        .replace(/\{\{dataEvento\}\}/gi, dataFmt || 'sua data')
        .replace(/\{\{cidade\}\}/gi, sampleItem.cidade || 'sua região')
        .replace(/\{\{pacote\}\}/gi, sampleItem.pacote || 'personalizado')
        .replace(/\{\{mes\}\}/gi, mes);
    } else {
      const pCats = Array.isArray(sampleItem.categorias) ? sampleItem.categorias : [];
      const catNames = pCats.map(cSlug => {
        const found = categorias.find(c => c.slug === cSlug);
        return found ? found.nome : cSlug;
      }).join(', ');

      txt = txt
        .replace(/\{\{nome\}\}/gi, sampleItem.nome || 'Parceiro')
        .replace(/\{\{categorias\}\}/gi, catNames || 'Parceiro')
        .replace(/\{\{categoria\}\}/gi, catNames || 'Parceiro')
        .replace(/\{\{mes\}\}/gi, mes);
    }

    if (tipo === 'instagram' && midia.trim()) {
      txt += `\n\n👉 Confira nossa publicação: ${midia.trim()}`;
    }

    return txt;
  };

  // Disparo
  const handleDisparar = () => {
    if (!mensagem.trim()) {
      showToast('Digite a mensagem antes de disparar', 'warning');
      return;
    }
    if (tipo === 'imagem' && !midia.trim()) {
      showToast('Faça o upload ou informe a URL da imagem da campanha', 'warning');
      return;
    }
    if (tipo === 'instagram' && !midia.trim()) {
      showToast('Informe o link da publicação do Instagram', 'warning');
      return;
    }
    if (selectedIds.length === 0) {
      showToast('Selecione ao menos um destinatário para disparar', 'warning');
      return;
    }

    const count = selectedIds.length;
    const publicoLabel = publico === 'leads' ? 'cliente(s) / lead(s)' : 'parceiro(s)';

    showConfirm(
      `Deseja realmente disparar esta campanha para ${count} ${publicoLabel} via Evolution API? O envio será realizado com intervalo de 1.5s entre cada mensagem.`,
      async () => {
        setDisparando(true);
        setProgresso({ total: count, sucesso: 0, erro: 0, status: 'Iniciando envio...' });

        try {
          const payload = {
            mensagem,
            tipo,
            midia: midia.trim(),
            publico,
            ...(publico === 'leads' ? { leadIds: selectedIds, segmentoLead } : { parceiroSlugs: selectedIds })
          };

          const res = await fetch('/api/campanhas/disparar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();

          if (res.ok && data.ok) {
            showToast(`Campanha finalizada! ${data.sucesso} enviadas com sucesso, ${data.erro} falhas.`, 'success');
          } else {
            showToast(data.error || 'Erro ao realizar disparo da campanha', 'error');
          }
        } catch (err) {
          console.error('Erro no disparo:', err);
          showToast('Erro de conexão ao disparar campanha', 'error');
        } finally {
          setDisparando(false);
          setProgresso({ total: 0, sucesso: 0, erro: 0, status: '' });
        }
      },
      `Disparar para ${count} ${publicoLabel}`
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
          Campanhas WhatsApp & Relacionamento
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Dispare mensagens personalizadas em lote para reaquecer clientes e manter parceiros engajados.
        </p>
      </div>

      {/* ── SELETOR DE PÚBLICO-ALVO (LEADS vs PARCEIROS) ────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'var(--bg-input)',
        padding: '8px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        marginBottom: '24px'
      }}>
        <button
          type="button"
          onClick={() => {
            setPublico('leads');
            aplicarTemplate('leads_esfriando');
          }}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: publico === 'leads' ? 'var(--primary)' : 'transparent',
            color: publico === 'leads' ? '#000' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <FiUsers size={18} />
          Clientes & Leads ({leads.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setPublico('parceiros');
            aplicarTemplate('parceiros_mes');
          }}
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: publico === 'parceiros' ? 'var(--primary)' : 'transparent',
            color: publico === 'parceiros' ? '#000' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <FaWhatsapp size={18} />
          Parceiros ({parceiros.length})
        </button>
      </div>

      {/* ── SEGMENTAÇÃO ESPECÍFICA PARA LEADS ────────────────────────── */}
      {publico === 'leads' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
            🎯 Segmentação de Leads
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => {
                setSegmentoLead('esfriando');
                aplicarTemplate('leads_esfriando');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'esfriando' ? '#FFD54F' : 'var(--border-color)'}`,
                background: segmentoLead === 'esfriando' ? 'rgba(255, 213, 79, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'esfriando' ? '#FFD54F' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🟡 Esfriando ({countEsfriando}) <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>7 a 14 dias</span>
            </button>

            <button
              onClick={() => {
                setSegmentoLead('esfriou');
                aplicarTemplate('leads_esfriou');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'esfriou' ? '#00E5FF' : 'var(--border-color)'}`,
                background: segmentoLead === 'esfriou' ? 'rgba(0, 229, 255, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'esfriou' ? '#00E5FF' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🧊 Esfriou ({countEsfriou}) <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>+15 dias / Perdido</span>
            </button>

            <button
              onClick={() => {
                setSegmentoLead('negociacao');
                aplicarTemplate('leads_negociacao');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'negociacao' ? '#FF9800' : 'var(--border-color)'}`,
                background: segmentoLead === 'negociacao' ? 'rgba(255, 152, 0, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'negociacao' ? '#FF9800' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              💬 Em Negociação ({countNegociacao})
            </button>

            <button
              onClick={() => {
                setSegmentoLead('fechado');
                aplicarTemplate('leads_fechados');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'fechado' ? '#4CAF50' : 'var(--border-color)'}`,
                background: segmentoLead === 'fechado' ? 'rgba(76, 175, 80, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'fechado' ? '#4CAF50' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏆 Fechados ({countFechados})
            </button>

            <button
              onClick={() => setSegmentoLead('todos')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'todos' ? 'var(--primary)' : 'var(--border-color)'}`,
                background: segmentoLead === 'todos' ? 'rgba(203, 161, 83, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'todos' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✨ Todos os Leads ({leads.length})
            </button>
          </div>
        </div>
      )}

      {/* Grid Principal: Form + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px', marginBottom: '32px' }} className="admin-campaign-grid">
        
        {/* Painel de Criação */}
        <div style={{
          background: 'var(--bg-input)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiSend style={{ color: 'var(--primary)' }} /> Nova Campanha para {publico === 'leads' ? 'Clientes' : 'Parceiros'}
            </h3>

            {/* Atalhos de templates */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiZap size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sugestões rápidas</span>
            </div>
          </div>

          {/* Formato do Envio */}
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Formato da Mensagem
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTipo('texto')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${tipo === 'texto' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: tipo === 'texto' ? 'rgba(203, 161, 83, 0.12)' : 'var(--bg-card)',
                  color: tipo === 'texto' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                <FiFileText size={18} />
                Só Texto
              </button>

              <button
                type="button"
                onClick={() => setTipo('imagem')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${tipo === 'imagem' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: tipo === 'imagem' ? 'rgba(203, 161, 83, 0.12)' : 'var(--bg-card)',
                  color: tipo === 'imagem' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                <FiImage size={18} />
                Com Imagem (S3)
              </button>

              <button
                type="button"
                onClick={() => setTipo('instagram')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${tipo === 'instagram' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: tipo === 'instagram' ? 'rgba(203, 161, 83, 0.12)' : 'var(--bg-card)',
                  color: tipo === 'instagram' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                <FiInstagram size={18} />
                Link Instagram
              </button>
            </div>
          </div>

          {/* Upload de Imagem S3 */}
          {tipo === 'imagem' && (
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Imagem da Campanha (S3 / Upload)
              </label>
              <MinioImageUpload
                value={midia}
                onChange={(url) => setMidia(url)}
                placeholder="Upload da foto para enviar..."
              />
            </div>
          )}

          {/* Link Instagram */}
          {tipo === 'instagram' && (
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Link da Publicação / Reel no Instagram
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://www.instagram.com/p/..."
                value={midia}
                onChange={(e) => setMidia(e.target.value)}
              />
            </div>
          )}

          {/* Mensagem Template */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Mensagem do WhatsApp
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                {publico === 'leads' 
                  ? 'Variáveis: {{nome}}, {{tipoEvento}}, {{dataEvento}}, {{cidade}}, {{pacote}}'
                  : 'Variáveis: {{nome}}, {{categorias}}, {{mes}}'}
              </span>
            </div>
            <textarea
              className="form-input"
              rows={7}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite o texto da campanha..."
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {/* Lista de Seleção de Destinatários */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Destinatários ({selectedIds.length} de {currentTargetItems.length})
              </label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: '160px' }}>
                  <FiSearch size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px 4px 26px',
                      borderRadius: '6px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllToggle}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {selectedIds.length === currentTargetItems.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
            </div>

            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'var(--bg-card)'
            }}>
              {currentTargetItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Nenhum destinatário encontrado com os filtros atuais.
                </div>
              ) : (
                currentTargetItems.map(item => {
                  const itemId = item.id || item.slug;
                  const isSelected = selectedIds.includes(itemId);
                  const days = publico === 'leads' ? item._daysWithoutContact : diasDesde(item.ultimoContato);

                  return (
                    <label
                      key={itemId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(203, 161, 83, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(itemId)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.nome} {item.sobrenome || ''}
                        </div>
                        {publico === 'leads' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {item.tipoEvento || 'Festa'} {item.dataEvento ? `• ${formatDateBr(item.dataEvento)}` : ''} {item.cidade ? `• ${item.cidade}` : ''}
                          </div>
                        )}
                      </div>
                      
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        background: days === null || days >= 15 ? 'rgba(0, 229, 255, 0.15)' : (days >= 7 ? 'rgba(255, 213, 79, 0.15)' : 'rgba(76, 175, 80, 0.15)'),
                        color: days === null || days >= 15 ? '#00E5FF' : (days >= 7 ? '#FFD54F' : '#4CAF50')
                      }}>
                        {days === null ? 'Sem contato' : `${days}d`}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Botão de Disparo */}
          <button
            type="button"
            onClick={handleDisparar}
            disabled={disparando || selectedIds.length === 0}
            className="btn btn--primary"
            style={{
              padding: '14px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '4px'
            }}
          >
            {disparando ? (
              <>
                <div className="btn__spinner" />
                <span>Enviando mensagens ({progresso.status})...</span>
              </>
            ) : (
              <>
                <FaWhatsapp size={20} />
                <span>Disparar Campanha para {selectedIds.length} {publico === 'leads' ? 'Cliente(s)' : 'Parceiro(s)'}</span>
              </>
            )}
          </button>
        </div>

        {/* Painel de Preview ao Vivo (Estilo WhatsApp) */}
        <div style={{
          background: 'var(--bg-input)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            📱 Prévia no WhatsApp
          </h3>

          <div style={{
            background: '#0b141a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px 16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}>
            {/* Header Mockup */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                {(sampleItem.nome || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                  {sampleItem.nome} {sampleItem.sobrenome || ''}
                </div>
                <div style={{ color: '#25D366', fontSize: '0.72rem' }}>
                  Online (Simulação de Envio)
                </div>
              </div>
            </div>

            {/* Balão de Mensagem */}
            <div style={{
              background: '#005c4b',
              color: '#e9edef',
              borderRadius: '8px 8px 2px 8px',
              padding: '12px 14px',
              maxWidth: '92%',
              alignSelf: 'flex-end',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
              {/* Imagem de preview */}
              {tipo === 'imagem' && midia && (
                <div style={{
                  marginBottom: '10px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  maxHeight: '200px',
                  background: '#000'
                }}>
                  <img
                    src={midia}
                    alt="Campanha"
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {getInterpolatedPreview()}
              </div>

              <div style={{
                textAlign: 'right',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.6)',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '4px'
              }}>
                <span>Agora</span>
                <span style={{ color: '#53bdeb' }}>✓✓</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Disparo automático via Evolution API com delay de 1.5s para proteção contra bloqueios.
          </div>
        </div>

      </div>

      {/* Histórico de Campanhas */}
      <div>
        <h2 style={{ fontSize: '1.3rem', margin: '0 0 16px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
          Histórico de Campanhas Disparadas
        </h2>

        {campanhas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'var(--bg-input)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            Nenhuma campanha disparada até o momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {campanhas.map(camp => {
              const dataFormatada = camp.criadaEm 
                ? new Date(camp.criadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : 'Data não informada';

              const isLeadCampaign = camp.publico === 'leads';

              return (
                <div
                  key={camp.id}
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: isLeadCampaign ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                        color: isLeadCampaign ? '#00E5FF' : 'var(--primary)',
                        fontWeight: 700
                      }}>
                        {isLeadCampaign ? '👥 CLIENTES' : '🤝 PARCEIROS'}
                      </span>

                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {camp.tipo || 'texto'}
                      </span>

                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <FiClock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {dataFormatada}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiCheckCircle size={14} /> {camp.sucesso || 0} enviados
                      </span>
                      {(camp.erro || 0) > 0 && (
                        <span style={{ color: '#F44336', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiXCircle size={14} /> {camp.erro} erros
                        </span>
                      )}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: camp.status === 'concluida' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                        color: camp.status === 'concluida' ? '#4CAF50' : '#FFC107'
                      }}>
                        {camp.status === 'concluida' ? 'Concluída' : 'Em andamento'}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    background: 'var(--bg-card)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    maxHeight: '80px',
                    overflowY: 'auto'
                  }}>
                    {camp.mensagem}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          maxWidth: '380px',
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
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '460px',
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
                style={{ padding: '8px 20px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none', color: 'var(--bg-dark)' }}
              >
                Confirmar Disparo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
