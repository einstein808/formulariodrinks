import React from 'react';
import { formatCurrency } from '@/lib/utils';

export default function KpiSummaryBar({
  totalLeads = 0,
  totalFechados = 0,
  taxaConversao = 0,
  totalFaturamento = 0,
  totalCustosGlobal = 0,
  totalLucroGlobal = 0,
  margemGlobalMedia = 0,
  ticketMedio = 0,
  totalValorRestante = 0
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    }}>
      {/* Total Leads & Conversão */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '16px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid #00E5FF'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Total Leads / Conversão
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalLeads}</span>
          <span style={{ fontSize: '0.85rem', color: '#FFD54F', fontWeight: '600' }}>
            ({totalFechados} fechados · {taxaConversao}%)
          </span>
        </div>
      </div>

      {/* Faturamento Total */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '16px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid #4CAF50'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Faturamento Líquido
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
          {formatCurrency(totalFaturamento)}
        </div>
      </div>

      {/* Lucro Líquido & Margem */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '16px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid var(--primary)'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Lucro Líquido Real
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {formatCurrency(totalLucroGlobal)}
          </span>
          <span style={{ fontSize: '0.8rem', color: totalLucroGlobal >= 0 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
            {margemGlobalMedia.toFixed(1)}% margem
          </span>
        </div>
      </div>

      {/* Ticket Médio */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '16px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        borderLeft: '4px solid #9C27B0'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Ticket Médio / Evento
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {formatCurrency(ticketMedio)}
        </div>
      </div>

      {/* A Receber (Restante) */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '16px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        borderLeft: totalValorRestante > 0 ? '4px solid #FF9800' : '4px solid #4CAF50'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          {totalValorRestante > 0 ? 'A Receber (Falta Pagar)' : 'Financeiro Quitado'}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: totalValorRestante > 0 ? '#FF9800' : '#4CAF50' }}>
          {totalValorRestante > 0 ? formatCurrency(totalValorRestante) : '100% Pago 🎉'}
        </div>
      </div>
    </div>
  );
}