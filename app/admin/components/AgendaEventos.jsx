import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiMapPin, FiPackage, FiX, FiPhone, FiClock, FiUsers, FiHeart, FiUserCheck } from 'react-icons/fi';

function formatPhone(value) {
  let v = (value || '').replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

export default function AgendaEventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [ajudantes, setAjudantes] = useState({});

  const modalOpenRef = useRef(false);

  // Sync selectedEvento with history
  useEffect(() => {
    if (selectedEvento && !modalOpenRef.current) {
      window.history.pushState({ modal: 'eventoDetail' }, '');
      modalOpenRef.current = true;
    } else if (!selectedEvento && modalOpenRef.current) {
      modalOpenRef.current = false;
      if (window.history.state?.modal === 'eventoDetail') {
        window.history.back();
      }
    }
  }, [selectedEvento]);

  // Listen to popstate to close modal on mobile back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (selectedEvento && e.state?.modal !== 'eventoDetail') {
        modalOpenRef.current = false;
        setSelectedEvento(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedEvento]);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const todosLeads = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        
        // Filtra apenas leads fechados ou realizados que possuem dataEvento
        const eventosFechados = todosLeads.filter(
          lead => (lead.status === 'fechado' || lead.status === 'realizado') && lead.dataEvento
        );
        
        setEventos(eventosFechados);

        // Se o evento selecionado foi atualizado no DB, atualiza no modal
        setSelectedEvento(prev => {
          if (!prev) return null;
          const updated = eventosFechados.find(ev => ev.id === prev.id);
          return updated || prev;
        });
      } else {
        setEventos([]);
      }
      setLoading(false);
    });

    const configRef = ref(db, 'config');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.cerimonialistas) setCerimonialistas(data.cerimonialistas);
        if (data.ajudantes) setAjudantes(data.ajudantes);
      }
    });

    return () => {
      unsubscribeLeads();
      unsubscribeConfig();
    };
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
          
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', minWidth: '150px', textAlign: 'center' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
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
                    <div 
                      key={evento.id} 
                      onClick={() => setSelectedEvento(evento)}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        borderLeft: '3px solid var(--primary)',
                        padding: '6px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s, background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
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
      
      {/* Modal de Detalhes do Evento */}
      {selectedEvento && (
        <div 
          onClick={() => setSelectedEvento(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', width: '100%', maxWidth: '560px',
            borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontFamily: 'Cinzel, serif', fontSize: '1.25rem', letterSpacing: '0.5px' }}>Detalhes do Evento</h2>
              <button 
                onClick={() => setSelectedEvento(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 40, minHeight: 40, justifyContent: 'center' }}
                aria-label="Fechar"
              >
                <FiX size={22} />
              </button>
            </div>
            
            <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
              
              {/* Header Info */}
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {selectedEvento.nome} {selectedEvento.sobrenome || ''}
                </div>
                <span style={{ 
                  background: 'rgba(46, 139, 87, 0.15)', 
                  color: '#4CAF50', 
                  border: '1px solid rgba(46, 139, 87, 0.3)', 
                  padding: '4px 14px', 
                  borderRadius: '20px', 
                  fontSize: '0.8rem', 
                  fontWeight: 'bold', 
                  display: 'inline-block' 
                }}>
                  Evento Confirmado
                </span>
              </div>

              {/* Botão de Ação Primária */}
              <div style={{ marginBottom: '24px' }}>
                <a 
                  href={`https://wa.me/55${selectedEvento.telefone ? selectedEvento.telefone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(`Olá ${selectedEvento.nome}, tudo bem? Estou entrando em contato sobre o seu evento do dia ${selectedEvento.dataEvento ? selectedEvento.dataEvento.split('-').reverse().join('/') : ''}.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn"
                  style={{ background: '#25D366', border: 'none', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', minHeight: 46, borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.92rem' }}
                >
                  <FiPhone size={16} /> Chamar no WhatsApp
                </a>
              </div>

              {/* Grid de Informações */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiCalendar size={12} /> Data</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {selectedEvento.dataEvento ? selectedEvento.dataEvento.split('-').reverse().join('/') : '—'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiClock size={12} /> Horário</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedEvento.horarioEvento || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiMapPin size={12} /> Cidade / Local</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedEvento.cidade || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiUsers size={12} /> Convidados</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedEvento.convidados || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiPackage size={12} /> Pacote</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedEvento.pacote || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}><FiHeart size={12} /> Cerimonialista Parceiro</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {selectedEvento.cerimonialista && cerimonialistas[selectedEvento.cerimonialista]
                      ? cerimonialistas[selectedEvento.cerimonialista].nome
                      : '— Sem parceiro / Direto —'}
                  </div>
                </div>
              </div>

              {/* Equipe / Ajudantes Designados */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiUserCheck size={16} /> Equipe Designada
                </h3>
                
                {selectedEvento.ajudantes && Object.keys(selectedEvento.ajudantes).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(selectedEvento.ajudantes).map(([slug, statusVal]) => {
                      const helperInfo = ajudantes[slug];
                      const helperStatus = typeof statusVal === 'object' && statusVal !== null
                        ? (statusVal.status || 'pendente')
                        : (statusVal || 'pendente');
                      const isConfirmed = helperStatus === 'confirmado';
                      const isRefused = helperStatus === 'recusado' || helperStatus === 'indisponivel';
                      
                      return (
                        <div key={slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.1)' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{helperInfo?.nome || slug}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{helperInfo?.telefone ? formatPhone(helperInfo.telefone) : ''}</div>
                          </div>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 'bold', 
                            padding: '3px 8px', 
                            borderRadius: '10px',
                            background: isConfirmed ? 'rgba(46, 139, 87, 0.12)' : (isRefused ? 'rgba(139, 0, 0, 0.12)' : 'rgba(203, 161, 83, 0.12)'),
                            color: isConfirmed ? '#2e8b57' : (isRefused ? '#F44336' : '#FFD54F'),
                            border: `1px solid ${isConfirmed ? 'rgba(46, 139, 87, 0.25)' : (isRefused ? 'rgba(139, 0, 0, 0.25)' : 'rgba(203, 161, 83, 0.25)')}`
                          }}>
                            {isConfirmed ? 'Confirmado' : (isRefused ? 'Indisponível' : 'Pendente')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Nenhum membro da equipe designado para este evento.
                  </p>
                )}
              </div>

            </div>
            
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-card)' }}>
              <button 
                onClick={() => setSelectedEvento(null)} 
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
