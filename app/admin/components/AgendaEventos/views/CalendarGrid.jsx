import React from 'react';
import { FiPackage, FiMapPin } from 'react-icons/fi';

export default function CalendarGrid({
  daysOfWeek,
  firstDayOfMonth,
  daysInMonth,
  today,
  month,
  year,
  getEventosDoDia,
  onSelectEvento
}) {
  return (
    <div style={{ 
      background: 'var(--bg-input)', 
      borderRadius: '12px', 
      border: '1px solid var(--border-color)', 
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(203, 161, 83, 0.25) transparent'
    }}>
      <div style={{ minWidth: '640px' }}>
        {/* Cabeçalho dos dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
          {daysOfWeek.map(day => (
            <div key={day} className="admin-calendar-day-label" style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, auto)' }}>
        
        {/* Espaços vazios do mês anterior */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="admin-calendar-cell" style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }} />
        ))}

        {/* Dias do mês atual */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const eventosDoDia = getEventosDoDia(day);
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div key={`day-${day}`} className="admin-calendar-cell" style={{ 
              padding: '8px', 
              borderRight: '1px solid var(--border-color)', 
              borderBottom: '1px solid var(--border-color)',
              background: isToday ? 'rgba(203, 161, 83, 0.05)' : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ 
                  width: '28px', height: '28px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? 'var(--primary)' : 'transparent',
                  color: isToday ? '#000' : 'var(--text-secondary)',
                  fontWeight: isToday ? 'bold' : 'normal'
                }}>
                  {day}
                </span>
                
                {eventosDoDia.length > 0 && (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(76,175,80,0.2)', color: '#4CAF50', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {eventosDoDia.length} festa{eventosDoDia.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Lista de eventos do dia */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                {eventosDoDia.map(evento => {
                  const isRealizado = evento.status === 'realizado';
                  return (
                    <div 
                      key={evento.id} 
                      onClick={() => onSelectEvento(evento)}
                      style={{ 
                        background: isRealizado ? 'rgba(0, 229, 255, 0.04)' : 'rgba(255,255,255,0.05)', 
                        borderLeft: `3px solid ${isRealizado ? '#00E5FF' : '#4CAF50'}`,
                        padding: '6px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        cursor: 'pointer',
                        opacity: isRealizado ? 0.85 : 1,
                        transition: 'transform 0.15s, background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isRealizado ? 'rgba(0, 229, 255, 0.04)' : 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evento.nome}
                        </span>
                        {isRealizado && (
                          <span style={{ fontSize: '0.65rem', color: '#00E5FF', fontWeight: 'bold' }}>✓</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <FiPackage /> {evento.pacote || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <FiMapPin /> {evento.cidade || 'N/A'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
}
