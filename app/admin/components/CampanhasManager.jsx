"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, update, push } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { cleanPhoneForWhatsApp } from '../../../lib/utils';
import { 
  FiSend, FiImage, FiInstagram, FiFileText, FiClock, FiAlertCircle, 
  FiCheckCircle, FiXCircle, FiUsers, FiCheck, FiX, FiZap, FiSearch,
  FiShield, FiRefreshCw, FiEdit3, FiEye
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import MinioImageUpload from './MinioImageUpload';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function diasDesde(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Sem data';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Agora mesmo';
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

function processSpintax(text) {
  if (!text) return '';
  let result = text;
  const spintaxRegex = /\{([^{}]+)\}/g;
  let match;
  while ((match = spintaxRegex.exec(result)) !== null) {
    const choices = match[1].split('|');
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    result = result.replace(match[0], chosen);
    spintaxRegex.lastIndex = 0;
  }
  return result;
}

function hasLeadContactHistory(lead) {
  if (!lead) return false;
  if (lead.ultimoContato) return true;
  if (lead.messages && typeof lead.messages === 'object' && Object.keys(lead.messages).length > 0) {
    return true;
  }
  return false;
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

function getLeadLastCampaignInfo(lead) {
  if (!lead) return { received: false, date: null, daysAgo: null };
  let lastDate = null;
  if (lead.ultimaCampanhaEm) {
    const d = new Date(lead.ultimaCampanhaEm);
    if (!isNaN(d.getTime())) lastDate = d;
  }
  if (lead.messages && typeof lead.messages === 'object') {
    Object.values(lead.messages).forEach(m => {
      if (m && m.type === 'campanha_whatsapp' && m.sentAt) {
        const d = new Date(m.sentAt);
        if (!isNaN(d.getTime()) && (!lastDate || d > lastDate)) {
          lastDate = d;
        }
      }
    });
  }
  if (!lastDate) return { received: false, date: null, daysAgo: null };
  const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  return { received: true, date: lastDate.toISOString(), daysAgo: Math.max(0, daysAgo) };
}

function formatDateBr(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function interpolarParceiro(template, parceiro, categoriasList = []) {
  const pCats = Array.isArray(parceiro.categorias) 
    ? parceiro.categorias 
    : (parceiro.categoria ? [parceiro.categoria] : []);
  
  const catNames = pCats.map(cSlug => {
    const found = categoriasList.find(c => c.slug === cSlug);
    return found ? found.nome : cSlug;
  }).join(', ');

  const currentMonth = MESES[new Date().getMonth()];

  let raw = (template || '')
    .replace(/\{\{nome\}\}/gi, parceiro.nome || '')
    .replace(/\{\{categorias\}\}/gi, catNames || 'Parceiro')
    .replace(/\{\{categoria\}\}/gi, catNames || 'Parceiro')
    .replace(/\{\{mes\}\}/gi, currentMonth);

  return processSpintax(raw);
}

function interpolarLead(template, lead) {
  const currentMonth = MESES[new Date().getMonth()];
  const primeiroNome = (lead.nome || '').trim().split(' ')[0] || 'Cliente';
  const dataFormatada = formatDateBr(lead.dataEvento);

  let raw = (template || '')
    .replace(/\{\{nome\}\}/gi, primeiroNome)
    .replace(/\{\{nomeCompleto\}\}/gi, `${lead.nome || ''} ${lead.sobrenome || ''}`.trim())
    .replace(/\{\{tipoEvento\}\}/gi, lead.tipoEvento || 'evento')
    .replace(/\{\{dataEvento\}\}/gi, dataFormatada || 'sua data')
    .replace(/\{\{cidade\}\}/gi, lead.cidade || 'sua região')
    .replace(/\{\{pacote\}\}/gi, lead.pacote || 'personalizado')
    .replace(/\{\{convidados\}\}/gi, (lead.convidados || '').toString())
    .replace(/\{\{mes\}\}/gi, currentMonth);

  return processSpintax(raw);
}

async function simulateTypingPresence(baseUrl, instance, apiKey, number, durationMs = 2500) {
  try {
    const presenceEndpoint = `${baseUrl}/chat/sendPresence/${instance}`;
    await fetch(presenceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number,
        presence: 'composing',
        delay: durationMs
      })
    });
  } catch (err) {
    console.warn('Presença de digitação ignorada:', err.message);
  }
}

const TEMPLATES_SUGERIDOS = {
  leads_recentes: {
    label: '🟢 Follow-up para Contatos Recentes (Sem Contato)',
    text: "{Olá|Oi|Oie}, {{nome}}! {Tudo bem|Como vai você}? 😊\n\nVi que você solicitou um orçamento recentemente para o seu {{tipoEvento}} em {{dataEvento}}!\n\nConseguiu dar uma olhada na proposta? Me avisa se ficou com alguma dúvida sobre os drinks ou se gostaria de personalizar o cardápio! 🍹🍸"
  },
  leads_esfriando: {
    label: '🟡 Reaquecer Leads Esfriando (7-14 dias)',
    text: "{Olá|Oi|Oie}, {{nome}}! {Tudo bem|Tudo certo por aí}? 😊\n\n{Passando para saber se você conseguiu dar uma olhada na|Queria ver se você conseguiu avaliar a} nossa proposta de coquetelaria para o seu {{tipoEvento}} em {{dataEvento}}!\n\nNossa agenda para esse período {já está bem concorrida|já está com alta procura}. Se quiser ajustar {algum drink|os coquetéis} ou o valor do pacote {{pacote}}, consigo uma {condição especial|proposta exclusiva} para fecharmos {ainda essa semana|nos próximos dias}! 🍹🍸\n\n{Podemos conversar|Quer que eu te mande um cardápio atualizado}?"
  },
  leads_esfriou: {
    label: '🧊 Reativar Leads que Esfriaram (+15 dias)',
    text: "{Oi|Olá}, {{nome}}! {Como estão os preparativos|Como andam os detalhes} para o seu {{tipoEvento}}? 🎉\n\n{Estava revisando minha agenda aqui e lembrei de você|Revisando nosso calendário aqui me lembrei do seu evento}! Sei que organizar festa é {uma correria|bem corrido}, mas ainda temos disponibilidade para a sua data em {{cidade}}.\n\nQuer que eu atualize o orçamento com {drinks novos|opções especiais} e uma condição {exclusiva|diferenciada} para o seu evento? Me dá um alô por aqui! 🥂🍹"
  },
  leads_negociacao: {
    label: '💬 Lembrete para Leads em Negociação',
    text: "{Olá|Oi}, {{nome}}! {Tudo bem por aí|Tudo certinho}? 🍹\n\nEstou finalizando o cronograma de contratações deste mês de {{mes}} e gostaria de saber se ficou alguma dúvida sobre o cardápio de drinks para o seu {{tipoEvento}}.\n\nQualquer ajuste que precisar fazer nos drinks ou na estrutura do bar, é só me avisar por aqui!"
  },
  leads_fechados: {
    label: '🏆 Pós-Venda / Reativação para Fechados',
    text: "{Olá|Oi}, {{nome}}! {Tudo bem|Como vai}? 🍸\n\nPassando para agradecer mais uma vez a confiança no Laboratório de Drinks para o seu {{tipoEvento}}!\n\nSe tiver amigos ou familiares organizando eventos e precisando de barman profissional em {{cidade}}, pode me indicar por aqui! Sempre temos mimos especiais para indicações de vocês. Um abraço!"
  },
  parceiros_mes: {
    label: '🤝 Campanha Mensal para Parceiros',
    text: "{Olá|Oi|Oie}, {{nome}}! {Tudo bem|Como você está}? 😊\n\nPassando para desejar um excelente mês de {{mes}} e lembrar que estamos sempre prontos para atender seus clientes com nossa coquetelaria premium! 🍹🥂\n\nQualquer orçamento que precisar para eventos, é só me chamar aqui!"
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
  const [segmentoLead, setSegmentoLead] = useState('recentes');
  const [searchFilter, setSearchFilter] = useState('');
  const [evolutionApi, setEvolutionApi] = useState(null);

  // Form states
  const [tipo, setTipo] = useState('texto');
  const [mensagem, setMensagem] = useState(TEMPLATES_SUGERIDOS.leads_recentes.text);
  const [midia, setMidia] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewSeed, setPreviewSeed] = useState(0);

  // Anti-repetição de campanha para leads
  const [excluirCampanhaRecente, setExcluirCampanhaRecente] = useState(true);
  const [diasCampanhaRecente, setDiasCampanhaRecente] = useState(15);

  // Mobile View Switcher (Editor vs Preview on small devices)
  const [mobileActiveTab, setMobileActiveTab] = useState('editor'); // 'editor' | 'preview'

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
    const unsubLeads = onValue(
      ref(db, 'leads'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
          list.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
          setLeads(list);
        } else {
          setLeads([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Aviso: Falha ao carregar leads:', err?.message);
        setLoading(false);
      }
    );

    const unsubParceiros = onValue(
      ref(db, 'config/cerimonialistas'),
      (snap) => {
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
      },
      (err) => console.warn('Aviso: Falha ao carregar parceiros:', err?.message)
    );

    const unsubCategorias = onValue(
      ref(db, 'config/categorias-parceiros'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.entries(data).map(([slug, item]) => ({ slug, ...item }));
          setCategorias(list);
        } else {
          setCategorias([]);
        }
      },
      (err) => console.warn('Aviso: Falha ao carregar categorias:', err?.message)
    );

    const unsubCampanhas = onValue(
      ref(db, 'config/campanhas'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
          list.sort((a, b) => new Date(b.criadaEm || 0) - new Date(a.criadaEm || 0));
          setCampanhas(list);
        } else {
          setCampanhas([]);
        }
      },
      (err) => console.warn('Aviso: Falha ao carregar histórico de campanhas:', err?.message)
    );

    const unsubEvolution = onValue(
      ref(db, 'config/evolutionApi'),
      (snap) => {
        if (snap.exists()) {
          setEvolutionApi(snap.val());
        }
      },
      (err) => console.warn('Aviso: Falha ao carregar evolutionApi:', err?.message)
    );

    return () => {
      unsubLeads();
      unsubParceiros();
      unsubCategorias();
      unsubCampanhas();
      unsubEvolution();
    };
  }, []);

  // Classificação dos Leads
  const classifiedLeads = leads.map(l => {
    const days = getLeadLastContactDays(l);
    const campaignInfo = getLeadLastCampaignInfo(l);
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
      _campaignInfo: campaignInfo,
      _tempStatus: tempStatus
    };
  });

  const filteredLeads = classifiedLeads.filter(l => {
    if (l.optout) return false;

    const isFechadoOuRealizado = l.status === 'fechado' || l.status === 'realizado';

    // Se o segmento selecionado for 'fechado', exibe APENAS quem fechou ou realizou
    if (segmentoLead === 'fechado') {
      if (!isFechadoOuRealizado) return false;
    } else {
      // Para TODOS os outros segmentos (recentes, esfriando, esfriou, negociacao, novo, todos),
      // NUNCA incluir contatos que já tenham festa fechada ou realizada!
      if (isFechadoOuRealizado) return false;
    }

    let matchesSegment = true;
    if (segmentoLead === 'recentes') {
      // Oculta automaticamente quem já tiver histórico de mensagens (Opção B do usuário)
      matchesSegment = !hasLeadContactHistory(l);
    } else if (segmentoLead === 'esfriando') {
      matchesSegment = l._tempStatus === 'esfriando';
    } else if (segmentoLead === 'esfriou') {
      matchesSegment = l._tempStatus === 'esfriou';
    } else if (segmentoLead === 'negociacao') {
      matchesSegment = l.status === 'negociacao';
    } else if (segmentoLead === 'novo') {
      matchesSegment = l.status === 'novo' || !l.status;
    } else if (segmentoLead === 'fechado') {
      matchesSegment = isFechadoOuRealizado;
    } else if (segmentoLead === 'todos') {
      // 'todos' considera todos os leads em aberto (não fechados)
      matchesSegment = true;
    }

    const q = searchFilter.toLowerCase().trim();
    const matchesSearch = !q ||
      (l.nome && l.nome.toLowerCase().includes(q)) ||
      (l.telefone && l.telefone.includes(q)) ||
      (l.tipoEvento && l.tipoEvento.toLowerCase().includes(q)) ||
      (l.cidade && l.cidade.toLowerCase().includes(q));

    return matchesSegment && matchesSearch;
  });

  // Ordena por data de criação desc se for o segmento de recentes
  if (segmentoLead === 'recentes') {
    filteredLeads.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));
  }

  const currentTargetItems = publico === 'leads' ? filteredLeads : parceiros;

  const isLeadCampaignExcluded = (lead) => {
    if (!excluirCampanhaRecente) return false;
    if (!lead._campaignInfo || !lead._campaignInfo.received) return false;
    if (diasCampanhaRecente === 0) return true; // Sempre excluir quem já recebeu
    return lead._campaignInfo.daysAgo !== null && lead._campaignInfo.daysAgo <= diasCampanhaRecente;
  };

  useEffect(() => {
    if (publico === 'leads') {
      setSelectedIds(filteredLeads.filter(l => !isLeadCampaignExcluded(l)).map(l => l.id));
    } else {
      setSelectedIds(parceiros.map(p => p.slug));
    }
  }, [publico, segmentoLead, searchFilter, leads.length, parceiros.length, excluirCampanhaRecente, diasCampanhaRecente]);

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

  const countRecentes = classifiedLeads.filter(l => !l.optout && l.status !== 'fechado' && l.status !== 'realizado' && !hasLeadContactHistory(l)).length;
  const countEsfriando = classifiedLeads.filter(l => !l.optout && l.status !== 'fechado' && l.status !== 'realizado' && l._tempStatus === 'esfriando').length;
  const countEsfriou = classifiedLeads.filter(l => !l.optout && l.status !== 'fechado' && l.status !== 'realizado' && l._tempStatus === 'esfriou').length;
  const countNegociacao = classifiedLeads.filter(l => !l.optout && l.status === 'negociacao').length;
  const countFechados = classifiedLeads.filter(l => !l.optout && (l.status === 'fechado' || l.status === 'realizado')).length;
  const countAbertos = classifiedLeads.filter(l => !l.optout && l.status !== 'fechado' && l.status !== 'realizado').length;

  const aplicarTemplate = (tplKey) => {
    const tpl = TEMPLATES_SUGERIDOS[tplKey];
    if (tpl) {
      setMensagem(tpl.text);
      setPreviewSeed(prev => prev + 1);
      showToast(`Template aplicado!`);
    }
  };

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

    return processSpintax(txt);
  };

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
      `Deseja realmente disparar esta campanha para ${count} ${publicoLabel} via Evolution API?\n\n🛡️ Proteção Anti-Ban Ativa:\n• Simulação de digitação (digitando...)\n• Intervalo humanizado de 4s a 7s por envio\n• Pausa de resfriamento a cada 8 mensagens\n• Variações Spintax ativas`,
      async () => {
        setDisparando(true);
        setProgresso({ total: count, sucesso: 0, erro: 0, status: 'Iniciando envio humanizado...' });

        try {
          const evUrl = evolutionApi?.url || process.env.NEXT_PUBLIC_WPP_API_URL || 'https://api.gabryelamaro.com';
          const evKey = evolutionApi?.apikey || process.env.NEXT_PUBLIC_WPP_API_KEY || '';
          const evInstance = evolutionApi?.instance || 'BarmanJF';

          if (!evUrl || !evKey || !evInstance) {
            showToast('Evolution API não configurada corretamente.', 'error');
            setDisparando(false);
            return;
          }

          const baseUrl = evUrl.endsWith('/') ? evUrl.slice(0, -1) : evUrl;
          const instance = evInstance;
          const apiKey = evKey;

          const isLeads = publico === 'leads';
          const targetList = currentTargetItems.filter(item => {
            const id = isLeads ? item.id : item.slug;
            return selectedIds.includes(id);
          });

          const campanhaId = `camp_${Date.now()}`;
          const agoraIso = new Date().toISOString();

          // Registra início da campanha no Firebase com sessão autenticada em config/campanhas
          try {
            await set(ref(db, `config/campanhas/${campanhaId}`), {
              id: campanhaId,
              publico: isLeads ? 'leads' : 'parceiros',
              segmentoLead: isLeads ? segmentoLead : null,
              mensagem,
              tipo,
              midia: midia ? midia.trim() : '',
              criadaEm: agoraIso,
              status: 'em_andamento',
              antiBan: {
                spintaxAtivo: true,
                typingSimulated: true,
                jitterDelay: '4s-7s + pausas de lote'
              },
              total: targetList.length,
              sucesso: 0,
              erro: 0,
              resultados: {}
            });
          } catch (errDb) {
            console.warn('Aviso: Registro no Firebase ignorado:', errDb?.message);
          }

          let sucessoCount = 0;
          let erroCount = 0;
          const resultados = {};

          for (let i = 0; i < targetList.length; i++) {
            const item = targetList[i];
            const rawPhone = isLeads ? (item.telefone || item.whatsapp || '') : (item.whatsapp || '');
            const cleaned = cleanPhoneForWhatsApp(rawPhone);
            const itemKey = isLeads ? item.id : item.slug;
            const itemNome = isLeads ? `${item.nome || ''} ${item.sobrenome || ''}`.trim() : item.nome;

            setProgresso({
              total: targetList.length,
              sucesso: sucessoCount,
              erro: erroCount,
              status: `Enviando para ${itemNome} (${i + 1}/${targetList.length})...`
            });

            if (!cleaned || cleaned.length < 10) {
              erroCount++;
              resultados[itemKey] = {
                nome: itemNome,
                success: false,
                error: 'Número de telefone inválido ou incompleto'
              };
              continue;
            }

            // 1. Interpolação de texto + Spintax
            const textPersonalizado = isLeads
              ? interpolarLead(mensagem, item)
              : interpolarParceiro(mensagem, item, categorias);

            // 2. Simulação de digitação humana (2.0s a 3.5s)
            const typingDuration = getRandomInt(2000, 3500);
            await simulateTypingPresence(baseUrl, instance, apiKey, cleaned, typingDuration);
            await sleep(typingDuration);

            // 3. Montagem do payload de envio
            let sendEndpoint = `${baseUrl}/message/sendText/${instance}`;
            let sendPayload = {
              number: cleaned,
              text: textPersonalizado
            };

            if (tipo === 'imagem' && midia.trim()) {
              sendEndpoint = `${baseUrl}/message/sendMedia/${instance}`;
              sendPayload = {
                number: cleaned,
                mediatype: 'image',
                media: midia.trim(),
                caption: textPersonalizado
              };
            } else if (tipo === 'instagram' && midia.trim()) {
              sendPayload.text = `${textPersonalizado}\n\n👉 Confira nossa publicação: ${midia.trim()}`;
            }

            try {
              const response = await fetch(sendEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': apiKey
                },
                body: JSON.stringify(sendPayload)
              });

              if (response.ok) {
                sucessoCount++;
                const updateTime = new Date().toISOString();
                resultados[itemKey] = {
                  nome: itemNome,
                  success: true,
                  sentAt: updateTime
                };

                if (isLeads) {
                  await update(ref(db, `leads/${item.id}`), {
                    ultimoContato: updateTime,
                    ultimaCampanhaEm: updateTime
                  });
                  await push(ref(db, `leads/${item.id}/messages`), {
                    type: 'campanha_whatsapp',
                    number: cleaned,
                    success: true,
                    text: textPersonalizado,
                    sentAt: updateTime
                  });
                } else {
                  await set(ref(db, `config/cerimonialistas/${item.slug}/ultimoContato`), updateTime);
                }
              } else {
                erroCount++;
                const errText = await response.text();
                resultados[itemKey] = {
                  nome: itemNome,
                  success: false,
                  error: errText || 'Erro retornado pela Evolution API'
                };
              }
            } catch (err) {
              erroCount++;
              resultados[itemKey] = {
                nome: itemNome,
                success: false,
                error: err.message || 'Falha de conexão com Evolution API'
              };
            }

            // Atualiza progresso da campanha em tempo real no Firebase (config/campanhas)
            try {
              await update(ref(db, `config/campanhas/${campanhaId}`), {
                sucesso: sucessoCount,
                erro: erroCount,
                [`resultados/${itemKey}`]: resultados[itemKey]
              });
            } catch (errUpd) {
              console.warn('Aviso: Atualização de progresso ignorada:', errUpd?.message);
            }

            setProgresso({
              total: targetList.length,
              sucesso: sucessoCount,
              erro: erroCount,
              status: `Enviado para ${itemNome}! (${i + 1}/${targetList.length})`
            });

            // 4. Jitter delay humanizado entre envios (4s a 7s)
            if (i < targetList.length - 1) {
              setProgresso(prev => ({
                ...prev,
                status: `Aguardando intervalo anti-ban (${i + 1}/${targetList.length})...`
              }));
              const humanDelay = getRandomInt(4000, 7000);
              await sleep(humanDelay);

              // 5. Pausa de resfriamento a cada 8 envios
              if ((i + 1) % 8 === 0) {
                setProgresso(prev => ({
                  ...prev,
                  status: `Resfriando conexão (lote de 8 mensagens)... (${i + 1}/${targetList.length})`
                }));
                const batchCoolingPause = getRandomInt(15000, 25000);
                await sleep(batchCoolingPause);
              }
            }
          }

          // Finaliza campanha no Firebase
          try {
            await update(ref(db, `config/campanhas/${campanhaId}`), {
              status: 'concluida',
              concluidaEm: new Date().toISOString()
            });
          } catch (errFin) {
            console.warn('Aviso: Finalização no Firebase ignorada:', errFin?.message);
          }

          showToast(`Campanha finalizada! ${sucessoCount} enviadas com sucesso, ${erroCount} falhas.`, 'success');
        } catch (err) {
          console.error('Erro no disparo:', err);
          showToast(`Erro ao disparar campanha: ${err.message}`, 'error');
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
    <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', margin: '0 0 6px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
              Campanhas WhatsApp & Relacionamento
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Dispare mensagens personalizadas em lote para reaquecer clientes e engajar parceiros.
            </p>
          </div>

          {/* Badge Anti-Ban Shield */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '20px',
            background: 'rgba(76, 175, 80, 0.12)',
            border: '1px solid rgba(76, 175, 80, 0.35)',
            color: '#4CAF50',
            fontSize: '0.8rem',
            fontWeight: 600,
            maxWidth: '100%'
          }}>
            <FiShield size={16} style={{ flexShrink: 0 }} />
            <span>Anti-Ban Ativo (Spintax + Digitando + Delays)</span>
          </div>
        </div>
      </div>

      {/* ── SELETOR DE PÚBLICO-ALVO (LEADS vs PARCEIROS) ────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-input)',
        padding: '6px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px'
      }}>
        <button
          type="button"
          onClick={() => {
            setPublico('leads');
            aplicarTemplate('leads_esfriando');
          }}
          style={{
            flex: 1,
            padding: '12px 14px',
            minHeight: '46px',
            borderRadius: '10px',
            border: 'none',
            background: publico === 'leads' ? 'var(--primary)' : 'transparent',
            color: publico === 'leads' ? '#000' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <FiUsers size={17} />
          <span>Clientes ({leads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPublico('parceiros');
            aplicarTemplate('parceiros_mes');
          }}
          style={{
            flex: 1,
            padding: '12px 14px',
            minHeight: '46px',
            borderRadius: '10px',
            border: 'none',
            background: publico === 'parceiros' ? 'var(--primary)' : 'transparent',
            color: publico === 'parceiros' ? '#000' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <FaWhatsapp size={17} />
          <span>Parceiros ({parceiros.length})</span>
        </button>
      </div>

      {/* ── SEGMENTAÇÃO ESPECÍFICA PARA LEADS ────────────────────────── */}
      {publico === 'leads' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
            🎯 Segmentação de Leads
          </div>

          <div className="admin-campaign-segments-scroll">
            <button
              onClick={() => {
                setSegmentoLead('recentes');
                aplicarTemplate('leads_recentes');
              }}
              style={{
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'recentes' ? '#4CAF50' : 'var(--border-color)'}`,
                background: segmentoLead === 'recentes' ? 'rgba(76, 175, 80, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'recentes' ? '#4CAF50' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              🟢 Recentes ({countRecentes}) <span style={{ opacity: 0.7, fontSize: '0.74rem' }}>sem contato</span>
            </button>

            <button
              onClick={() => {
                setSegmentoLead('esfriando');
                aplicarTemplate('leads_esfriando');
              }}
              style={{
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'esfriando' ? '#FFD54F' : 'var(--border-color)'}`,
                background: segmentoLead === 'esfriando' ? 'rgba(255, 213, 79, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'esfriando' ? '#FFD54F' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              🟡 Esfriando ({countEsfriando}) <span style={{ opacity: 0.7, fontSize: '0.74rem' }}>7-14d</span>
            </button>

            <button
              onClick={() => {
                setSegmentoLead('esfriou');
                aplicarTemplate('leads_esfriou');
              }}
              style={{
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'esfriou' ? '#00E5FF' : 'var(--border-color)'}`,
                background: segmentoLead === 'esfriou' ? 'rgba(0, 229, 255, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'esfriou' ? '#00E5FF' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              🧊 Esfriou ({countEsfriou}) <span style={{ opacity: 0.7, fontSize: '0.74rem' }}>+15d</span>
            </button>

            <button
              onClick={() => {
                setSegmentoLead('negociacao');
                aplicarTemplate('leads_negociacao');
              }}
              style={{
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'negociacao' ? '#FF9800' : 'var(--border-color)'}`,
                background: segmentoLead === 'negociacao' ? 'rgba(255, 152, 0, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'negociacao' ? '#FF9800' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap'
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
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'fechado' ? '#4CAF50' : 'var(--border-color)'}`,
                background: segmentoLead === 'fechado' ? 'rgba(76, 175, 80, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'fechado' ? '#4CAF50' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              🏆 Fechados ({countFechados})
            </button>

            <button
              onClick={() => setSegmentoLead('todos')}
              style={{
                padding: '8px 14px',
                minHeight: '40px',
                borderRadius: '20px',
                border: `1px solid ${segmentoLead === 'todos' ? 'var(--primary)' : 'var(--border-color)'}`,
                background: segmentoLead === 'todos' ? 'rgba(203, 161, 83, 0.18)' : 'var(--bg-input)',
                color: segmentoLead === 'todos' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              ✨ Todos em Aberto ({countAbertos})
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE SUB-TABS (Toggle entre Criar e Prévia em telas pequenas) ──────── */}
      <div style={{
        display: 'none',
        gap: '8px',
        marginBottom: '16px'
      }} className="admin-campaign-mobile-tabs">
        <button
          type="button"
          onClick={() => setMobileActiveTab('editor')}
          style={{
            flex: 1,
            padding: '10px 12px',
            minHeight: '42px',
            borderRadius: '10px',
            border: `1px solid ${mobileActiveTab === 'editor' ? 'var(--primary)' : 'var(--border-color)'}`,
            background: mobileActiveTab === 'editor' ? 'rgba(203, 161, 83, 0.15)' : 'var(--bg-card)',
            color: mobileActiveTab === 'editor' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiEdit3 size={15} />
          <span>1. Configurar Campanha</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveTab('preview')}
          style={{
            flex: 1,
            padding: '10px 12px',
            minHeight: '42px',
            borderRadius: '10px',
            border: `1px solid ${mobileActiveTab === 'preview' ? 'var(--primary)' : 'var(--border-color)'}`,
            background: mobileActiveTab === 'preview' ? 'rgba(203, 161, 83, 0.15)' : 'var(--bg-card)',
            color: mobileActiveTab === 'preview' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiEye size={15} />
          <span>2. Prévia WhatsApp</span>
        </button>
      </div>

      {/* Grid Principal: Form + Preview */}
      <div className="admin-campaign-grid">
        
        {/* Painel de Criação (Editor) */}
        <div 
          className="admin-campaign-card"
          style={{
            background: 'var(--bg-input)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-color)',
            borderTop: '4px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiSend style={{ color: 'var(--primary)' }} /> Nova Mensagem ({publico === 'leads' ? 'Clientes' : 'Parceiros'})
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiZap size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Spintax e IA ativos</span>
            </div>
          </div>

          {/* Formato do Envio */}
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Formato da Mensagem
            </label>
            <div className="admin-campaign-format-grid">
              <button
                type="button"
                onClick={() => setTipo('texto')}
                className="admin-campaign-format-btn"
                style={{
                  padding: '10px',
                  minHeight: '46px',
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
                  transition: 'all 0.2s',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <FiFileText size={18} />
                <span>Só Texto</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('imagem')}
                className="admin-campaign-format-btn"
                style={{
                  padding: '10px',
                  minHeight: '46px',
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
                  transition: 'all 0.2s',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <FiImage size={18} />
                <span>Com Imagem (S3)</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('instagram')}
                className="admin-campaign-format-btn"
                style={{
                  padding: '10px',
                  minHeight: '46px',
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
                  transition: 'all 0.2s',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <FiInstagram size={18} />
                <span>Link Instagram</span>
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
                style={{ minHeight: '44px' }}
              />
            </div>
          )}

          {/* Mensagem Template */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Mensagem do WhatsApp (Spintax <code>{"{Opção 1|Opção 2}"}</code>)
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--primary)' }}>
                {publico === 'leads' 
                  ? '{{nome}}, {{tipoEvento}}, {{dataEvento}}, {{cidade}}, {{pacote}}'
                  : '{{nome}}, {{categorias}}, {{mes}}'}
              </span>
            </div>
            <textarea
              className="form-input"
              rows={7}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite o texto da campanha..."
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', fontSize: '0.9rem' }}
            />
          </div>

          {/* Lista de Seleção de Destinatários */}
          <div>
            <div className="admin-campaign-recipients-header">
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Destinatários ({selectedIds.length} de {currentTargetItems.length})
              </label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: '320px', justifyContent: 'flex-end' }}>
                <div className="admin-campaign-search-box">
                  <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar destinatário..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px 6px 30px',
                      minHeight: '38px',
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem'
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
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                    padding: '4px'
                  }}
                >
                  {selectedIds.length === currentTargetItems.length ? 'Desmarcar' : 'Todos'}
                </button>
              </div>
            </div>

            {/* Controle Anti-Repetição de Campanha para Leads */}
            {publico === 'leads' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px 12px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: 'rgba(255, 152, 0, 0.08)',
                border: '1px solid rgba(255, 152, 0, 0.25)',
                fontSize: '0.8rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={excluirCampanhaRecente}
                    onChange={(e) => setExcluirCampanhaRecente(e.target.checked)}
                    style={{ accentColor: '#FF9800', width: '16px', height: '16px' }}
                  />
                  <span>Não reenviar para quem já recebeu campanha recente</span>
                </label>

                {excluirCampanhaRecente && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nos últimos:</span>
                    <select
                      value={diasCampanhaRecente}
                      onChange={(e) => setDiasCampanhaRecente(Number(e.target.value))}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={7}>7 dias</option>
                      <option value={15}>15 dias</option>
                      <option value={30}>30 dias</option>
                      <option value={0}>Sempre (qualquer data)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div style={{
              maxHeight: '190px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'var(--bg-card)',
              WebkitOverflowScrolling: 'touch'
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
                  const campInfo = publico === 'leads' ? item._campaignInfo : null;
                  const hasCampRecente = campInfo && campInfo.received;

                  return (
                    <label
                      key={itemId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 10px',
                        minHeight: '44px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(203, 161, 83, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        opacity: hasCampRecente && isLeadCampaignExcluded(item) && !isSelected ? 0.7 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(itemId)}
                        style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.nome} {item.sobrenome || ''}
                        </div>
                        {publico === 'leads' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.tipoEvento || 'Festa'} {item.dataEvento ? `• ${formatDateBr(item.dataEvento)}` : ''} {item.cidade ? `• ${item.cidade}` : ''}
                          </div>
                        )}
                      </div>
                      
                      {/* Badge de Fechado / Realizado se estiver na aba de Fechados */}
                      {publico === 'leads' && segmentoLead === 'fechado' && (
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          flexShrink: 0,
                          background: item.status === 'realizado' ? 'rgba(33, 150, 243, 0.18)' : 'rgba(76, 175, 80, 0.18)',
                          color: item.status === 'realizado' ? '#2196F3' : '#4CAF50',
                          border: `1px solid ${item.status === 'realizado' ? 'rgba(33, 150, 243, 0.35)' : 'rgba(76, 175, 80, 0.35)'}`
                        }}>
                          {item.status === 'realizado' ? '🎉 Realizado' : '🏆 Fechado'}
                        </span>
                      )}

                      {/* Badge de Campanha Recente */}
                      {hasCampRecente && (
                        <span 
                          title={`Já recebeu disparo de campanha ${campInfo.daysAgo === 0 ? 'hoje' : `há ${campInfo.daysAgo} dias`}`}
                          style={{
                            fontSize: '0.68rem',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            flexShrink: 0,
                            background: 'rgba(255, 152, 0, 0.18)',
                            color: '#FF9800',
                            border: '1px solid rgba(255, 152, 0, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📢 {campInfo.daysAgo === 0 ? 'Hoje' : `${campInfo.daysAgo}d atrás`}
                        </span>
                      )}

                      <span style={{
                        fontSize: '0.72rem',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        flexShrink: 0,
                        background: segmentoLead === 'recentes' ? 'rgba(76, 175, 80, 0.15)' : (days === null || days >= 15 ? 'rgba(0, 229, 255, 0.15)' : (days >= 7 ? 'rgba(255, 213, 79, 0.15)' : 'rgba(76, 175, 80, 0.15)')),
                        color: segmentoLead === 'recentes' ? '#4CAF50' : (days === null || days >= 15 ? '#00E5FF' : (days >= 7 ? '#FFD54F' : '#4CAF50'))
                      }}>
                        {segmentoLead === 'recentes' ? formatTimeAgo(item.criadoEm) : (days === null ? 'Sem contato' : `${days}d`)}
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
              minHeight: '52px',
              fontSize: '0.98rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '4px',
              width: '100%',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {disparando ? (
              <>
                <div className="btn__spinner" />
                <span>Disparando Campanha...</span>
              </>
            ) : (
              <>
                <FaWhatsapp size={20} />
                <span>Disparar para {selectedIds.length} {publico === 'leads' ? 'Cliente(s)' : 'Parceiro(s)'}</span>
              </>
            )}
          </button>

          {/* Barra de Progresso em Tempo Real */}
          {disparando && (
            <div style={{
              background: 'rgba(203, 161, 83, 0.1)',
              border: '1px solid rgba(203, 161, 83, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{progresso.status}</span>
                <span style={{ color: 'var(--text-muted)' }}>{progresso.sucesso + progresso.erro} / {progresso.total}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progresso.total > 0 ? ((progresso.sucesso + progresso.erro) / progresso.total) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--primary)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: '#4CAF50' }}>✅ {progresso.sucesso} enviadas</span>
                {progresso.erro > 0 && <span style={{ color: '#F44336' }}>❌ {progresso.erro} falhas</span>}
              </div>
            </div>
          )}
        </div>

        {/* Painel de Preview ao Vivo (Estilo WhatsApp) */}
        <div 
          className="admin-campaign-card"
          style={{
            background: 'var(--bg-input)',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              📱 Prévia no WhatsApp
            </h3>
            
            <button
              type="button"
              onClick={() => setPreviewSeed(prev => prev + 1)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '6px 10px',
                minHeight: '34px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Testar outra variação de Spintax aleatória"
            >
              <FiRefreshCw size={12} /> Testar Variação Spintax
            </button>
          </div>

          <div style={{
            background: '#0b141a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px 14px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            minHeight: '220px'
          }}>
            {/* Header Mockup */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '14px'
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
                fontSize: '0.9rem',
                flexShrink: 0
              }}>
                {(sampleItem.nome || 'C').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sampleItem.nome} {sampleItem.sobrenome || ''}
                </div>
                <div style={{ color: '#25D366', fontSize: '0.72rem' }}>
                  Digitando... (Simulação Ativa)
                </div>
              </div>
            </div>

            {/* Balão de Mensagem */}
            <div style={{
              background: '#005c4b',
              color: '#e9edef',
              borderRadius: '8px 8px 2px 8px',
              padding: '12px 14px',
              maxWidth: '96%',
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
                  maxHeight: '180px',
                  background: '#000'
                }}>
                  <img
                    src={midia}
                    alt="Campanha"
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.86rem', lineHeight: 1.5 }}>
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

          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#4CAF50', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <FiShield size={14} style={{ flexShrink: 0 }} /> Cada lead receberá uma variação única com intervalo randômico de 4s a 7s.
          </div>
        </div>

      </div>

      {/* Histórico de Campanhas */}
      <div style={{ marginTop: '8px' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 14px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
          Histórico de Campanhas Disparadas
        </h2>

        {campanhas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 20px',
            background: 'var(--bg-input)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)',
            fontSize: '0.88rem'
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
                    padding: '14px 16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: isLeadCampaign ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                        color: isLeadCampaign ? '#00E5FF' : 'var(--primary)',
                        fontWeight: 700
                      }}>
                        {isLeadCampaign ? '👥 CLIENTES' : '🤝 PARCEIROS'}
                      </span>

                      <span style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {camp.tipo || 'texto'}
                      </span>

                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <FiClock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {dataFormatada}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
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
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: camp.status === 'concluida' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                        color: camp.status === 'concluida' ? '#4CAF50' : '#FFC107'
                      }}>
                        {camp.status === 'concluida' ? 'Concluída' : 'Em andamento'}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    background: 'var(--bg-card)',
                    padding: '10px 12px',
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
          left: '24px',
          background: 'rgba(14, 26, 18, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${
            toast.type === 'success' ? '#4CAF50' : 
            toast.type === 'error' ? '#F44336' : '#FFD54F'
          }`,
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '380px',
          margin: '0 auto',
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
          <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: '500', lineHeight: 1.4 }}>
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
          padding: '16px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.1rem' }}>
              {confirmModal.title}
            </h3>
            <div style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {confirmModal.message}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={confirmModal.onCancel}
                className="btn btn--outline"
                style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '42px', height: 'auto', width: 'auto', flex: 'none' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="btn btn--primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', minHeight: '42px', height: 'auto', width: 'auto', flex: 'none', color: 'var(--bg-dark)' }}
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
