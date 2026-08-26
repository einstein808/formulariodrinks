import React from 'react';
import { FiUserCheck } from 'react-icons/fi';

function formatPhone(value) {
  let v = (value || '').replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

export default function TabEquipe({ selectedEvento, ajudantes }) {
  const ajudantesEntries = selectedEvento?.ajudantes ? Object.entries(selectedEvento.ajudantes) : [];
  const confirmadosCount = ajudantesEntries.filter(([_, val]) => (typeof val === 'object' ? val.status : val) === 'confirmado').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiUserCheck size={16} /> Membros da Equipe ({ajudantesEntries.length})
        </h3>
        <span style={{ fontSize: '0.75rem', background: 'rgba(76,175,80,0.15)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
          {confirmadosCount} de {ajudantesEntries.length} confirmados
        </span>
      </div>

      {ajudantesEntries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ajudantesEntries.map(([slug, statusVal]) => {
            const helperInfo = ajudantes[slug];
            const helperStatus = typeof statusVal === 'object' && statusVal !== null
              ? (statusVal.status || 'pendente')
              : (statusVal || 'pendente');
            const isConfirmed = helperStatus === 'confirmado';
            const isRefused = helperStatus === 'recusado' || helperStatus === 'indisponivel';
            const nomeHelper = helperInfo?.nome || slug.replace(/-/g, ' ');
            const telHelper = helperInfo?.telefone;
            
            return (
              <div key={slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{nomeHelper}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {helperInfo?.especialidade || 'Staff'} {telHelper ? `· ${formatPhone(telHelper)}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 'bold', 
                    padding: '3px 8px', 
                    borderRadius: '10px',
                    background: isConfirmed ? 'rgba(76, 175, 80, 0.15)' : (isRefused ? 'rgba(244, 67, 54, 0.15)' : 'rgba(203, 161, 83, 0.15)'),
                    color: isConfirmed ? '#4CAF50' : (isRefused ? '#F44336' : '#FFD54F'),
                    border: `1px solid ${isConfirmed ? 'rgba(76, 175, 80, 0.3)' : (isRefused ? 'rgba(244, 67, 54, 0.3)' : 'rgba(203, 161, 83, 0.3)')}`
                  }}>
                    {isConfirmed ? '✅ Confirmado' : (isRefused ? '❌ Indisponível' : '⏳ Pendente')}
                  </span>

                  {telHelper && (
                    <a
                      href={`https://wa.me/55${telHelper.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${nomeHelper}! Sobre o evento de ${selectedEvento.nome} dia ${selectedEvento.dataEvento ? selectedEvento.dataEvento.split('-').reverse().join('/') : ''}...`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#25D366',
                        color: '#FFF',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Conversar no WhatsApp"
                    >
                      💬
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Nenhum membro da equipe designado para este evento ainda.
        </div>
      )}
    </div>
  );
}
