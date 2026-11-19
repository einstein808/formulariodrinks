import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { getCustoValor, parseCriadoEm, detectCategoryByDescription } from '@/lib/utils';
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS, CUSTOS_CATEGORIAS_DEFAULT } from '@/lib/constants';
import { isMergedLead } from '@/lib/leadDeduplication';

export const COLORS = ['#00E5FF', '#FFD54F', '#4CAF50', '#F44336', '#9C27B0', '#FF9800'];

function normalizeLeadStatus(status) {
  const clean = String(status || 'novo').trim().toLowerCase();
  return clean === 'leads' ? 'novo' : clean;
}

function getMetricDate(lead, dateBasis) {
  if (dateBasis === 'evento') {
    if (!lead.dataEvento) return null;
    const parsed = new Date(`${String(lead.dataEvento).slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = parseCriadoEm(lead.criadoEm);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

export function normalizePackageName(name) {
  if (!name) return 'Não informado';
  const clean = name.trim().toLowerCase();
  
  if (clean.includes('mao') || clean.includes('mão') || clean.includes('obra')) {
    return 'Mão de Obra';
  }
  if (clean.includes('frozen')) {
    return 'Standard Frozen';
  }
  if (clean.includes('standard')) {
    return 'Standard';
  }
  if (clean.includes('premium')) {
    return 'Premium';
  }
  
  return name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function normalizeEventType(tipo) {
  if (!tipo) return 'Não informado';
  const clean = tipo.trim().toLowerCase();
  if (clean.includes('casamento')) return 'Casamento';
  if (clean.includes('aniversário') || clean.includes('aniversario') || clean.includes('niver')) return 'Aniversário';
  if (clean.includes('formatura')) return 'Formatura';
  if (clean.includes('corporativo') || clean.includes('empresa')) return 'Corporativo';
  if (clean.includes('confraternização') || clean.includes('confraternizacao') || clean.includes('confra')) return 'Confraternização';
  if (clean.includes('chá bar') || clean.includes('cha bar') || clean.includes('chabar')) return 'Chá Bar';
  if (clean.includes('debutante') || clean.includes('15 anos') || clean.includes('quinze')) return 'Debutante';
  return tipo.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function useDashboardData(filters = {}) {
  const {
    selectedYear = 'todos',
    selectedMonth = 'todos',
    selectedStatus = 'todos',
    selectedDateBasis = 'cadastro'
  } = filters;

  const [leads, setLeads] = useState([]);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [custosCategorias, setCustosCategorias] = useState(CUSTOS_CATEGORIAS_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLeads(Object.entries(data).map(([id, val]) => ({ id, ...val })).filter(lead => !isMergedLead(lead)));
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    const cerimRef = ref(db, 'config/cerimonialistas');
    const unsubCerim = onValue(cerimRef, (snap) => {
      setCerimonialistas(snap.exists() ? snap.val() : {});
    });

    const catsRef = ref(db, 'config/custosCategorias');
    const unsubCats = onValue(catsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setCustosCategorias(arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } else {
        setCustosCategorias(CUSTOS_CATEGORIAS_DEFAULT);
      }
    });

    return () => {
      unsubLeads();
      unsubCerim();
      unsubCats();
    };
  }, []);

  const availableYears = useMemo(() => {
    return Array.from(new Set(leads.map(lead => {
      const date = getMetricDate(lead, selectedDateBasis);
      return date ? date.getFullYear().toString() : null;
    }).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [leads, selectedDateBasis]);

  const cohortLeads = useMemo(() => leads.filter(lead => {
    if (selectedYear === 'todos' && selectedMonth === 'todos') return true;
    const date = getMetricDate(lead, selectedDateBasis);
    if (!date) return false;
    if (selectedYear !== 'todos' && date.getFullYear().toString() !== selectedYear) return false;
    if (selectedMonth !== 'todos' && String(date.getMonth() + 1).padStart(2, '0') !== selectedMonth) return false;
    return true;
  }), [leads, selectedYear, selectedMonth, selectedDateBasis]);

  const filteredLeads = useMemo(() => {
    if (selectedStatus === 'todos') return cohortLeads;
    return cohortLeads.filter(lead => normalizeLeadStatus(lead.status) === normalizeLeadStatus(selectedStatus));
  }, [cohortLeads, selectedStatus]);

  const metrics = useMemo(() => {
    // 1. Pacotes Pie Data
    const pacotesCount = {};
    filteredLeads.forEach(lead => {
      const pacote = normalizePackageName(lead.pacote);
      pacotesCount[pacote] = (pacotesCount[pacote] || 0) + 1;
    });
    const pieData = Object.keys(pacotesCount).map(key => ({
      name: key,
      value: pacotesCount[key]
    })).sort((a, b) => b.value - a.value);

    // 2. Tipos de Evento Pie Data
    const tipoEventoCount = {};
    filteredLeads.forEach(lead => {
      const tipo = normalizeEventType(lead.tipoEvento);
      tipoEventoCount[tipo] = (tipoEventoCount[tipo] || 0) + 1;
    });
    const tipoEventoPieData = Object.keys(tipoEventoCount).map(key => ({
      name: key,
      value: tipoEventoCount[key],
      color: EVENT_TYPE_COLORS[key] || '#a8b8aa',
      emoji: EVENT_TYPE_EMOJIS[key] || '✨'
    })).sort((a, b) => b.value - a.value);

    // 3. Sazonalidade dos Eventos Fechados
    const mesesCount = {};
    filteredLeads.forEach(lead => {
      if ((normalizeLeadStatus(lead.status) === 'fechado' || normalizeLeadStatus(lead.status) === 'realizado') && lead.dataEvento) {
        const [ano, mes] = lead.dataEvento.split('-');
        const mesFormatado = `${mes}/${ano}`;
        mesesCount[mesFormatado] = (mesesCount[mesFormatado] || 0) + 1;
      }
    });
    const barData = Object.keys(mesesCount).map(key => ({
      name: key,
      Eventos: mesesCount[key]
    })).sort((a, b) => {
      const [mesA, anoA] = a.name.split('/');
      const [mesB, anoB] = b.name.split('/');
      return new Date(`${anoA}-${mesA}-01`) - new Date(`${anoB}-${mesB}-01`);
    });

    // 4. Captação de Leads no tempo
    const captacaoCount = {};
    filteredLeads.forEach(lead => {
      if (lead.criadoEm) {
        const date = parseCriadoEm(lead.criadoEm);
        if (date && !isNaN(date.getTime())) {
          const mes = String(date.getMonth() + 1).padStart(2, '0');
          const ano = date.getFullYear();
          const mesFormatado = `${mes}/${ano}`;
          captacaoCount[mesFormatado] = (captacaoCount[mesFormatado] || 0) + 1;
        }
      }
    });
    const lineData = Object.keys(captacaoCount).map(key => ({
      name: key,
      Leads: captacaoCount[key]
    })).sort((a, b) => {
      const [mesA, anoA] = a.name.split('/');
      const [mesB, anoB] = b.name.split('/');
      return new Date(`${anoA}-${mesA}-01`) - new Date(`${anoB}-${mesB}-01`);
    });

    // 5. Pipeline / Funil
    const statusCount = {};
    filteredLeads.forEach(lead => {
      const s = normalizeLeadStatus(lead.status);
      statusCount[s] = (statusCount[s] || 0) + 1;
    });
    const pipelineData = [
      { name: 'Novos', value: statusCount['novo'] || 0, color: '#00E5FF' },
      { name: 'Em Negociação', value: statusCount['negociacao'] || 0, color: '#FFD54F' },
      { name: 'Fechados', value: statusCount['fechado'] || 0, color: '#4CAF50' },
      { name: 'Realizados', value: statusCount['realizado'] || 0, color: '#9E9E9E' },
      { name: 'Perdidos', value: statusCount['perdido'] || 0, color: '#F44336' }
    ].filter(d => d.value > 0);

    // 6. Ranking de Parceiros
    const rankingParceiros = Object.entries(cerimonialistas).map(([slug, cerim]) => {
      const leadsDoParc = cohortLeads.filter(l => l.cerimonialista === slug);
      const fechados = leadsDoParc.filter(l => ['fechado', 'realizado'].includes(normalizeLeadStatus(l.status))).length;
      const total = leadsDoParc.length;
      const conversao = total > 0 ? Math.round((fechados / total) * 100) : 0;
      return { slug, nome: cerim.nome, total, fechados, conversao };
    }).sort((a, b) => b.fechados - a.fechados || b.total - a.total);

    const leadsDiretos = cohortLeads.filter(l => !l.cerimonialista);
    const fechadosDiretos = leadsDiretos.filter(l => ['fechado', 'realizado'].includes(normalizeLeadStatus(l.status))).length;

    // Experimentos A/B usam a coorte completa, sem segmentar pelo status selecionado.
    const abGroups = {};
    cohortLeads.forEach(lead => {
      const group = ['A', 'B'].includes(String(lead.abGroup || '').toUpperCase())
        ? String(lead.abGroup).toUpperCase()
        : 'Sem grupo';
      if (!abGroups[group]) abGroups[group] = { grupo: group, leads: 0, fechados: 0, perdidos: 0, faturamento: 0 };
      const entry = abGroups[group];
      entry.leads += 1;
      const status = normalizeLeadStatus(lead.status);
      if (status === 'fechado' || status === 'realizado') {
        entry.fechados += 1;
        const fin = lead.financeiro || {};
        entry.faturamento += Math.max(0, (parseFloat(fin.faturamento) || 0) - (parseFloat(fin.desconto) || 0));
      }
      if (status === 'perdido') entry.perdidos += 1;
    });
    const abPerformanceData = Object.values(abGroups)
      .map(entry => ({
        ...entry,
        conversao: entry.leads ? Math.round((entry.fechados / entry.leads) * 100) : 0,
        taxaResolvidos: entry.fechados + entry.perdidos
          ? Math.round((entry.fechados / (entry.fechados + entry.perdidos)) * 100)
          : 0,
      }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo));

    // 7. Financeiro Filtrado
    let totalFaturamento = 0;
    let totalValorPago = 0;
    let totalCustosGlobal = 0;
    let totalOportunidadeAberta = 0;
    let eventosComFaturamento = 0;
    let contratosSemFinanceiro = 0;
    let contratosSemCustos = 0;
    let contratosComDivergenciaPagamento = 0;
    let totalValorAcimaDoContrato = 0;
    let totalRecebidoComData = 0;
    let totalRecebidoSemData = 0;
    const financeiroPorLead = [];
    const financeiroMensal = {};
    const recebimentosMensais = {};

    const custosPorCategoria = {};
    custosCategorias.forEach(c => {
      custosPorCategoria[c.id] = 0;
    });
    if (custosPorCategoria.outros === undefined) {
      custosPorCategoria.outros = 0;
    }

    filteredLeads.forEach(lead => {
      const status = normalizeLeadStatus(lead.status);
      const isContracted = status === 'fechado' || status === 'realizado';
      const fin = lead.financeiro;
      const recebimentos = Object.values(fin?.recebimentos || {});
      let totalRecebimentosDetalhados = 0;
      recebimentos.forEach(recebimento => {
        const valor = parseFloat(recebimento.valor) || 0;
        if (valor <= 0) return;
        totalRecebimentosDetalhados += valor;
        const dataRecebimento = parseCriadoEm(recebimento.data);
        if (!dataRecebimento || Number.isNaN(dataRecebimento.getTime())) {
          totalRecebidoSemData += valor;
          return;
        }
        totalRecebidoComData += valor;
        const sortKey = `${dataRecebimento.getFullYear()}-${String(dataRecebimento.getMonth() + 1).padStart(2, '0')}`;
        const monthName = `${sortKey.slice(5, 7)}/${sortKey.slice(0, 4)}`;
        if (!recebimentosMensais[sortKey]) recebimentosMensais[sortKey] = { name: monthName, Recebido: 0, sortKey };
        recebimentosMensais[sortKey].Recebido += valor;
      });

      const valorPagoRegistrado = parseFloat(fin?.valorPago) || 0;
      if (valorPagoRegistrado > totalRecebimentosDetalhados) {
        totalRecebidoSemData += valorPagoRegistrado - totalRecebimentosDetalhados;
      }
      if (!fin) {
        if (isContracted) contratosSemFinanceiro += 1;
        return;
      }

      const fatBruto = parseFloat(fin.faturamento) || 0;
      const desc = parseFloat(fin.desconto) || 0;
      const fat = Math.max(0, fatBruto - desc);
      if (isContracted && fatBruto <= 0) contratosSemFinanceiro += 1;
      const pago = parseFloat(fin.valorPago) || 0;
      const rest = Math.max(0, fat - pago);
      const custos = fin.custos ? Object.values(fin.custos) : [];
      const totCustos = custos.reduce((acc, c) => acc + getCustoValor(c), 0);
      if (!isContracted) {
        if (status === 'novo' || status === 'negociacao') totalOportunidadeAberta += fat;
        return;
      }

      const luc = fat - totCustos;
      const marg = fat > 0 ? (luc / fat) * 100 : 0;

      totalFaturamento += fat;
      totalValorPago += pago;
      totalCustosGlobal += totCustos;
      eventosComFaturamento += fat > 0 ? 1 : 0;
      contratosSemCustos += totCustos <= 0 ? 1 : 0;
      if (pago > fat + 0.01) {
        contratosComDivergenciaPagamento += 1;
        totalValorAcimaDoContrato += pago - fat;
      }

      const date = getMetricDate(lead, selectedDateBasis);

      custos.forEach(c => {
        const valor = getCustoValor(c);
        const cat = c.categoria || detectCategoryByDescription(c.descricao);
        if (custosPorCategoria[cat] !== undefined) {
          custosPorCategoria[cat] += valor;
        } else {
          custosPorCategoria.outros = (custosPorCategoria.outros || 0) + valor;
        }
      });

      const nomeCliente = `${lead.nome || ''} ${lead.sobrenome || ''}`.trim() || 'Sem nome';

      let mesFormatado = 'Sem Data';
      let sortKey = '9999-99';
      if (date) {
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        mesFormatado = `${mes}/${ano}`;
        sortKey = `${ano}-${mes}`;
      }

      financeiroPorLead.push({
        id: lead.id,
        nome: nomeCliente,
        status: lead.status,
        periodo: date ? new Intl.DateTimeFormat('pt-BR').format(date) : '—',
        dataEvento: lead.dataEvento || '—',
        faturamento: fat,
        desconto: desc,
        pago: pago,
        restante: rest,
        custos: totCustos,
        lucro: luc,
        margem: marg,
        sortKey
      });

      if (mesFormatado !== 'Sem Data') {
        if (!financeiroMensal[mesFormatado]) {
          const initialMonth = {
            name: mesFormatado,
            FaturamentoBruto: 0,
            Desconto: 0,
            Faturamento: 0,
            Recebido: 0,
            Custos: 0,
            Lucro: 0,
            sortKey,
            outros: 0
          };
          custosCategorias.forEach(c => {
            initialMonth[c.id] = 0;
          });
          financeiroMensal[mesFormatado] = initialMonth;
        }
        const entry = financeiroMensal[mesFormatado];
        entry.FaturamentoBruto += fatBruto;
        entry.Desconto += desc;
        entry.Faturamento += fat;
        entry.Recebido += pago;
        entry.Custos += totCustos;
        entry.Lucro += luc;

        custos.forEach(c => {
          const valor = getCustoValor(c);
          const cat = c.categoria || detectCategoryByDescription(c.descricao);
          if (entry[cat] !== undefined) {
            entry[cat] += valor;
          } else {
            entry.outros = (entry.outros || 0) + valor;
          }
        });
      }
    });

    const totalLucroGlobal = totalFaturamento - totalCustosGlobal;
    const totalValorRestante = Math.max(0, totalFaturamento - totalValorPago);
    const margemGlobalMedia = totalFaturamento > 0 ? (totalLucroGlobal / totalFaturamento) * 100 : 0;

    // Conversão mede a coorte por período, sem ser distorcida pelo filtro de status.
    const totalLeads = cohortLeads.length;
    const totalFechados = cohortLeads.filter(l => ['fechado', 'realizado'].includes(normalizeLeadStatus(l.status))).length;
    const totalPerdidos = cohortLeads.filter(l => normalizeLeadStatus(l.status) === 'perdido').length;
    const totalEmAberto = cohortLeads.filter(l => ['novo', 'negociacao'].includes(normalizeLeadStatus(l.status))).length;
    const taxaConversao = totalLeads > 0 ? Math.round((totalFechados / totalLeads) * 100) : 0;
    const taxaFechamentoResolvidos = totalFechados + totalPerdidos > 0
      ? Math.round((totalFechados / (totalFechados + totalPerdidos)) * 100)
      : 0;
    const ticketMedio = eventosComFaturamento > 0 ? totalFaturamento / eventosComFaturamento : 0;

    // Sinaliza duplicatas prováveis sem excluir oportunidades automaticamente.
    const leadIdentityCounts = {};
    cohortLeads.forEach(lead => {
      const phone = String(lead.telefone || '').replace(/\D/g, '');
      const eventDate = String(lead.dataEvento || '').slice(0, 10);
      if (phone.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return;
      const key = `${phone}|${eventDate}`;
      leadIdentityCounts[key] = (leadIdentityCounts[key] || 0) + 1;
    });
    const possiveisDuplicados = Object.values(leadIdentityCounts)
      .reduce((total, count) => total + Math.max(0, count - 1), 0);

    const sortedCategories = Object.entries(custosPorCategoria)
      .map(([catId, total]) => {
        const catInfo = custosCategorias.find(c => c.id === catId) || { label: 'Outros / Diversos', color: '#a8b8aa', emoji: '✨' };
        return {
          id: catId,
          label: catInfo.label,
          color: catInfo.color,
          emoji: catInfo.emoji,
          total
        };
      })
      .sort((a, b) => b.total - a.total);

    const monthlyFinanceData = Object.values(financeiroMensal).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const monthlyCashFlowData = Object.values(recebimentosMensais).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const sortedFinancePorLead = [...financeiroPorLead].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    return {
      pieData,
      tipoEventoPieData,
      barData,
      lineData,
      pipelineData,
      rankingParceiros,
      abPerformanceData,
      leadsDiretos,
      fechadosDiretos,
      filteredLeads,
      totalFaturamento,
      totalValorPago,
      totalCustosGlobal,
      totalLucroGlobal,
      totalOportunidadeAberta,
      totalValorRestante,
      margemGlobalMedia,
      totalLeads,
      totalFechados,
      totalPerdidos,
      totalEmAberto,
      possiveisDuplicados,
      contratosSemFinanceiro,
      contratosSemCustos,
      contratosComDivergenciaPagamento,
      totalValorAcimaDoContrato,
      totalRecebidoComData,
      totalRecebidoSemData,
      taxaConversao,
      taxaFechamentoResolvidos,
      ticketMedio,
      sortedCategories,
      monthlyFinanceData,
      monthlyCashFlowData,
      sortedFinancePorLead
    };
  }, [filteredLeads, cohortLeads, cerimonialistas, custosCategorias, selectedDateBasis]);

  return {
    leads,
    cerimonialistas,
    custosCategorias,
    loading,
    availableYears,
    cohortLeads,
    ...metrics
  };
}
