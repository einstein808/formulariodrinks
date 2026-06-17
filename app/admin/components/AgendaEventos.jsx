import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiMapPin, FiPackage } from 'react-icons/fi';

export default function AgendaEventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribe = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const todosLeads = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        
        // Filtra apenas leads fechados que possuem dataEvento
        const eventosFechados = todosLeads.filter(
          lead => lead.status === 'fechado' && lead.dataEvento
        );
        
        setEventos(eventosFechados);
      } else {
        setEventos([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Navegação do calendário
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const goToToday = () => setCurrentDate(new Date());

  // Lógica de construção dos dias do mês
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Segunda...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Agrupar eventos por dia no mês atual
  const getEventosDoDia = (day) => {
    // Formatar dia para comparar com dataEvento (YYYY-MM-DD)
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return eventos.filter(evento => evento.dataEvento === formattedDate);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCalendar /> Agenda de Eventos
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Visualize as datas de todas as festas fechadas.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button onClick={prevMonth} className="btn btn--outline" style={{ padding: '8px', minWidth: 'auto', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiChevronLeft size={20} />
          </button>
          
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#FFF', minWidth: '150px', textAlign: 'center' }}>
            {monthNames[month]} <span style={{ color: 'var(--primary)' }}>{year}</span>
          </h2>
          
          <button onClick={nextMonth} className="btn btn--outline" style={{ padding: '8px', minWidth: 'auto', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiChevronRight size={20} />
          </button>

          <button onClick={goToToday} className="btn btn--primary" style={{ padding: '8px 16px', marginLeft: '8px', fontSize: '0.9rem' }}>
            Hoje
          </button>
        </div>
      </div>

      {/* Calendário Grid */}
      <div style={{ background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        {/* Cabeçalho dos dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#1a1a1a', borderBottom: '1px solid var(--border-color)' }}>
          {daysOfWeek.map(day => (
            <div key={day} className="admin-calendar-day-label" style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
          
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
                  {eventosDoDia.map(evento => (
                    <div key={evento.id} style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      borderLeft: '3px solid var(--primary)',
                      padding: '6px 8px', 
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#FFF' }}>
                        {evento.nome}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <FiPackage /> {evento.pacote || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <FiMapPin /> {evento.cidade || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
