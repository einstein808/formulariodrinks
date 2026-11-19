"use client";
import React, { useState, useEffect } from 'react';
import { FiPieChart, FiDollarSign, FiLayers, FiUsers } from 'react-icons/fi';
import { useDashboardData } from './hooks/useDashboardData';
import KpiSummaryBar from './components/KpiSummaryBar';
import DashboardFilters from './components/DashboardFilters';
import TabGeral from './tabs/TabGeral';
import TabFinanceiro from './tabs/TabFinanceiro';
import TabCaptacao from './tabs/TabCaptacao';
import TabParceiros from './tabs/TabParceiros';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('geral'); // 'geral' | 'financeiro' | 'captacao' | 'parceiros'
  const [selectedYear, setSelectedYear] = useState('todos');
  const [selectedMonth, setSelectedMonth] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedDateBasis, setSelectedDateBasis] = useState('cadastro');

  const dashboard = useDashboardData({
    selectedYear,
    selectedMonth,
    selectedStatus,
    selectedDateBasis
  });

  // Define ano atual como padrão assim que os anos estiverem disponíveis
  useEffect(() => {
    if (dashboard.availableYears.length > 0) {
      const currentYearStr = new Date().getFullYear().toString();
      if (selectedYear === 'todos' && dashboard.availableYears.includes(currentYearStr)) {
        setSelectedYear(currentYearStr);
      } else if (selectedYear !== 'todos' && !dashboard.availableYears.includes(selectedYear)) {
        setSelectedYear('todos');
      }
    }
  }, [dashboard.availableYears, selectedYear]);

  // Exportar Balanço Financeiro para CSV
  const handleExportCsv = () => {
    if (!dashboard.sortedFinancePorLead || dashboard.sortedFinancePorLead.length === 0) return;

    const headers = [
      "ID do Lead",
      "Cliente",
      "Data do Período",
      "Data do Evento",
      "Status",
      "Receita Contratada",
      "Desconto",
      "Custos Totais",
      "Lucro Estimado",
      "Margem (%)",
      "Valor Pago",
      "Valor Restante"
    ];

    const rows = dashboard.sortedFinancePorLead.map(item => [
      item.id,
      `"${(item.nome || '').replace(/"/g, '""')}"`,
      item.periodo,
      item.dataEvento,
      item.status || 'novo',
      (item.faturamento || 0).toFixed(2),
      (item.desconto || 0).toFixed(2),
      (item.custos || 0).toFixed(2),
      (item.lucro || 0).toFixed(2),
      (item.margem || 0).toFixed(1),
      (item.pago || 0).toFixed(2),
      (item.restante || 0).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `balanco_financeiro_drinks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (dashboard.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="btn__spinner" />
      </div>
    );
  }

  const tabs = [
    { id: 'geral', label: 'Visão Geral', icon: FiPieChart },
    { id: 'financeiro', label: 'Financeiro & Lucro', icon: FiDollarSign },
    { id: 'captacao', label: 'Captação & Pacotes', icon: FiLayers },
    { id: 'parceiros', label: 'Parceiros & Equipe', icon: FiUsers },
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 6px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
            Analytics & Inteligência
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
        Indicadores de funil e financeiro com filtros alinhados e definições de receita explícitas.
          </p>
        </div>
      </div>

      {/* ── KPI SUMMARY BAR ── */}
      <KpiSummaryBar
        totalLeads={dashboard.totalLeads}
        totalFechados={dashboard.totalFechados}
        totalPerdidos={dashboard.totalPerdidos}
        totalEmAberto={dashboard.totalEmAberto}
        possiveisDuplicados={dashboard.possiveisDuplicados}
        taxaConversao={dashboard.taxaConversao}
        taxaFechamentoResolvidos={dashboard.taxaFechamentoResolvidos}
        totalFaturamento={dashboard.totalFaturamento}
        totalCustosGlobal={dashboard.totalCustosGlobal}
        totalLucroGlobal={dashboard.totalLucroGlobal}
        totalOportunidadeAberta={dashboard.totalOportunidadeAberta}
        totalValorPago={dashboard.totalValorPago}
        margemGlobalMedia={dashboard.margemGlobalMedia}
        ticketMedio={dashboard.ticketMedio}
        totalValorRestante={dashboard.totalValorRestante}
        contratosSemFinanceiro={dashboard.contratosSemFinanceiro}
        contratosSemCustos={dashboard.contratosSemCustos}
        contratosComDivergenciaPagamento={dashboard.contratosComDivergenciaPagamento}
        totalValorAcimaDoContrato={dashboard.totalValorAcimaDoContrato}
      />

      {/* ── FILTERS BAR ── */}
      <DashboardFilters
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedDateBasis={selectedDateBasis}
        setSelectedDateBasis={setSelectedDateBasis}
        availableYears={dashboard.availableYears}
        onExportCsv={handleExportCsv}
      />

      {/* ── NAVIGATION TABS ── */}
      <nav className="admin-analytics-tabs" aria-label="Seções de métricas">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`admin-analytics-tab ${isActive ? 'is-active' : ''}`}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── TAB CONTENT (LAZY LOADED) ── */}
      {activeTab === 'geral' && (
        <TabGeral
          leads={dashboard.filteredLeads}
          pipelineData={dashboard.pipelineData}
        />
      )}

      {activeTab === 'financeiro' && (
        <TabFinanceiro
          monthlyFinanceData={dashboard.monthlyFinanceData}
          monthlyCashFlowData={dashboard.monthlyCashFlowData}
          sortedCategories={dashboard.sortedCategories}
          sortedFinancePorLead={dashboard.sortedFinancePorLead}
          totalCustosGlobal={dashboard.totalCustosGlobal}
          totalFaturamento={dashboard.totalFaturamento}
          totalValorPago={dashboard.totalValorPago}
          totalLucroGlobal={dashboard.totalLucroGlobal}
          totalRecebidoComData={dashboard.totalRecebidoComData}
          totalRecebidoSemData={dashboard.totalRecebidoSemData}
        />
      )}

      {activeTab === 'captacao' && (
        <TabCaptacao
          pieData={dashboard.pieData}
          tipoEventoPieData={dashboard.tipoEventoPieData}
          barData={dashboard.barData}
          lineData={dashboard.lineData}
          abPerformanceData={dashboard.abPerformanceData}
        />
      )}

      {activeTab === 'parceiros' && (
        <TabParceiros
          rankingParceiros={dashboard.rankingParceiros}
          leadsDiretos={dashboard.leadsDiretos}
          fechadosDiretos={dashboard.fechadosDiretos}
        />
      )}

    </div>
  );
}
