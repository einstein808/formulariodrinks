import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { getCustoValor, parseCriadoEm, detectCategoryByDescription } from '@/lib/utils';
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJIS, CUSTOS_CATEGORIAS_DEFAULT } from '@/lib/constants';

export const COLORS = ['#00E5FF', '#FFD54F', '#4CAF50', '#F44336', '#9C27B0', '#FF9800'];

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
  const { selectedYear = 'todos', selectedMonth = 'todos', selectedStatus = 'todos' } = filters;

  const [leads, setLeads] = useState([]);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [custosCategorias, setCustosCategorias] = useState(CUSTOS_CATEGORIAS_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLeads(Object.entries(data).map(([id, val]) => ({ id, ...val })));
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
      let date = null;
      if (lead.dataEvento) {
        date = new Date(lead.dataEvento + 'T00:00:00');
      } else if (lead.criadoEm) {
        date = parseCriadoEm(lead.criadoEm);
      }
      return date && !isNaN(date.getTime()) ? date.getFullYear().toString() : null;
    }).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [leads]);

  const metrics = useMemo(() => {
    // 1. Pacotes Pie Data
    const pacotesCount = {};
    leads.forEach(lead => {
      const pacote = normalizePackageName(lead.pacote);
      pacotesCount[pacote] = (pacotesCount[pacote] || 0) + 1;
    });
    const pieData = Object.keys(pacotesCount).map(key => ({
      name: key,
      value: pacotesCount[key]
    })).sort((a, b) => b.value - a.value);

    // 2. Tipos de Evento Pie Data
    const tipoEventoCount = {};
    leads.forEach(lead => {
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
    leads.forEach(lead => {
      if ((lead.status === 'fechado' || lead.status === 'realizado') && lead.dataEvento) {
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
    leads.forEach(lead => {
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
    leads.forEach(lead => {
      const s = lead.status || 'leads';
      statusCount[s] = (statusCount[s] || 0) + 1;
    });
    const pipelineData = [
      { name: 'Novos', value: statusCount['leads'] || statusCount['novo'] || 0, color: '#00E5FF' },
      { name: 'Em Negociação', value: statusCount['negociacao'] || 0, color: '#FFD54F' },
      { name: 'Fechados', value: statusCount['fechado'] || 0, color: '#4CAF50' },
      { name: 'Realizados', value: statusCount['realizado'] || 0, color: '#9E9E9E' },
      { name: 'Perdidos', value: statusCount['perdido'] || 0, color: '#F44336' }
    ].filter(d => d.value > 0);

    // 6. Ranking de Parceiros
    const rankingParceiros = Object.entries(cerimonialistas).map(([slug, cerim]) => {
      const leadsDoParc = leads.filter(l => l.cerimonialista === slug);
      const fechados = leadsDoParc.filter(l => l.status === 'fechado' || l.status === 'realizado').length;
      const total = leadsDoParc.length;
      const conversao = total > 0 ? Math.round((fechados / total) * 100) : 0;
      return { slug, nome: cerim.nome, total, fechados, conversao };
    }).sort((a, b) => b.fechados - a.fechados || b.total - a.total);

    const leadsDiretos = leads.filter(l => !l.cerimonialista);
    const fechadosDiretos = leadsDiretos.filter(l => l.status === 'fechado' || l.status === 'realizado').length;

    // 7. Financeiro Filtrado
    let totalFaturamento = 0;
    let totalValorPago = 0;
    let totalCustosGlobal = 0;
    const financeiroPorLead = [];
    const financeiroMensal = {};

    const custosPorCategoria = {};
    custosCategorias.forEach(c => {
      custosPorCategoria[c.id] = 0;
    });
    if (custosPorCategoria.outros === undefined) {
      custosPorCategoria.outros = 0;
    }

    leads.forEach(lead => {
      const fin = lead.financeiro;
      if (!fin) return;

      let date = null;
      if (lead.dataEvento) {
        date = new Date(lead.dataEvento + 'T00:00:00');
      } else if (lead.criadoEm) {
        date = parseCriadoEm(lead.criadoEm);
      }

      let leadYear = 'Sem Data';
      let leadMonth = 'Sem Data';
      if (date && !isNaN(date.getTime())) {
        leadYear = date.getFullYear().toString();
        leadMonth = String(date.getMonth() + 1).padStart(2, '0');
      }

      // Filtros
      if (selectedYear !== 'todos' && leadYear !== selectedYear) return;
      if (selectedMonth !== 'todos' && leadMonth !== selectedMonth) return;
      if (selectedStatus !== 'todos' && lead.status !== selectedStatus) return;

      const fatBruto = parseFloat(fin.faturamento) || 0;
      const desc = parseFloat(fin.desconto) || 0;
      const fat = fatBruto - desc;
      const pago = parseFloat(fin.valorPago) || 0;
      const rest = Math.max(0, fat - pago);
      const custos = fin.custos ? Object.values(fin.custos) : [];
      const totCustos = custos.reduce((acc, c) => acc + getCustoValor(c), 0);
      const luc = fat - totCustos;
      const marg = fat > 0 ? (luc / fat) * 100 : 0;

      totalFaturamento += fat;
      totalValorPago += pago;
      totalCustosGlobal += totCustos;

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
      if (date && !isNaN(date.getTime())) {
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        mesFormatado = `${mes}/${ano}`;
        sortKey = `${ano}-${mes}`;
      }

      financeiroPorLead.push({
        id: lead.id,
        nome: nomeCliente,
        status: lead.status,
        data: lead.dataEvento || '—',
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
    const totalValorRestante = totalFaturamento - totalValorPago;
    const margemGlobalMedia = totalFaturamento > 0 ? (totalLucroGlobal / totalFaturamento) * 100 : 0;

    const totalLeads = leads.length;
    const totalFechados = leads.filter(l => l.status === 'fechado' || l.status === 'realizado').length;
    const taxaConversao = totalLeads > 0 ? Math.round((totalFechados / totalLeads) * 100) : 0;
    const ticketMedio = totalFechados > 0 ? totalFaturamento / totalFechados : 0;

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
    const sortedFinancePorLead = [...financeiroPorLead].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    return {
      pieData,
      tipoEventoPieData,
      barData,
      lineData,
      pipelineData,
      rankingParceiros,
      leadsDiretos,
      fechadosDiretos,
      totalFaturamento,
      totalValorPago,
      totalCustosGlobal,
      totalLucroGlobal,
      totalValorRestante,
      margemGlobalMedia,
      totalLeads,
      totalFechados,
      taxaConversao,
      ticketMedio,
      sortedCategories,
      monthlyFinanceData,
      sortedFinancePorLead
    };
  }, [leads, cerimonialistas, custosCategorias, selectedYear, selectedMonth, selectedStatus]);

  return {
    leads,
    cerimonialistas,
    custosCategorias,
    loading,
    availableYears,
    ...metrics
  };
}