import React from 'react';
import { COLUMNS } from '@/lib/constants';
import LeadCard from './LeadCard';

export default function KanbanView({
  columns = COLUMNS,
  isMobile,
  getLeadsByStatus,
  cerimonialistas,
  onSelectLead,
  onStatusChange,
  onToggleAbGroup,
  onDeleteLead
}) {
  return (
    <>
      {/* Mobile Column Jump Pills */}
      {isMobile && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '4px 0 12px 0',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {columns.map(col => {
            const count = getLeadsByStatus(col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => {
                  const el = document.getElementById(`kanban-col-${col.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{col.title}</span>
                <span style={{ background: col.color || 'var(--primary)', color: '#000', borderRadius: '10px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 'bold' }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="admin-kanban-container" style={{ 
        display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: 'calc(100vh - 150px)' 
      }}>
        {columns.map(col => {
          const colLeads = getLeadsByStatus(col.id);
          return (
            <div 
              key={col.id} 
              id={`kanban-col-${col.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                const leadId = e.dataTransfer.getData('text/plain');
                if (leadId) {
                  onStatusChange(leadId, col.id);
                }
              }}
              className="admin-kanban-col"
              style={{ 
                minWidth: '300px', flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px',
                display: 'flex', flexDirection: 'column', borderTop: `3px solid ${col.color}`,
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600', letterSpacing: '0.2px' }}>{col.title}</h3>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  {colLeads.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isMobile={isMobile}
                    cerimonialistas={cerimonialistas}
                    onSelectLead={onSelectLead}
                    onStatusChange={onStatusChange}
                    onToggleAbGroup={onToggleAbGroup}
                    onDeleteLead={onDeleteLead}
                  />
                ))}
                {colLeads.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Nenhum lead nesta etapa.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
