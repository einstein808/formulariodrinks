import React from 'react';
import { FiDownload } from 'react-icons/fi';

export default function DashboardFilters({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  selectedStatus,
  setSelectedStatus,
  availableYears = [],
  onExportCsv
}) {
  const hasActiveFilters = selectedYear !== 'todos' || selectedMonth !== 'todos' || selectedStatus !== 'todos';

  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Filtrar Ano */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🗓️ Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="form-select"
            style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
          >
            <option value="todos">Todos os Anos</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Filtrar Mês */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📅 Mês</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-select"
            style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
          >
            <option value="todos">Todos os Meses</option>
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

        {/* Filtrar Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>⚡ Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-select"
            style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
          >
            <option value="todos">Todos os Status</option>
            <option value="leads">Novo (Leads)</option>
            <option value="negociacao">Em Negociação</option>
            <option value="fechado">Fechado</option>
            <option value="realizado">Realizado</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSelectedYear('todos');
              setSelectedMonth('todos');
              setSelectedStatus('todos');
            }}
            style={{
              alignSelf: 'flex-end',
              height: '36px',
              background: 'rgba(244, 67, 54, 0.1)',
              color: '#FF7043',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {onExportCsv && (
        <button
          onClick={onExportCsv}
          className="btn"
          style={{
            alignSelf: 'flex-end',
            height: '36px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600'
          }}
        >
          <FiDownload size={14} /> Exportar CSV
        </button>
      )}
    </div>
  );
}