import React from 'react';
import { FiEye } from 'react-icons/fi';
import { COLUMNS } from '@/lib/constants';
import { getFinanceStatusHelper, hasCustosLancados, getLeadStatusHelper } from '../filters';

export default function TableView({
  filteredLeads = [],
  statusFilter,
  setStatusFilter,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  onSelectLead,
  onStatusChange
}) {
  const limit = itemsPerPage === 'all' ? filteredLeads.length : parseInt(itemsPerPage, 10);
  const totalPages = Math.ceil(filteredLeads.length / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + limit);

  return (
    <div className="admin-table-container" style={{ background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', minHeight: 'calc(100vh - 150px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Lista de Leads</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status:</label>
            <select 
              className="form-select" 
              style={{ padding: '6px 12px' }} 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">Todos</option>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mostrar:</label>
            <select 
              className="form-select" 
              style={{ width: '100px', padding: '6px 12px' }} 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(e.target.value); setCurrentPage(1); }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Nome</th>
              <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Telefone</th>
              <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Data do Evento</th>
              <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Pacote</th>
              <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Financeiro</th>
              <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum lead encontrado.</td></tr>
            ) : (
              paginatedLeads.map(lead => {
                const { isStale, followUpCount } = getLeadStatusHelper(lead);
                const isFrozenLead = followUpCount >= 3;
                const fin = getFinanceStatusHelper(lead);
                const semCustos = (lead.status === 'fechado' || lead.status === 'realizado') && !hasCustosLancados(lead);

                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{lead.nome} {lead.sobrenome}</span>
                        <span
                          title={lead.abGroup === 'B' ? 'Lead variante do Teste A/B (Preços B / Regras B)' : 'Lead controle do Teste A/B (Preços A)'}
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: '700',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(203, 161, 83, 0.15)',
                            color: lead.abGroup === 'B' ? '#00E5FF' : 'var(--primary)',
                            border: `1px solid ${lead.abGroup === 'B' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(203, 161, 83, 0.35)'}`
                          }}
                        >
                          {lead.abGroup === 'B' ? '🧪 B' : '🅰️ A'}
                        </span>
                        {isFrozenLead ? (
                          <span title={`Lead com ${followUpCount} tentativas de contato sem fechar.`} style={{ fontSize: '0.65rem', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>❄️ Esfriou</span>
                        ) : (
                          isStale && <span title="Lead sem novas interações há mais de 15 dias!" style={{ fontSize: '0.65rem', color: '#F44336', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>🔥 Esfriando</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.telefone}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.dataEvento || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--primary)' }}>{lead.pacote || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select 
                        value={lead.status || 'novo'} 
                        onChange={(e) => onStatusChange(lead.id, e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: fin.color, background: fin.bg, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          {fin.label}
                        </span>
                        {semCustos && (
                          <span title="Falta lançar custos!" style={{ fontSize: '0.72rem', color: '#FF9800', background: 'rgba(255, 152, 0, 0.15)', border: '1px solid rgba(255, 152, 0, 0.35)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            ⚠️ Sem Custos
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => onSelectLead(lead)}
                        style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                      >
                        <FiEye size={14} /> Detalhes
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {itemsPerPage !== 'all' && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <div>
            Mostrando {startIndex + 1} a {Math.min(startIndex + limit, filteredLeads.length)} de {filteredLeads.length} leads
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              Anterior
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
