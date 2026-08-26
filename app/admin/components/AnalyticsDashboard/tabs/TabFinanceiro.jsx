import React, { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

export default function TabFinanceiro({
  monthlyFinanceData = [],
  sortedCategories = [],
  sortedFinancePorLead = [],
  totalCustosGlobal = 0,
  totalFaturamento = 0
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const totalPages = Math.ceil(sortedFinancePorLead.length / itemsPerPage) || 1;
  const paginatedLeads = sortedFinancePorLead.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }}>
      
      {/* ── EVOLUÇÃO FINANCEIRA MENSAL ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
          📈 Faturamento vs Custos vs Lucro por Mês
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 20px 0' }}>
          Acompanhamento da margem líquida e volume financeiro ao longo do tempo.
        </p>

        {monthlyFinanceData.length > 0 ? (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="99%" height={320}>
              <ComposedChart data={monthlyFinanceData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.82rem' }}
                  formatter={(value, name) => [formatCurrency(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                <Bar dataKey="Faturamento" fill="#4CAF50" name="Faturamento Líquido" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custos" fill="#F44336" name="Custos Totais" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Lucro" stroke="var(--primary)" strokeWidth={3} name="Lucro Líquido" dot={{ fill: 'var(--primary)', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
            Nenhum dado financeiro mensal disponível no período filtrado.
          </div>
        )}
      </div>

      {/* ── DISTRIBUIÇÃO DE CUSTOS POR CATEGORIA ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>💸 Distribuição de Custos</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Para onde vai o dinheiro dos eventos.</p>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#F44336' }}>
            Total: {formatCurrency(totalCustosGlobal)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedCategories.filter(c => c.total > 0).map(cat => {
            const pct = totalCustosGlobal > 0 ? ((cat.total / totalCustosGlobal) * 100).toFixed(1) : 0;
            return (
              <div key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{cat.emoji}</span>
                    <strong>{cat.label}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({pct}%)</span>
                    <span style={{ color: '#F44336', fontWeight: 'bold' }}>{formatCurrency(cat.total)}</span>
                  </div>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cat.color || '#00E5FF', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
          {sortedCategories.filter(c => c.total > 0).length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px', fontSize: '0.85rem' }}>
              Nenhum custo lançado no período filtrado.
            </div>
          )}
        </div>
      </div>

      {/* ── TABELA ANALÍTICA POR LEAD/EVENTO ── */}
      <div style={{
        background: 'var(--bg-input)',
        padding: '20px 24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            📋 Extrato Individual de Lucro por Evento
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {sortedFinancePorLead.length} registros
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                <th style={{ padding: '10px 12px' }}>Cliente / Evento</th>
                <th style={{ padding: '10px 12px' }}>Data</th>
                <th style={{ padding: '10px 12px' }}>Faturamento</th>
                <th style={{ padding: '10px 12px' }}>Custos</th>
                <th style={{ padding: '10px 12px' }}>Lucro Real</th>
                <th style={{ padding: '10px 12px' }}>Margem</th>
                <th style={{ padding: '10px 12px' }}>Recebido</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.nome}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{item.data}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{formatCurrency(item.faturamento)}</td>
                  <td style={{ padding: '10px 12px', color: '#F44336' }}>{formatCurrency(item.custos)}</td>
                  <td style={{ padding: '10px 12px', color: item.lucro >= 0 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                    {formatCurrency(item.lucro)}
                  </td>
                  <td style={{ padding: '10px 12px', color: item.margem >= 30 ? '#4CAF50' : '#FFD54F', fontWeight: 'bold' }}>
                    {item.margem.toFixed(0)}%
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.restante === 0 && item.faturamento > 0 ? (
                      <span style={{ background: 'rgba(76,175,80,0.12)', color: '#4CAF50', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                        Quitado
                      </span>
                    ) : (
                      <span style={{ color: '#FFD54F', fontSize: '0.78rem' }}>
                        {formatCurrency(item.pago)} ({formatCurrency(item.restante)} resta)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedLeads.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Nenhum evento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Página {currentPage} de {totalPages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}