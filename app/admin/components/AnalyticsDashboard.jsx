import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts';
import { FiHeart, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

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

export default function AnalyticsDashboard() {
  const [leads, setLeads] = useState([]);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral'); // 'geral' | 'financeiro'
  const [custosCategorias, setCustosCategorias] = useState([]);

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

    const fatBruto = parseFloat(fin.faturamento) || 0;
    const desc = parseFloat(fin.desconto) || 0;
    const fat = fatBruto - desc; // Net faturamento after discount
    const pago = parseFloat(fin.valorPago) || 0;
    const rest = Math.max(0, fat - pago);
    const custos = fin.custos ? Object.values(fin.custos) : [];
    const totCustos = custos.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const luc = fat - totCustos;
    const marg = fat > 0 ? (luc / fat) * 100 : 0;

    totalFaturamento += fat;
    totalValorPago += pago;
    totalCustosGlobal += totCustos;

    // Accumulate by category
    custos.forEach(c => {
      const valor = parseFloat(c.valor) || 0;
      const cat = c.categoria || detectCategoryByDescription(c.descricao);
      if (custosPorCategoria[cat] !== undefined) {
        custosPorCategoria[cat] += valor;
      } else {
        custosPorCategoria.outros += valor;
      }
    });

    const nomeCliente = `${lead.nome || ''} ${lead.sobrenome || ''}`.trim() || 'Sem nome';
    
    let date = null;
    if (lead.dataEvento) {
      date = new Date(lead.dataEvento + 'T00:00:00');
    } else if (lead.criadoEm) {
      date = parseCriadoEm(lead.criadoEm);
    }

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
        const valor = parseFloat(c.valor) || 0;
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

      {/* TABS SELECTOR */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '28px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveTab('geral')}
          style={{
            background: activeTab === 'geral' ? 'rgba(203, 161, 83, 0.08)' : 'transparent',
            color: activeTab === 'geral' ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'geral' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'geral' ? 'bold' : 'normal',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
        >
          📈 Geral
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          style={{
            background: activeTab === 'financeiro' ? 'rgba(203, 161, 83, 0.08)' : 'transparent',
            color: activeTab === 'financeiro' ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'financeiro' ? '2px solid var(--primary)' : '2px solid transparent',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'financeiro' ? 'bold' : 'normal',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
        >
          💰 Financeiro
        </button>
      </div>

      {activeTab === 'financeiro' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {/* FATURAMENTO ACUMULADO */}
            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #FFF' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Faturamento Acumulado</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#FFF' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaturamento)}
              </div>
            </div>

            {/* TOTAL RECEBIDO */}
            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #4CAF50' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Recebido</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#4CAF50' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValorPago)}
              </div>
            </div>

            {/* SALDO A RECEBER */}
            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: `4px solid ${totalValorRestante > 0 ? '#FFD54F' : '#4CAF50'}` }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Saldo a Receber</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: totalValorRestante > 0 ? '#FFD54F' : '#4CAF50' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValorRestante)}
              </div>
            </div>

            {/* CUSTOS ACUMULADOS */}
            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #F44336' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Custos Acumulados</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#F44336' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustosGlobal)}
              </div>
            </div>

            {/* LUCRO LÍQUIDO */}
            <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Lucro Líquido Global</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLucroGlobal)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Margem de Lucro Média: <span style={{ color: totalLucroGlobal >= 0 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>{margemGlobalMedia.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* GRÁFICO MENSAL COMPOSITE */}
          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
            <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Evolução Financeira Mensal (Faturamento vs Custos vs Lucro)</h3>
            {monthlyFinanceData.length > 0 ? (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="99%" height={320}>
                  <ComposedChart data={monthlyFinanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis stroke="#888" tick={{ fill: '#888' }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
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

          {/* DISTRIBUIÇÃO DE CUSTOS E INSIGHTS DE OTIMIZAÇÃO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* PROGRESS BARS BREAKDOWN */}
            <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#FFF', fontSize: '1.1rem' }}>📊 Distribuição de Custos por Categoria</h3>
              {totalCustosGlobal > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedCategories.map(cat => (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{cat.emoji} {cat.label}</span>
                        <span style={{ color: '#FFF', fontWeight: 'bold' }}>
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
              border: '1px solid rgba(203, 161, 83, 0.15)',
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
            <h3 style={{ margin: 0, color: '#FFF' }}>📊 Demonstrativo de Resultados (DRE Mensal)</h3>
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
                      <td style={{ padding: '10px', color: '#FFF', fontWeight: '500' }}>(+) Receita Bruta (Faturamento)</td>
                      {monthlyFinanceData.map(m => (
                        <td key={m.name} style={{ padding: '10px', textAlign: 'right', color: '#FFF' }}>
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
                <h3 style={{ margin: 0, color: '#FFF' }}>Demonstrativo Financeiro por Festa</h3>
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
                          <td style={{ padding: '12px', color: '#FFF', fontWeight: 500 }}>{item.nome}</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.data}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ color: statusColors[item.status] || '#FFF', fontWeight: '600', fontSize: '0.8rem' }}>
                              ● {statusLabels[item.status] || item.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#FFF', fontWeight: '500' }}>
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
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' }}>
        
        {/* Gráfico 1: Captação de Leads (Linha) */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Volume de Captação (Novos Orçamentos por Mês)</h3>
          {lineData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
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

        {/* Gráfico 2: Pacotes mais vendidos */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Distribuição de Pacotes (Todos os Leads)</h3>
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
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }} 
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado disponível.</div>
          )}
        </div>

        {/* Gráfico: Tipos de Evento mais contratados */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>🎯 Tipos de Evento Mais Contratados</h3>
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
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
                      itemStyle={{ color: '#fff' }} 
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
                      <span style={{ fontSize: '0.85rem', color: '#FFF', flex: 1 }}>{item.emoji} {item.name}</span>
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
          <h3 style={{ margin: '0 0 24px 0', color: '#FFF' }}>Sazonalidade (Eventos Fechados por Mês)</h3>
          {barData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" tick={{ fill: '#888' }} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
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

        {/* Ranking de Parceiros */}
        <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1', minWidth: 0, borderTop: '4px solid #E91E63' }}>
          <h3 style={{ margin: '0 0 4px 0', color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      <td style={{ padding: '12px', color: '#FFF', fontWeight: 500 }}>
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
  );
}
