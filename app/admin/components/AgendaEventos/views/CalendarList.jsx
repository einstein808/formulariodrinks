import React from 'react';
import { FiCalendar, FiClock, FiMapPin, FiPackage, FiUsers } from 'react-icons/fi';

export default function CalendarList({ eventos, onSelectEvento }) {
  const listEventos = [...eventos].sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));

  if (listEventos.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum evento encontrado.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {listEventos.map(evento => {
        const dataParts = evento.dataEvento ? evento.dataEvento.split('-') : [];
        const dataFormatada = dataParts.length === 3 ? `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}` : '—';
        const isRealizado = evento.status === 'realizado';

        return (
          <div 
            key={evento.id}
            onClick={() => onSelectEvento(evento)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s', opacity: isRealizado ? 0.8 : 1,
              borderLeft: `4px solid ${isRealizado ? '#00E5FF' : '#4CAF50'}`
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{evento.nome} {evento.sobrenome || ''}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCalendar /> {dataFormatada}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiClock /> {evento.horarioEvento || '—'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiMapPin /> {evento.cidade || '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ 
                  background: isRealizado ? 'rgba(0, 229, 255, 0.15)' : 'rgba(76,175,80,0.15)', 
                  color: isRealizado ? '#00E5FF' : '#4CAF50', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold', 
                  border: `1px solid ${isRealizado ? 'rgba(0, 229, 255, 0.35)' : 'rgba(76,175,80,0.3)'}` 
                }}>
                  {isRealizado ? '🎉 Realizado' : '📅 Confirmado'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiPackage /> {evento.pacote || '—'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiUsers /> {evento.convidados || '—'} convidados</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
