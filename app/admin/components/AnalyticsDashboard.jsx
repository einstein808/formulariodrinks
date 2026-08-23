import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, ComposedChart, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { FiHeart, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import EventsMapHeatmap from './EventsMapHeatmap';

const COLORS = ['#00E5FF', '#FFD54F', '#4CAF50', '#F44336', '#9C27B0', '#FF9800'];

const EVENT_TYPE_COLORS = {
  'Casamento': '#E91E63',
  'Aniversário': '#FFD54F',
  'Formatura': '#4CAF50',
  'Corporativo': '#2196F3',
  'Confraternização': '#FF9800',
  'Chá Bar': '#CE93D8',
  'Debutante': '#F48FB1',
  'Outro': '#a8b8aa'
};

const EVENT_TYPE_EMOJIS = {
  'Casamento': '💍',
  'Aniversário': '🎂',
  'Formatura': '🎓',
  'Corporativo': '🏢',
  'Confraternização': '🎉',
  'Chá Bar': '🍸',
  'Debutante': '👑',
  'Outro': '✨'
};

const getCustoValor = (c) => {
  if (!c) return 0;
  const q = parseFloat(c.quantidade) || 0;
  const u = parseFloat(c.valorUnitario) || 0;
  if (q > 0 && u > 0) return q * u;
  return parseFloat(c.valor) || 0;
};

export default function AnalyticsDashboard() {
  const [leads, setLeads] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [loading, setLoading] = useState(true);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState('todas');
  const [custosCategorias, setCustosCategorias] = useState([]);

  const [selectedYear, setSelectedYear] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedMonth, setSelectedMonth] = useState('todos');

  useEffect(() => {
    if (leads.length > 0) {
      const years = Array.from(new Set(leads.map(lead => {
        let date = null;
        if (lead.dataEvento) {
          date = new Date(lead.dataEvento + 'T00:00:00');
        } else if (lead.criadoEm) {
          date = parseCriadoEm(lead.criadoEm);
        }
        return date && !isNaN(date.getTime()) ? date.getFullYear().toString() : null;
      }).filter(Boolean)));

      const currentYearStr = new Date().getFullYear().toString();
      if (years.includes(currentYearStr)) {
        setSelectedYear(currentYearStr);
      } else if (years.length > 0) {
        years.sort((a, b) => b.localeCompare(a));
        setSelectedYear(years[0]);
      }
    }
  }, [leads]);

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
        // Convert to array and sort by order
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setCustosCategorias(arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } else {
        setCustosCategorias([
          { id: 'insumos', label: 'Insumos / Bebidas', color: '#00E5FF', emoji: '🧃', order: 0 },
          { id: 'equipe', label: 'Mão de Obra / Equipe', color: '#FFD54F', emoji: '👥', order: 1 },
          { id: 'logistica', label: 'Logística / Transporte', color: '#FF8A65', emoji: '🚚', order: 2 },
          { id: 'descartaveis', label: 'Descartáveis / Copos', color: '#EF5350', emoji: '🥤', order: 3 },
          { id: 'outros', label: 'Outros / Diversos', color: '#a8b8aa', emoji: '✨', order: 4 }
        ]);
      }
    });

    return () => { unsubLeads(); unsubCerim(); unsubCats(); };
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  // Helper to normalize package names across different inputs (ID vs display name, casing, accents)
  const normalizePackageName = (name) => {
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
  };

  // Helper to parse criadoEm dates robustly (handles numeric timestamps, numeric strings, and ISO strings)
  const parseCriadoEm = (val) => {
    if (!val) return null;
    if (typeof val === 'number') {
      return new Date(val);
    }
    if (typeof val === 'string') {
      if (/^\d+$/.test(val)) {
        return new Date(parseInt(val, 10));
      }
      return new Date(val);
    }
    return null;
  };

  // --- Processar Dados: Gráfico de Pizza (Pacotes) ---
  const pacotesCount = {};
  leads.forEach(lead => {
    const pacote = normalizePackageName(lead.pacote);
    pacotesCount[pacote] = (pacotesCount[pacote] || 0) + 1;
  });
  
  const pieData = Object.keys(pacotesCount).map(key => ({
    name: key,
    value: pacotesCount[key]
  })).sort((a, b) => b.value - a.value);

  // --- Processar Dados: Gráfico de Pizza (Tipos de Evento) ---
  const normalizeEventType = (tipo) => {
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
  };

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

  // --- Processar Dados: Gráfico de Barras (Sazonalidade - Fechados / Realizados) ---
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

  // --- Processar Dados: Gráfico de Linha (Captação de Leads) ---
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

  // --- Pipeline de Leads (Distribuição de status) ---
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


  // --- Ranking de Parceiros ---
  const rankingParceiros = Object.entries(cerimonialistas).map(([slug, cerim]) => {
    const leadsDoParc = leads.filter(l => l.cerimonialista === slug);
    const fechados = leadsDoParc.filter(l => l.status === 'fechado' || l.status === 'realizado').length;
    const total = leadsDoParc.length;
    const conversao = total > 0 ? Math.round((fechados / total) * 100) : 0;
    return { slug, nome: cerim.nome, total, fechados, conversao };
  }).sort((a, b) => b.fechados - a.fechados || b.total - a.total);

  // Leads diretos (sem parceiro)
  const leadsDiretos = leads.filter(l => !l.cerimonialista);
  const fechadosDiretos = leadsDiretos.filter(l => l.status === 'fechado' || l.status === 'realizado').length;

  // Get all unique years from leads
  const displayLeads = leads.filter(lead => {
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
    if (selectedYear !== 'todos' && leadYear !== selectedYear) return false;
    if (selectedMonth !== 'todos' && leadMonth !== selectedMonth) return false;
    if (selectedStatus !== 'todos' && lead.status !== selectedStatus) return false;
    return true;
  });

  const availableYears = Array.from(new Set(leads.map(lead => {
    let date = null;
    if (lead.dataEvento) {
      date = new Date(lead.dataEvento + 'T00:00:00');
    } else if (lead.criadoEm) {
      date = parseCriadoEm(lead.criadoEm);
    }
    return date && !isNaN(date.getTime()) ? date.getFullYear().toString() : null;
  }).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  // --- Processar Dados: Financeiro ---
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

    // Apply filters
    if (selectedYear !== 'todos' && leadYear !== selectedYear) return;
    if (selectedMonth !== 'todos' && leadMonth !== selectedMonth) return;
    if (selectedStatus !== 'todos' && lead.status !== selectedStatus) return;

    const fatBruto = parseFloat(fin.faturamento) || 0;
    const desc = parseFloat(fin.desconto) || 0;
    const fat = fatBruto - desc; // Net faturamento after discount
    const pago = parseFloat(fin.valorPago) || 0;
    const rest = Math.max(0, fat - pago);
    const custos = fin.custos ? Object.values(fin.custos) : [];
    const totCustos = custos.reduce((acc, c) => acc + getCustoValor(c), 0);
    const luc = fat - totCustos;
    const marg = fat > 0 ? (luc / fat) * 100 : 0;

    totalFaturamento += fat;
    totalValorPago += pago;
    totalCustosGlobal += totCustos;

    // Accumulate by category
    custos.forEach(c => {
      const valor = getCustoValor(c);
      const cat = c.categoria || detectCategoryByDescription(c.descricao);
      if (custosPorCategoria[cat] !== undefined) {
        custosPorCategoria[cat] += valor;
      } else {
        custosPorCategoria.outros += valor;
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
          entry.outros += valor;
        }
      });
    }
  });

  const totalLucroGlobal = totalFaturamento - totalCustosGlobal;
  const totalValorRestante = totalFaturamento - totalValorPago;
  const margemGlobalMedia = totalFaturamento > 0 ? (totalLucroGlobal / totalFaturamento) * 100 : 0;
  
  // Executive KPIs
  const totalLeads = leads.length;
  const totalFechados = leads.filter(l => l.status === 'fechado' || l.status === 'realizado').length;
  const taxaConversao = totalLeads > 0 ? Math.round((totalFechados / totalLeads) * 100) : 0;
  const ticketMedio = totalFechados > 0 ? totalFaturamento / totalFechados : 0;

  // Cost categories breakdown logic
  const sortedCategories = Object.entries(custosPorCategoria)
    .map(([key, value]) => {
      const matched = custosCategorias.find(c => c.id === key) || {
        label: key === 'outros' ? 'Outros / Diversos' : key,
        color: '#a8b8aa',
        emoji: '✨'
      };
      return {
        key,
        value,
        label: matched.label,
        emoji: matched.emoji || '✨',
        color: matched.color || '#a8b8aa',
        percentage: totalCustosGlobal > 0 ? (value / totalCustosGlobal) * 100 : 0
      };
    })
    .sort((a, b) => b.value - a.value);

  let insightOtimizacao = "";
  if (totalCustosGlobal === 0) {
    insightOtimizacao = "Nenhum custo lançado no sistema ainda. Adicione custos aos leads do Kanban para visualizar análises de otimização.";
  } else {
    const topCategory = sortedCategories[0];
    if (topCategory.key === 'insumos') {
      insightOtimizacao = `Sua maior fonte de despesa é **Insumos / Bebidas** (${topCategory.percentage.toFixed(1)}% dos custos totais). Para otimizar sua margem:\n1. Considere comprar destilados em atacado ou estabelecer parceria direta com distribuidores.\n2. Revise o desperdício de frutas e insumos perecíveis nos eventos.\n3. Ajuste o preço por convidado dos seus pacotes caso o custo de insumos continue subindo.`;
    } else if (topCategory.key === 'equipe') {
      insightOtimizacao = `Sua maior fonte de despesa é **Mão de Obra / Equipe** (${topCategory.percentage.toFixed(1)}% dos custos totais). Para otimizar sua margem:\n1. Utilize a recomendação de equipe inteligente do sistema para não contratar ajudantes além do necessário.\n2. Planeje escalas regionalizadas para reduzir custos extras de deslocamento e diárias de equipe.\n3. Avalie se o tempo de evento padrão (ex: 5h) justifica o valor pago de diária completa aos ajudantes.`;
    } else if (topCategory.key === 'logistica') {
      insightOtimizacao = `Sua maior fonte de despesa é **Logística / Transporte** (${topCategory.percentage.toFixed(1)}% dos custos totais). Para otimizar sua margem:\n1. Adicione uma taxa de deslocamento extra para eventos em cidades mais distantes no gerador de contratos.\n2. Agrupe compras e coletas de materiais para reduzir o número de viagens.\n3. Estabeleça acordos de transporte mensal ou fixo com ajudantes locais da região do evento.`;
    } else if (topCategory.key === 'descartaveis') {
      insightOtimizacao = `Sua maior fonte de despesa é **Descartáveis / Copos** (${topCategory.percentage.toFixed(1)}% dos custos totais). Para otimizar sua margem:\n1. Verifique se vale a pena incentivar o aluguel de copos de vidro (cobrando a taxa por convidado) para reduzir descartáveis.\n2. Compre copos e canudos descartáveis/biodegradáveis em grandes lotes diretamente de fabricantes.\n3. Monitore a distribuição de copos por convidado para evitar desperdícios durante a festa.`;
    } else {
      insightOtimizacao = `Suas despesas estão distribuídas, com **${topCategory.label}** liderando os custos (${topCategory.percentage.toFixed(1)}%). Recomendamos descrever os custos detalhadamente para identificar padrões de despesas ocultas em insumos ou logística.`;
    }
  }

  const monthlyFinanceData = Object.values(financeiroMensal).sort((a, b) => {
    return a.sortKey.localeCompare(b.sortKey);
  });

  const sortedFinancePorLead = financeiroPorLead.sort((a, b) => {
    return b.sortKey.localeCompare(a.sortKey) || b.nome.localeCompare(a.nome);
  });

  const exportToCSV = () => {
    if (sortedFinancePorLead.length === 0) {
      alert("Nenhum dado financeiro para exportar.");
      return;
    }
    
    const headers = [
      "Cliente",
      "Data do Evento",
      "Status",
      "Faturamento Bruto (R$)",
      "Desconto (R$)",
      "Faturamento Liquido (R$)",
      "Valor Recebido (R$)",
      "Saldo Restante (R$)",
      "Custos Totais (R$)",
      "Lucro Liquido (R$)",
      "Margem de Lucro (%)"
    ];

    const rows = sortedFinancePorLead.map(lead => {
      const bruto = lead.faturamento + lead.desconto;
      return [
        `"${lead.nome.replace(/"/g, '""')}"`,
        `"${lead.data}"`,
        `"${lead.status}"`,
        bruto.toFixed(2),
        lead.desconto.toFixed(2),
        lead.faturamento.toFixed(2),
        lead.pago.toFixed(2),
        lead.restante.toFixed(2),
        lead.custos.toFixed(2),
        lead.lucro.toFixed(2),
        lead.margem.toFixed(1)
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `balanco_financeiro_laboratorio_drinks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Acompanhe o desempenho e a saúde financeira dos eventos.</p>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🗓️ Filtrar por Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="todos">📅 Todos os Anos</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📅 Filtrar por Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="todos">📆 Todos os Meses</option>
            <option value="01">01 - Janeiro</option>
            <option value="02">02 - Fevereiro</option>
            <option value="03">03 - Março</option>
            <option value="04">04 - Abril</option>
            <option value="05">05 - Maio</option>
            <option value="06">06 - Junho</option>
            <option value="07">07 - Julho</option>
            <option value="08">08 - Agosto</option>
            <option value="09">09 - Setembro</option>
            <option value="10">10 - Outubro</option>
            <option value="11">11 - Novembro</option>
            <option value="12">12 - Dezembro</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>⚡ Status do Lead</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="todos">✨ Todos os Status</option>
            <option value="leads">Novo (Leads)</option>
            <option value="negociacao">Em Negociação</option>
            <option value="fechado">Fechado</option>
            <option value="realizado">Realizado</option>
            <option value="perdido">Perdido/Cancelado</option>
          </select>
        </div>

        {(selectedYear !== 'todos' || selectedMonth !== 'todos' || selectedStatus !== 'todos') && (
          <button
            onClick={() => {
              setSelectedYear('todos');
              setSelectedMonth('todos');
              setSelectedStatus('todos');
            }}
            style={{
              marginTop: '18px',
              background: 'rgba(244, 67, 54, 0.1)',
              color: '#FF7043',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            🧹 Limpar Filtros
          </button>
        )}
      </div>

      {/* KPI CARDS (Executive KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Leads */}
        <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #00E5FF' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Leads</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {totalLeads}
          </div>
        </div>

        {/* Receita Total */}
        <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #4CAF50' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Receita Total</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#4CAF50' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaturamento)}
          </div>
        </div>

        {/* Taxa de Conversão */}
        <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #FFD54F' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Taxa de Conversão</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#FFD54F' }}>
            {taxaConversao}%
          </div>
        </div>

        {/* Ticket Médio */}
        <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ticket Médio</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}
          </div>
        </div>
      </div>

      {/* MAPA INTERATIVO DE CALOR DOS EVENTOS - lazy loaded */}
      <div style={{ marginBottom: '24px' }}>
        {!showHeatmap ? (
          <button
            onClick={() => setShowHeatmap(true)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px dashed rgba(255,152,0,0.4)',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            🔥 Ver Mapa de Calor por Bairros & Regiões
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={() => setShowHeatmap(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                ✕ Ocultar mapa
              </button>
            </div>
            <EventsMapHeatmap leads={displayLeads} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>


          {/* GRÁFICO MENSAL COMPOSITE */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
            <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Evolução Financeira Mensal (Faturamento vs Custos vs Lucro)</h3>
            {monthlyFinanceData.length > 0 ? (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="99%" height={320}>
                  <ComposedChart data={monthlyFinanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis stroke="#888" tick={{ fill: '#888' }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: 'var(--text-primary)' }} 
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="Faturamento" fill="#4CAF50" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Custos" fill="#F44336" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line type="monotone" dataKey="Lucro" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--primary)', stroke: '#111' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Nenhum dado financeiro mensal disponível. Lance faturamento ou custos nos leads do Kanban.
              </div>
            )}
          </div>

          {/* Gráfico 2: Pipeline de Leads (Distribuição de status) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
              <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Pipeline de Leads (Status)</h3>
              {pipelineData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="99%" height={300}>
                    <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                      <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: 'var(--text-primary)' }} 
                        cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {pipelineData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Nenhum lead encontrado.
                </div>
              )}
            </div>

            {/* Gráfico 3: Pacotes mais vendidos */}
            <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
              <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Pacotes Mais Vendidos</h3>
              {pieData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="99%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: 'var(--text-primary)' }} 
                        itemStyle={{ color: 'var(--text-primary)' }} 
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado disponível.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '16px' }}>
            <button
              onClick={() => setMostrarAvancado(!mostrarAvancado)}
              className="btn btn--outline"
              style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {mostrarAvancado ? '▲ Ocultar análises avançadas' : '📊 Ver mais gráficos e análises (7)'}
            </button>
          </div>

          {mostrarAvancado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* DISTRIBUIÇÃO DE CUSTOS E INSIGHTS DE OTIMIZAÇÃO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* PROGRESS BARS BREAKDOWN */}
            <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>📊 Distribuição de Custos por Categoria</h3>
              {totalCustosGlobal > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedCategories.map(cat => (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{cat.emoji} {cat.label}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.value)} 
                          <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.78rem', marginLeft: '6px' }}>
                            ({cat.percentage.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${cat.percentage}%`, height: '100%', background: cat.color, borderRadius: '10px', transition: 'width 0.5s ease-out' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Nenhum custo lançado no sistema ainda.
                </div>
              )}
            </div>

            {/* RECOMMENDATION INSIGHT */}
            <div style={{
              background: 'rgba(203, 161, 83, 0.03)',
              border: '1px solid var(--border-color)',
              padding: '24px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <h3 style={{ margin: '0 0 14px 0', color: 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💡 Sugestão para Otimizar sua Margem
              </h3>
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {insightOtimizacao}
              </div>
            </div>
          </div>

          {/* TABELA DRE MENSAL DETALHADA */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📊 Demonstrativo de Resultados (DRE Mensal)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 20px 0' }}>Estrutura de faturamento e custos detalhada por mês de ocorrência dos eventos.</p>
            {monthlyFinanceData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum dado mensal disponível.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Estrutura Financeira (R$)</th>
                      {monthlyFinanceData.map(m => (
                        <th key={m.name} style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{m.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Faturamento Bruto */}
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: '500' }}>(+) Receita Bruta (Faturamento)</td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: 'var(--text-primary)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.FaturamentoBruto || 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Desconto */}
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px', color: '#F44336' }}>(-) Descontos Concedidos</td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: '#F44336' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.Desconto || 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Receita Líquida */}
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)', fontWeight: 'bold' }}>
                      <td style={{ padding: '10px', color: '#4CAF50' }}>(=) Receita Líquida</td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: '#4CAF50' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.Faturamento || 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Custos por Categorias */}
                    {custosCategorias.map(cat => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                          (-) Custos: {cat.emoji || '📦'} {cat.label}
                        </td>
                        {monthlyFinanceData.map(m => (
                          <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m[cat.id] || 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Outros custos */}
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                        (-) Custos: ✨ Outros / Diversos
                      </td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.outros || 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Custos Totais */}
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: '500' }}>
                      <td style={{ padding: '10px', color: '#F44336' }}>(=) Total de Custos Operacionais</td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: '#F44336' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.Custos || 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Lucro Líquido */}
                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(203,161,83,0.04)', fontWeight: 'bold' }}>
                      <td style={{ padding: '10px', color: 'var(--primary)' }}>(=) Lucro Líquido Operacional</td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: 'var(--primary)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.Lucro || 0)}
                        </td>
                      ))}
                    </tr>
                    {/* Margem Operacional */}
                    <tr style={{ background: 'rgba(255,255,255,0.015)', fontWeight: 'bold' }}>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>Margem Operacional (%)</td>
                      {monthlyFinanceData.map(m => {
                        const marg = m.Faturamento > 0 ? (m.Lucro / m.Faturamento) * 100 : 0;
                        return (
                          <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: marg >= 0 ? '#4CAF50' : '#F44336' }}>
                            {marg.toFixed(1)}%
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TABELA DE DEMONSTRATIVO POR LEAD */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Demonstrativo Financeiro por Festa</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Lista detalhada de receitas, custos e margem de lucro por cliente cadastrado.</p>
              </div>
              <button 
                onClick={exportToCSV}
                className="btn btn--outline" 
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                📥 Exportar CSV (Excel)
              </button>
            </div>

            {sortedFinancePorLead.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum evento com informações financeiras cadastradas. Abra um lead no Kanban e lance os dados na aba "Financeiro".
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                      {['Cliente', 'Data', 'Status', 'Faturamento', 'Recebido', 'A Receber', 'Custos', 'Lucro', 'Margem'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Cliente' || h === 'Data' || h === 'Status' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFinancePorLead.map((item) => {
                      const statusColors = {
                        'novo': '#00E5FF',
                        'negociacao': '#FFD54F',
                        'fechado': '#4CAF50',
                        'realizado': '#9E9E9E',
                        'perdido': '#F44336'
                      };
                      const statusLabels = {
                        'novo': 'Novo',
                        'negociacao': 'Negociação',
                        'fechado': 'Fechado',
                        'realizado': 'Realizado',
                        'perdido': 'Perdido'
                      };
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.nome}</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.data}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ color: statusColors[item.status] || '#FFF', fontWeight: '600', fontSize: '0.8rem' }}>
                              ● {statusLabels[item.status] || item.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: '500' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.faturamento)}
                            {item.desconto > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#F44336', marginTop: '2px', fontWeight: 'normal' }}>
                                -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.desconto)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#4CAF50', fontWeight: '500' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.pago)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: item.restante > 0 ? '#FFD54F' : '#4CAF50', fontWeight: '500' }}>
                            {item.restante > 0 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.restante)
                              : 'Quitado'
                            }
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#F44336' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.custos)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--primary)', fontWeight: 'bold' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.lucro)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <span style={{
                              background: item.lucro >= 0 ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)',
                              color: item.lucro >= 0 ? '#4CAF50' : '#F44336',
                              padding: '2px 8px', borderRadius: 12, fontWeight: 'bold', fontSize: '0.82rem'
                            }}>
                              {item.margem.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        
        {/* Gráfico 1: Captação de Leads (Linha) */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Volume de Captação (Novos Orçamentos por Mês)</h3>
          {lineData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  />
                  <Line type="monotone" dataKey="Leads" stroke="#00E5FF" strokeWidth={3} dot={{ r: 6, fill: '#00E5FF', stroke: '#111', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Nenhum orçamento captado ainda.
            </div>
          )}
        </div>

        {/* Gráfico: Tipos de Evento mais contratados */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>🎯 Tipos de Evento Mais Contratados</h3>
          {tipoEventoPieData.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 280px', height: 300 }}>
                <ResponsiveContainer width="99%" height={300}>
                  <PieChart>
                    <Pie
                      data={tipoEventoPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {tipoEventoPieData.map((entry, index) => (
                        <Cell key={`evt-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: 'var(--text-primary)' }} 
                      itemStyle={{ color: 'var(--text-primary)' }} 
                      formatter={(value, name) => [`${value} leads`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tipoEventoPieData.map((item, idx) => {
                  const total = leads.length;
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1 }}>{item.emoji} {item.name}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{item.value}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum tipo de evento informado nos leads.</div>
          )}
        </div>
        {/* Gráfico 3: Eventos por Mês */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Sazonalidade (Eventos Fechados por Mês)</h3>
          {barData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: 'var(--text-primary)' }} 
                    cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="Eventos" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Nenhum evento fechado com data informada.
            </div>
          )}
        </div>

        {/* BLOCO 3 — Análise de Convidados e Pacotes */}
        {(() => {
          // --- Histograma e Faixas de Convidados ---
          const faixas = [
            { label: '30–40', min: 30, max: 40 },
            { label: '41–50', min: 41, max: 50 },
            { label: '51–75', min: 51, max: 75 },
            { label: '76–100', min: 76, max: 100 },
            { label: '101–150', min: 101, max: 150 },
            { label: '151–200', min: 151, max: 200 },
            { label: '200+', min: 201, max: Infinity },
          ];
          const histData = faixas.map(f => ({
            name: f.label,
            Eventos: leads.filter(l => {
              const n = Number(l.convidados);
              return !isNaN(n) && n >= f.min && n <= f.max;
            }).length
          }));

          // --- Média de convidados por pacote ---
          const pacoteConvidados = {};
          leads.forEach(lead => {
            const pacote = normalizePackageName(lead.pacote);
            const n = Number(lead.convidados);
            if (!isNaN(n) && n > 0) {
              if (!pacoteConvidados[pacote]) pacoteConvidados[pacote] = { soma: 0, count: 0 };
              pacoteConvidados[pacote].soma += n;
              pacoteConvidados[pacote].count += 1;
            }
          });
          const mediaConvPacote = Object.entries(pacoteConvidados)
            .map(([name, { soma, count }]) => ({ name, Media: Math.round(soma / count) }))
            .sort((a, b) => b.Media - a.Media);

          // --- Ticket médio por faixa de convidados ---
          const ticketPorFaixa = faixas.map(f => {
            const leadsNaFaixa = leads.filter(l => {
              const n = Number(l.convidados);
              const fat = parseFloat(l.financeiro?.faturamento) || 0;
              return !isNaN(n) && n >= f.min && n <= f.max && fat > 0;
            });
            const totalFat = leadsNaFaixa.reduce((acc, l) => acc + (parseFloat(l.financeiro?.faturamento) || 0), 0);
            const ticket = leadsNaFaixa.length > 0 ? Math.round(totalFat / leadsNaFaixa.length) : 0;
            return { faixa: f.label, eventos: leadsNaFaixa.length, ticket };
          }).filter(r => r.eventos > 0);

          // --- Pacotes Contratados por Faixa de Convidados ---
          const pacotesUnicos = [...new Set(leads.map(l => normalizePackageName(l.pacote)).filter(Boolean))];
          const pacotesPorFaixaData = faixas.map(f => {
            const entry = { faixa: f.label };
            const leadsNaFaixa = leads.filter(l => {
              const n = Number(l.convidados);
              return !isNaN(n) && n >= f.min && n <= f.max;
            });
            pacotesUnicos.forEach(pac => {
              entry[pac] = leadsNaFaixa.filter(l => normalizePackageName(l.pacote) === pac).length;
            });
            return entry;
          }).filter(f => pacotesUnicos.some(pac => f[pac] > 0));
          const PKG_COLORS = ['#cba153', '#00E5FF', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0'];

          // --- Radar: tipo de evento × pacote ---
          const tiposUnicos = [...new Set(leads.map(l => normalizeEventType(l.tipoEvento)).filter(t => t && t !== 'Não informado'))].slice(0, 6);
          const radarData = tiposUnicos.map(tipo => {
            const entry = { tipo };
            pacotesUnicos.forEach(pac => {
              entry[pac] = leads.filter(l =>
                normalizeEventType(l.tipoEvento) === tipo &&
                normalizePackageName(l.pacote) === pac
              ).length;
            });
            return entry;
          });
          const RADAR_COLORS = ['#cba153', '#00E5FF', '#4CAF50', '#F44336', '#FF9800'];

          return (
            <>
              {/* Histograma */}
              <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1', minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>👥 Distribuição de Convidados por Faixa</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Quantos eventos você realizou em cada tamanho de festa.</p>
                {histData.some(d => d.Eventos > 0) ? (
                  <ResponsiveContainer width="99%" height={280}>
                    <BarChart data={histData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                      <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                        formatter={(value) => [`${value} evento${value !== 1 ? 's' : ''}`, 'Quantidade']}
                      />
                      <Bar dataKey="Eventos" radius={[6, 6, 0, 0]}>
                        {histData.map((entry, index) => (
                          <Cell key={`hist-${index}`} fill={entry.Eventos === Math.max(...histData.map(d => d.Eventos)) ? 'var(--primary)' : 'rgba(203,161,83,0.35)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Nenhum lead com número de convidados informado.
                  </div>
                )}
              </div>

              {/* Média de convidados por pacote */}
              <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>📦 Média de Convidados por Pacote</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Qual pacote tende a ser escolhido para eventos maiores.</p>
                {mediaConvPacote.length > 0 ? (
                  <ResponsiveContainer width="99%" height={260}>
                    <BarChart data={mediaConvPacote} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
                      <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#ccc', fontSize: 12 }} width={100} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                        formatter={(value) => [`${value} convidados`, 'Média']}
                      />
                      <Bar dataKey="Media" fill="#00E5FF" radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Nenhum dado de pacotes disponível.
                  </div>
                )}
              </div>

              {/* Ticket Médio por Faixa */}
              <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>💰 Ticket Médio por Faixa de Convidados</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Quanto você cobra em média, de acordo com o tamanho do evento.</p>
                {ticketPorFaixa.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ticketPorFaixa.map((row, idx) => {
                      const maxTicket = Math.max(...ticketPorFaixa.map(r => r.ticket));
                      const pct = maxTicket > 0 ? (row.ticket / maxTicket) * 100 : 0;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                              👥 {row.faixa} convidados
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '8px' }}>({row.eventos} evento{row.eventos !== 1 ? 's' : ''})</span>
                            </span>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.ticket)}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px', transition: 'width 0.5s ease-out' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhum lead com dados financeiros e de convidados informados.
                  </div>
                )}
              </div>

              {/* Radar: Tipo de Evento × Pacote */}
              {radarData.length > 0 && pacotesUnicos.length > 0 && (
                <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>🎯 Tipo de Evento × Pacote Contratado</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Qual pacote cada tipo de evento costuma contratar.</p>
                  <ResponsiveContainer width="99%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="tipo" tick={{ fill: '#aaa', fontSize: 12 }} />
                      <PolarRadiusAxis tick={{ fill: '#666', fontSize: 10 }} />
                      {pacotesUnicos.slice(0, 5).map((pac, i) => (
                        <Radar key={pac} name={pac} dataKey={pac} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.2} />
                      ))}
                      <Legend />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pacotes Contratados por Faixa de Convidados */}
              {pacotesPorFaixaData.length > 0 && pacotesUnicos.length > 0 && (
                <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0, gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>📊 Pacotes por Faixa de Convidados</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Quais pacotes foram solicitados/contratados em cada tamanho de festa (30 a 200+ convidados).</p>
                  <ResponsiveContainer width="99%" height={300}>
                    <BarChart data={pacotesPorFaixaData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="faixa" stroke="#888" tick={{ fill: '#aaa' }} />
                      <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }} />
                      <Legend />
                      {pacotesUnicos.map((pac, idx) => (
                        <Bar key={pac} dataKey={pac} stackId="a" fill={PKG_COLORS[idx % PKG_COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          );
        })()}

        {/* INSIGHT: Oportunidade Mão de Obra em Festas Grandes */}
        {(() => {
          // Calcula o limiar dinamicamente: 70º percentil dos convidados nos leads com valor informado
          const convidadosValidos = leads
            .map(l => Number(l.convidados))
            .filter(n => !isNaN(n) && n > 0)
            .sort((a, b) => a - b);

          if (convidadosValidos.length < 3) return null; // poucos dados para gerar insight

          const idx70 = Math.floor(convidadosValidos.length * 0.7);
          const LIMIAR_CONVIDADOS = convidadosValidos[idx70] || 100;

          const maoDeObraKeywords = ['mão de obra', 'mao de obra', 'obra'];
          const isMaoDeObra = (pacote) => {
            const p = (pacote || '').toLowerCase();
            return maoDeObraKeywords.some(k => p.includes(k));
          };

          const leadsGrandes = leads.filter(l => Number(l.convidados) >= LIMIAR_CONVIDADOS);
          if (leadsGrandes.length === 0) return null;

          const grandesMaoObra = leadsGrandes.filter(l => isMaoDeObra(l.pacote));
          const grandesPacote = leadsGrandes.filter(l => !isMaoDeObra(l.pacote));

          const avgTicket = (arr) => {
            const comFat = arr.filter(l => parseFloat(l.financeiro?.faturamento) > 0);
            if (comFat.length === 0) return 0;
            return comFat.reduce((s, l) => s + parseFloat(l.financeiro.faturamento), 0) / comFat.length;
          };

          const avgMaoObra = avgTicket(grandesMaoObra);
          const avgPacote = avgTicket(grandesPacote);
          const diferencaTicket = avgPacote - avgMaoObra;
          const receitaNaoCapturada = diferencaTicket > 0 ? Math.round(diferencaTicket * grandesMaoObra.length) : 0;
          const pctMaoObra = leadsGrandes.length > 0 ? Math.round((grandesMaoObra.length / leadsGrandes.length) * 100) : 0;

          const barCompData = [
            { name: 'Mão de Obra', Ticket: Math.round(avgMaoObra), fill: '#FF9800' },
            { name: 'Pacote Completo', Ticket: Math.round(avgPacote), fill: '#4CAF50' },
          ].filter(d => d.Ticket > 0);

          return (
            <div style={{
              gridColumn: '1 / -1',
              background: 'rgba(255, 152, 0, 0.04)',
              border: '1px solid rgba(255, 152, 0, 0.35)',
              borderLeft: '5px solid #FF9800',
              borderRadius: '12px',
              padding: '24px',
              minWidth: 0,
            }}>
              {/* Cabeçalho */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                    <h3 style={{ margin: 0, color: '#FF9800', fontSize: '1.1rem' }}>Oportunidade de Receita Detectada</h3>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '600px', lineHeight: '1.5' }}>
                    Eventos com <strong style={{ color: '#FFF' }}>{LIMIAR_CONVIDADOS}+ convidados</strong> que escolheram <strong style={{ color: '#FF9800' }}>Mão de Obra</strong> geram um ticket médio significativamente menor do que os que contratam um pacote completo. O limiar de <strong style={{ color: '#FFF' }}>{LIMIAR_CONVIDADOS} convidados</strong> foi calculado automaticamente com base no perfil dos seus eventos.
                  </p>
                </div>
                {receitaNaoCapturada > 0 && (
                  <div style={{ background: 'rgba(255,152,0,0.12)', border: '1px solid rgba(255,152,0,0.3)', borderRadius: '10px', padding: '14px 20px', textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#FF9800', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold', marginBottom: '4px' }}>Receita não capturada</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#FF9800' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitaNaoCapturada)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>estimativa acumulada</div>
                  </div>
                )}
              </div>

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Eventos 150+ pax</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{leadsGrandes.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>no histórico total</div>
                </div>
                <div style={{ background: 'rgba(255,152,0,0.08)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,152,0,0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#FF9800', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Escolheram Mão de Obra</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#FF9800' }}>{grandesMaoObra.length} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>({pctMaoObra}%)</span></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>dos eventos grandes</div>
                </div>
                <div style={{ background: 'rgba(76,175,80,0.08)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(76,175,80,0.2)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Ticket Médio — Pacote</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                    {avgPacote > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgPacote) : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>para festas grandes</div>
                </div>
                <div style={{ background: 'rgba(255,152,0,0.06)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,152,0,0.15)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#FF9800', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Ticket Médio — Mão de Obra</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>
                    {avgMaoObra > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgMaoObra) : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>para festas grandes</div>
                </div>
                {diferencaTicket > 0 && (
                  <div style={{ background: 'rgba(244,67,54,0.08)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(244,67,54,0.2)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#F44336', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Diferença por Evento</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F44336' }}>
                      -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diferencaTicket)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>perdidos por escolha do cliente</div>
                  </div>
                )}
              </div>

              {/* Gráfico comparativo + sugestão */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {barCompData.length >= 2 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📊 Comparativo de Ticket Médio (150+ convidados)</h4>
                    <ResponsiveContainer width="99%" height={180}>
                      <BarChart data={barCompData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                        <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" stroke="#888" tick={{ fill: '#ccc', fontSize: 12 }} width={110} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                          formatter={(v) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Ticket Médio']}
                        />
                        <Bar dataKey="Ticket" radius={[0, 6, 6, 0]} barSize={32}>
                          {barCompData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>💡 Sugestões para aumentar o ticket</h4>
                  {[
                    { icon: '📈', text: 'Reajuste o preço da Mão de Obra para eventos acima de 150 pessoas — quanto maior a festa, mais próximo do pacote completo.' },
                    { icon: '🧾', text: 'No formulário de orçamento, mostre uma comparação de custo real: Mão de Obra + compras vs. Pacote Completo para o cliente calcular.' },
                    { icon: '🎁', text: 'Crie um pacote intermediário "Mão de Obra Premium" com gelo + copos incluídos, criando uma escada de valor gradual.' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px' }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* BLOCO 4 — Conversão por Pacote e por Faixa de Convidados */}
        {(() => {
          // --- Conversão por Pacote ---
          // conv% = fechados_com_pacote / total_leads_geral (evita distorção em pacotes com poucos leads)
          const totalLeads = leads.length;
          const pkgStats = {};
          leads.forEach(l => {
            const pkg = normalizePackageName(l.pacote);
            if (!pkgStats[pkg]) pkgStats[pkg] = { total: 0, fechados: 0 };
            pkgStats[pkg].total += 1;
            if (l.status === 'fechado' || l.status === 'realizado') pkgStats[pkg].fechados += 1;
          });
          const convPorPacote = Object.entries(pkgStats)
            .map(([name, { total, fechados }]) => ({
              name,
              total,
              fechados,
              conv: totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0
            }))
            .sort((a, b) => b.fechados - a.fechados);

          // --- Conversão por Faixa de Convidados ---
          const faixasConv = [
            { label: '30–40',   min: 30,  max: 40  },
            { label: '41–50',   min: 41,  max: 50  },
            { label: '51–75',   min: 51,  max: 75  },
            { label: '76–100',  min: 76,  max: 100 },
            { label: '101–150', min: 101, max: 150 },
            { label: '151–200', min: 151, max: 200 },
            { label: '200+',    min: 201, max: Infinity },
          ];
          const convPorFaixa = faixasConv.map(f => {
            const grupo = leads.filter(l => {
              const n = Number(l.convidados);
              return !isNaN(n) && n >= f.min && n <= f.max;
            });
            const fechados = grupo.filter(l => l.status === 'fechado' || l.status === 'realizado').length;
            // conv% = fechados_na_faixa / total_leads_geral
            const conv = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0;
            return { label: f.label, total: grupo.length, fechados, conv };
          }).filter(f => f.total > 0);

          const convColor = (pct) => {
            if (pct >= 15) return '#4CAF50';
            if (pct >= 8) return '#FF9800';
            return '#F44336';
          };

          const ConvBar = ({ name, total, fechados, conv }) => (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {fechados} de {totalLeads} leads ({total} pediram) &nbsp;
                  <span style={{ fontWeight: 700, color: convColor(conv) }}>{conv}%</span>
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, conv * 3)}%`, // Scaled visually for clarity
                  height: '100%',
                  borderRadius: '6px',
                  background: convColor(conv),
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          );

          if (convPorPacote.length === 0) return null;

          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              gridColumn: '1 / -1'
            }}>
              {/* Conversão por Pacote */}
              <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', borderTop: '4px solid var(--primary)' }}>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>📦 Conversão por Pacote</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
                  Qual pacote tem a maior taxa de fechamento?
                </p>
                {convPorPacote.map(p => (
                  <ConvBar key={p.name} {...p} />
                ))}
              </div>

              {/* Conversão por Faixa de Convidados */}
              <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', borderTop: '4px solid #00E5FF' }}>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>👥 Conversão por Nº de Convidados</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
                  Qual tamanho de festa você fecha mais?
                </p>
                {convPorFaixa.map(f => (
                  <ConvBar key={f.label} name={f.label} total={f.total} fechados={f.fechados} conv={f.conv} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* BLOCO 5 — Relatório do Teste A/B de Preços & Variantes */}
        {(() => {
          const campaignsList = Array.from(new Set(leads.map(l => l.abCampaign).filter(Boolean)));

          const leadsForAb = selectedCampaignFilter === 'todas'
            ? leads
            : leads.filter(l => l.abCampaign === selectedCampaignFilter);

          const leadsA = leadsForAb.filter(l => l.abGroup === 'A' || !l.abGroup);
          const leadsB = leadsForAb.filter(l => l.abGroup === 'B');

          const getStats = (arr) => {
            const total = arr.length;
            const fechados = arr.filter(l => l.status === 'fechado' || l.status === 'realizado');
            const conv = total > 0 ? Math.round((fechados.length / total) * 100) : 0;
            const fatList = fechados.map(l => parseFloat(l.financeiro?.faturamento || 0)).filter(v => v > 0);
            const totalFat = fatList.reduce((s, v) => s + v, 0);
            const ticket = fatList.length > 0 ? Math.round(totalFat / fatList.length) : 0;
            return { total, fechados: fechados.length, conv, totalFat, ticket };
          };

          const sA = getStats(leadsA);
          const sB = getStats(leadsB);

          return (
            <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', borderTop: '4px solid #00E5FF', gridColumn: '1 / -1', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🧪 Relatório de Desempenho — Teste A/B de Preços & Variantes
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Comparação direta de conversão e receita gerada pelo Grupo A (Controle) vs. Grupo B (Variante).
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {campaignsList.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Campanha:</label>
                      <select
                        value={selectedCampaignFilter}
                        onChange={(e) => setSelectedCampaignFilter(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="todas">Todas as Campanhas</option>
                        {campaignsList.map(c => (
                          <option key={c} value={c}>🏷️ {c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {leadsB.length > 0 ? (
                    <span style={{ background: 'rgba(0,229,255,0.15)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                      🟢 COLETANDO DADOS A/B
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>
                      ⚪ Nenhum lead no Grupo B ainda
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Card Grupo A */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>Grupo A (Controle)</span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(203,161,83,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px' }}>Preços Padrão</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leads Captados</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sA.total}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fechamentos</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4CAF50' }}>{sA.fechados}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taxa Conversão</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#00E5FF' }}>{sA.conv}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Médio</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {sA.ticket > 0 ? `R$ ${sA.ticket}` : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Faturamento Total:</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4CAF50' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sA.totalFat)}
                    </span>
                  </div>
                </div>

                {/* Card Grupo B */}
                <div style={{ background: 'rgba(0,229,255,0.02)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(0,229,255,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 'bold', color: '#00E5FF', fontSize: '1rem' }}>Grupo B (Variante)</span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(0,229,255,0.15)', color: '#00E5FF', padding: '2px 8px', borderRadius: '6px' }}>Novos Preços / Regras</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leads Captados</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sB.total}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fechamentos</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4CAF50' }}>{sB.fechados}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taxa Conversão</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#00E5FF' }}>{sB.conv}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Médio</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00E5FF' }}>
                        {sB.ticket > 0 ? `R$ ${sB.ticket}` : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Faturamento Total:</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4CAF50' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sB.totalFat)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Ranking de Parceiros */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1', minWidth: 0, borderTop: '4px solid #E91E63' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiHeart style={{ color: '#E91E63' }} /> Ranking de Parceiros Cerimonialistas
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>Acompanhe quais cerimonialistas trazem mais negócios fechados.</p>

          {rankingParceiros.length === 0 && leadsDiretos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Nenhum dado de parceiros ainda. Cadastre cerimonialistas na aba "Parceiros".
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    {['#', 'Cerimonialista', 'Total de Leads', 'Fechados', 'Conversão'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === '#' || h === 'Cerimonialista' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingParceiros.map((p, i) => (
                    <tr key={p.slug} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-muted)', fontWeight: 'bold', width: 32 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(233,30,99,0.15)', border: '1px solid rgba(233,30,99,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E91E63', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>
                            {p.nome.charAt(0)}
                          </div>
                          {p.nome}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#00E5FF', fontWeight: 'bold' }}>{p.total}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#4CAF50', fontWeight: 'bold' }}>{p.fechados}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          background: p.conversao >= 50 ? 'rgba(76,175,80,0.15)' : p.conversao >= 25 ? 'rgba(255,213,79,0.15)' : 'rgba(244,67,54,0.15)',
                          color: p.conversao >= 50 ? '#4CAF50' : p.conversao >= 25 ? '#FFD54F' : '#F44336',
                          padding: '2px 10px', borderRadius: 12, fontWeight: 'bold', fontSize: '0.85rem'
                        }}>
                          {p.conversao}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Linha de Leads Diretos */}
                  <tr style={{ borderTop: '2px dashed var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>—</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Direto (sem parceiro)</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{leadsDiretos.length}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{fechadosDiretos}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {leadsDiretos.length > 0 ? `${Math.round((fechadosDiretos / leadsDiretos.length) * 100)}%` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        </div>
      )}
      </div>
    </div>
  );
}
