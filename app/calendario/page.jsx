"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../lib/firebase';
import { 
  FiCalendar, FiChevronLeft, FiChevronRight, FiMapPin, 
  FiPackage, FiX, FiCheck, FiUser, FiSearch, 
  FiClock, FiUsers, FiLock, FiList
} from 'react-icons/fi';
import BackgroundEffects from '../../components/BackgroundEffects';

function CalendarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const helperSlug = searchParams.get('h') || searchParams.get('ajudante');

  // Firebase states
  const [leads, setLeads] = useState([]);
  const [drinksMenu, setDrinksMenu] = useState({});
  const [allHelpers, setAllHelpers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper-specific states
  const [currentHelper, setCurrentHelper] = useState(null);
  const [helperEvents, setHelperEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // UI states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [choice, setChoice] = useState(null); // 'confirmado' | 'indisponivel'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch initial data
  useEffect(() => {
    // 1. Fetch helpers config to validate/resolve helper name
    const helpersRef = ref(db, 'config/ajudantes');
    const unsubHelpers = onValue(helpersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([slug, val]) => ({ slug, ...val }));
        setAllHelpers(arr);
      } else {
        setAllHelpers([]);
      }
    });

    // 2. Fetch leads
    const leadsRef = ref(db, 'leads');
    const unsubLeads = onValue(leadsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setLeads(arr);
      } else {
        setLeads([]);
      }
    });

    // 3. Fetch drinks menu
    const drinksRef = ref(db, 'config/drinksMenu');
    const unsubDrinks = onValue(drinksRef, (snap) => {
      if (snap.exists()) {
        setDrinksMenu(snap.val());
      }
    });

    return () => {
      unsubHelpers();
      unsubLeads();
      unsubDrinks();
    };
  }, []);

  // Process data for the helper
  useEffect(() => {
    if (leads.length > 0) {
      setLoading(false);
    }

    if (helperSlug) {
      // Find helper details (name and specialty)
      const found = allHelpers.find(h => h.slug === helperSlug);
      if (found) {
        setCurrentHelper(found);
      } else {
        // Fallback name generation
        setCurrentHelper({ 
          nome: helperSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
          slug: helperSlug, 
          especialidade: 'Staff' 
        });
      }

      // Filter closed events where this helper is scheduled
      const filtered = leads.filter(lead => {
        const isClosed = lead.status === 'fechado' || lead.status === 'realizado';
        const hasHelper = lead.ajudantes && lead.ajudantes[helperSlug];
        return isClosed && hasHelper && lead.dataEvento;
      });
      setHelperEvents(filtered);

      // Extract upcoming events (today or later)
      const t = new Date();
      const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      
      const upcoming = filtered
        .filter(event => event.dataEvento >= todayStr)
        .sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
      
      setUpcomingEvents(upcoming);
    } else {
      setCurrentHelper(null);
      setHelperEvents([]);
      setUpcomingEvents([]);
    }
  }, [helperSlug, allHelpers, leads]);

  // Keep modal event updated with DB changes
  useEffect(() => {
    if (selectedEvento) {
      const updated = leads.find(ev => ev.id === selectedEvento.id);
      if (updated) {
        setSelectedEvento(updated);
      }
    }
  }, [leads, selectedEvento]);

  // Calendar parameters
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getHelperStatusForEvent = (event, slug) => {
    if (!event.ajudantes || !event.ajudantes[slug]) return 'pendente';
    const val = event.ajudantes[slug];
    return typeof val === 'object' && val !== null ? (val.status || 'pendente') : (val || 'pendente');
  };

  const getEventosDoDia = (day) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return helperEvents.filter(event => event.dataEvento === formattedDate);
  };

  const handleChoiceClick = (selectedChoice) => {
    setChoice(selectedChoice);
    setShowConfirmModal(true);
  };

  // Shortcut navigation action
  const handleJumpToEvent = (event) => {
    const [evYear, evMonth] = event.dataEvento.split('-').map(Number);
    setCurrentDate(new Date(evYear, evMonth - 1, 1));
    setSelectedEvento(event);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedEvento || !helperSlug || !choice) return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const path = `leads/${selectedEvento.id}/ajudantes/${helperSlug}`;
      
      const updateData = {
        status: choice,
      };

      if (choice === 'confirmado') {
        updateData.confirmouEm = now;
      } else {
        updateData.confirmouEm = null;
      }

      await update(ref(db, path), updateData);
      setShowConfirmModal(false);
    } catch (err) {
      console.error("Erro ao atualizar status da escala:", err);
      alert("Ocorreu um erro ao salvar sua resposta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper date format for shortcuts
  const formatEventDate = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    
    // Get weekday name
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayOfWeek = days[dateObj.getDay()];
    
    return {
      formatted: `${d}/${m}`,
      dayOfWeek
    };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a06' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    );
  }

  // ── RENDER ACCESS RESTRICTION IF NO HELPER SLUG ──────
  if (!helperSlug) {
    return (
      <div style={{ minHeight: '100vh', background: '#050a06', color: '#e8eade', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <BackgroundEffects />
        <div className="bg-grid" />
        
        <div style={{ 
          maxWidth: '450px', 
          width: '100%',
          background: '#0a140d', 
          borderRadius: '16px', 
          border: '1px solid rgba(139, 0, 0, 0.4)', 
          padding: '40px 24px', 
          textAlign: 'center', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(139, 0, 0, 0.12)', border: '1px solid #8b0000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#F44336', margin: '0 auto 20px auto'
          }}>
            <FiLock size={32} />
          </div>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#FFF', marginBottom: 12, fontSize: '1.4rem' }}>
            Acesso Restrito
          </h2>
          <p style={{ color: '#8c9e8e', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
            Esta página é de acesso exclusivo para membros cadastrados da equipe. 
            Por favor, utilize o link de escala individual enviado pelo administrador no WhatsApp para acessar sua agenda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050a06', color: '#e8eade', position: 'relative', overflowX: 'hidden' }}>
      <BackgroundEffects />
      <div className="bg-grid" />

      {/* Main Container */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* ── HEADER ────────────────────────────────────────── */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px', 
          borderBottom: '1px solid rgba(203, 161, 83, 0.15)', 
          paddingBottom: '20px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/logo.webp" alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Cinzel, serif', color: '#cba153', letterSpacing: '1px' }}>
                Portal do Staff
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#8c9e8e' }}>
                Agenda de Trabalho
              </p>
            </div>
          </div>
          
          {currentHelper && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(203, 161, 83, 0.05)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.15)' }}>
              <FiUser size={14} style={{ color: '#cba153' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFF' }}>{currentHelper.nome}</span>
            </div>
          )}
        </header>

        {/* ── CALENDAR & SHORTCUTS CONTENT ──────────────────── */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '24px', 
          alignItems: 'flex-start' 
        }}>
          
          {/* LEFT COLUMN: THE MONTHLY CALENDAR */}
          <div style={{ flex: 1, width: '100%', order: isMobile ? 2 : 1 }}>
            
            {/* Header / Navigation */}
            <div style={{ 
              marginBottom: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px' 
            }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Cinzel, serif', color: '#FFF' }}>
                  Calendário de Escalas
                </h2>
                <p style={{ margin: '2px 0 0 0', color: '#8c9e8e', fontSize: '0.85rem' }}>
                  Função: <strong style={{ color: '#cba153' }}>{currentHelper?.especialidade || 'Bartender'}</strong>
                </p>
              </div>

              {/* Month Navigation */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: '#0a140d', 
                padding: '4px 8px', 
                borderRadius: '10px', 
                border: '1px solid rgba(203, 161, 83, 0.2)' 
              }}>
                <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#cba153', cursor: 'pointer', display: 'flex', padding: 6 }}>
                  <FiChevronLeft size={18} />
                </button>
                <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#FFF', minWidth: '120px', textAlign: 'center', fontFamily: 'Cinzel, serif' }}>
                  {monthNames[month]} <span style={{ color: '#cba153' }}>{year}</span>
                </h3>
                <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#cba153', cursor: 'pointer', display: 'flex', padding: 6 }}>
                  <FiChevronRight size={18} />
                </button>
                <button onClick={goToToday} style={{ padding: '4px 10px', background: '#cba153', border: 'none', color: '#050a06', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer', marginLeft: 4 }}>
                  Hoje
                </button>
              </div>
            </div>

            {/* Grid Calendar */}
            <div style={{ 
              background: '#0a140d', 
              borderRadius: '16px', 
              border: '1px solid rgba(203, 161, 83, 0.2)', 
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              width: '100%'
            }}>
              {/* Calendar Days Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                background: '#070e09', 
                borderBottom: '1px solid rgba(203, 161, 83, 0.15)' 
              }}>
                {daysOfWeek.map(day => (
                  <div key={day} style={{ padding: '12px 4px', textAlign: 'center', fontWeight: 'bold', color: '#8c9e8e', fontSize: '0.85rem' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, auto)' }}>
                {/* Empty days of previous month */}
                {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                  <div 
                    key={`empty-${index}`} 
                    style={{ 
                      borderRight: '1px solid rgba(203, 161, 83, 0.1)', 
                      borderBottom: '1px solid rgba(203, 161, 83, 0.1)', 
                      background: 'rgba(255,255,255,0.01)' 
                    }} 
                  />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dayEvents = getEventosDoDia(day);
                  const todayObj = new Date();
                  const isToday = day === todayObj.getDate() && month === todayObj.getMonth() && year === todayObj.getFullYear();

                  return (
                    <div 
                      key={`day-${day}`} 
                      style={{
                        padding: '6px', 
                        borderRight: '1px solid rgba(203, 161, 83, 0.1)', 
                        borderBottom: '1px solid rgba(203, 161, 83, 0.1)',
                        background: isToday ? 'rgba(203, 161, 83, 0.05)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minHeight: '110px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{
                          width: '24px', height: '24px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          background: isToday ? '#cba153' : 'transparent',
                          color: isToday ? '#050a06' : '#e8eade',
                          fontWeight: isToday ? 'bold' : 'normal',
                          fontSize: '0.8rem'
                        }}>
                          {day}
                        </span>
                      </div>

                      {/* Day Events list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                        {dayEvents.map(event => {
                          const status = getHelperStatusForEvent(event, helperSlug);
                          const isRealizado = event.status === 'realizado';
                          
                          const borderLeftColor = isRealizado ? '#9E9E9E' : (status === 'confirmado' ? '#2e8b57' : (status === 'indisponivel' || status === 'recusado' ? '#8b0000' : '#cba153'));
                          const bg = isRealizado ? 'rgba(158, 158, 158, 0.08)' : (status === 'confirmado' ? 'rgba(46, 139, 87, 0.08)' : (status === 'indisponivel' || status === 'recusado' ? 'rgba(139, 0, 0, 0.08)' : 'rgba(203, 161, 83, 0.08)'));
                          
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvento(event)}
                              style={{
                                background: bg,
                                borderLeft: `3px solid ${borderLeftColor}`,
                                padding: '4px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.background = status === 'confirmado' ? 'rgba(46, 139, 87, 0.15)' : (status === 'indisponivel' || status === 'recusado' ? 'rgba(139, 0, 0, 0.15)' : 'rgba(203, 161, 83, 0.15)');
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = bg;
                              }}
                            >
                              <div style={{ fontWeight: 'bold', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {event.nome}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#8c9e8e', fontSize: '0.68rem', marginTop: 1 }}>
                                <FiMapPin size={9} /> {event.cidade || '—'}
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

          {/* RIGHT COLUMN: SHORTCUT LIST ("PROXIMOS EVENTOS") */}
          <div style={{ 
            width: isMobile ? '100%' : '320px', 
            order: isMobile ? 1 : 2, 
            background: '#0a140d',
            borderRadius: '16px',
            border: '1px solid rgba(203, 161, 83, 0.2)',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '1.1rem', 
              fontFamily: 'Cinzel, serif', 
              color: '#cba153', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderBottom: '1px solid rgba(203, 161, 83, 0.15)',
              paddingBottom: '10px'
            }}>
              <FiList /> Seus Próximos Eventos
            </h3>

            {/* Event list */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              overflowY: 'auto',
              flex: 1,
              maxHeight: isMobile ? '240px' : '450px'
            }}>
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => {
                  const status = getHelperStatusForEvent(event, helperSlug);
                  const isConfirmed = status === 'confirmado';
                  const isRefused = status === 'indisponivel' || status === 'recusado';
                  const isRealizado = event.status === 'realizado';
                  const { formatted, dayOfWeek } = formatEventDate(event.dataEvento);

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleJumpToEvent(event)}
                      style={{
                        background: '#070e09',
                        border: `1px solid ${isRealizado ? 'rgba(158, 158, 158, 0.15)' : 'rgba(203, 161, 83, 0.15)'}`,
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = isRealizado ? '#9E9E9E' : '#cba153';
                        e.currentTarget.style.background = isRealizado ? 'rgba(158, 158, 158, 0.03)' : 'rgba(203, 161, 83, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isRealizado ? 'rgba(158, 158, 158, 0.15)' : 'rgba(203, 161, 83, 0.15)';
                        e.currentTarget.style.background = '#070e09';
                      }}
                    >
                      {/* Date Badge */}
                      <div style={{
                        background: isRealizado ? 'rgba(158, 158, 158, 0.1)' : 'rgba(203, 161, 83, 0.1)',
                        border: `1px solid ${isRealizado ? 'rgba(158, 158, 158, 0.3)' : 'rgba(203, 161, 83, 0.3)'}`,
                        borderRadius: '8px',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isRealizado ? '#9E9E9E' : '#cba153' }}>{formatted}</span>
                        <span style={{ fontSize: '0.6rem', color: '#8c9e8e', textTransform: 'uppercase' }}>{dayOfWeek}</span>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: isRealizado ? '#aaa' : '#FFF', 
                          fontSize: '0.88rem', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          textDecoration: isRealizado ? 'line-through' : 'none'
                        }}>
                          {event.nome}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#8c9e8e', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <FiMapPin size={10} /> {event.cidade}
                        </div>
                        
                        {/* Status tag */}
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          marginTop: 6,
                          color: isRealizado ? '#9E9E9E' : (isConfirmed ? '#2e8b57' : (isRefused ? '#F44336' : '#FFD54F'))
                        }}>
                          • {isRealizado ? 'Realizado' : (isConfirmed ? 'Confirmado' : (isRefused ? 'Indisponível' : 'Pendente'))}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#8c9e8e', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Nenhum evento futuro programado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Color Legend (Separate row) */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginTop: '20px', 
          flexWrap: 'wrap', 
          background: '#0a140d', 
          padding: '10px 16px', 
          borderRadius: '8px', 
          border: '1px solid rgba(203, 161, 83, 0.1)', 
          fontSize: '0.78rem' 
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8eade' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e8b57', display: 'inline-block' }}></span>
            Confirmado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8eade' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cba153', display: 'inline-block' }}></span>
            Pendente
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8eade' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b0000', display: 'inline-block' }}></span>
            Recusado / Indisponível
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8eade' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9E9E9E', display: 'inline-block' }}></span>
            Realizado
          </span>
        </div>

        {/* ── MODAL DE DETALHES DO EVENTO ───────────────────── */}
        {selectedEvento && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}>
            <div style={{
              background: '#0a140d', width: '100%', maxWidth: '500px',
              borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.25)',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
              animation: 'fadeInUp 0.3s ease'
            }}>
              <div style={{ 
                padding: '20px', 
                borderBottom: '1px solid rgba(203, 161, 83, 0.15)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: '#070e09'
              }}>
                <h3 style={{ margin: 0, color: '#cba153', fontFamily: 'Cinzel, serif', fontSize: '1.2rem' }}>
                  Detalhes do Trabalho
                </h3>
                <button 
                  onClick={() => setSelectedEvento(null)} 
                  style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', minWidth: 40, minHeight: 40, justifyContent: 'center' }}
                  aria-label="Fechar"
                >
                  <FiX size={22} />
                </button>
              </div>
              
              <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
                
                {/* Event header info */}
                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <span style={{ 
                    fontFamily: 'Cinzel, serif',
                    fontSize: '0.8rem', 
                    color: '#cba153', 
                    letterSpacing: '1px', 
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 4
                  }}>
                    {selectedEvento.tipoEvento || 'Festa/Evento'}
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFF', marginBottom: '8px' }}>
                    {selectedEvento.nome} {selectedEvento.sobrenome || ''}
                  </div>
                  
                  {/* Status Badge */}
                  {(() => {
                    const isRealizado = selectedEvento.status === 'realizado';
                    const status = getHelperStatusForEvent(selectedEvento, helperSlug);
                    const isConfirmed = status === 'confirmado';
                    const isRefused = status === 'indisponivel' || status === 'recusado';
                    if (isRealizado) {
                      return (
                        <span style={{ 
                          background: 'rgba(158, 158, 158, 0.15)', 
                          color: '#9E9E9E', 
                          border: '1px solid rgba(158, 158, 158, 0.4)', 
                          padding: '4px 14px', 
                          borderRadius: '20px', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold', 
                          display: 'inline-block', 
                          marginTop: '6px' 
                        }}>
                          Evento Realizado
                        </span>
                      );
                    }
                    return (
                      <span style={{ 
                        background: isConfirmed ? 'rgba(46, 139, 87, 0.15)' : (isRefused ? 'rgba(139, 0, 0, 0.15)' : 'rgba(203, 161, 83, 0.15)'), 
                        color: isConfirmed ? '#2e8b57' : (isRefused ? '#F44336' : '#FFD54F'), 
                        border: `1px solid ${isConfirmed ? 'rgba(46, 139, 87, 0.4)' : (isRefused ? 'rgba(139, 0, 0, 0.4)' : 'rgba(203, 161, 83, 0.4)')}`, 
                        padding: '4px 14px', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold', 
                        display: 'inline-block', 
                        marginTop: '6px' 
                      }}>
                        {isConfirmed ? 'Sua Presença Está Confirmada' : (isRefused ? 'Você recusou este evento' : 'Aguardando sua confirmação')}
                      </span>
                    );
                  })()}
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ background: '#070e09', padding: '12px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8c9e8e', display: 'flex', alignItems: 'center', gap: '4px' }}><FiCalendar size={12} /> Data</div>
                    <div style={{ fontWeight: 'bold', marginTop: '4px', color: '#FFF' }}>
                      {selectedEvento.dataEvento ? selectedEvento.dataEvento.split('-').reverse().join('/') : '—'}
                    </div>
                  </div>

                  <div style={{ background: '#070e09', padding: '12px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.15)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8c9e8e', display: 'flex', alignItems: 'center', gap: '4px' }}><FiClock size={12} /> Horário</div>
                    <div style={{ fontWeight: 'bold', marginTop: '4px', color: '#FFF' }}>{selectedEvento.horarioEvento || '—'}</div>
                  </div>

                  <div style={{ background: '#070e09', padding: '12px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.15)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8c9e8e', display: 'flex', alignItems: 'center', gap: '4px' }}><FiMapPin size={12} /> Cidade / Local</div>
                    <div style={{ fontWeight: 'bold', marginTop: '4px', color: '#FFF' }}>{selectedEvento.cidade || '—'}</div>
                  </div>

                  <div style={{ background: '#070e09', padding: '12px', borderRadius: '8px', border: '1px solid rgba(203, 161, 83, 0.15)', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8c9e8e', display: 'flex', alignItems: 'center', gap: '4px' }}><FiPackage size={12} /> Pacote Contratado</div>
                    <div style={{ fontWeight: 'bold', marginTop: '4px', color: '#FFF' }}>{selectedEvento.pacote || '—'}</div>
                  </div>
                </div>

                {/* Drinks Selection */}
                {selectedEvento.drinksEscolhidos && selectedEvento.drinksEscolhidos.length > 0 && (
                  <div style={{ background: '#070e09', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(203, 161, 83, 0.15)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#cba153', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', paddingBottom: '6px', fontSize: '0.9rem' }}>
                      Drinks do Evento
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedEvento.drinksEscolhidos.map(d => {
                        const drinkInfo = drinksMenu[d];
                        const displayName = drinkInfo ? `${drinkInfo.emoji || '🍹'} ${drinkInfo.name}`.trim() : d;
                        return (
                          <span key={d} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.78rem', color: '#e8eade' }}>
                            {displayName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Response Action Box */}
                {selectedEvento.status !== 'realizado' ? (
                  <div style={{ 
                    background: 'rgba(203, 161, 83, 0.02)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(203, 161, 83, 0.2)',
                    padding: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#FFF', textAlign: 'center' }}>
                      Sua Disponibilidade para este Evento:
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '12px', marginTop: 12 }}>
                      <button
                        onClick={() => handleChoiceClick('confirmado')}
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          background: '#2e8b57', 
                          border: 'none', 
                          color: 'white', 
                          padding: '10px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        <FiCheck size={16} /> Confirmar Presença
                      </button>
                      <button
                        onClick={() => handleChoiceClick('indisponivel')}
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          background: 'none', 
                          border: '1px solid #8b0000', 
                          color: '#F44336', 
                          padding: '10px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        <FiX size={16} /> Recusar Escala
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: 'rgba(158, 158, 158, 0.02)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(158, 158, 158, 0.2)',
                    padding: '16px',
                    textAlign: 'center',
                    color: '#9E9E9E',
                    fontSize: '0.85rem'
                  }}>
                    Este evento já foi finalizado e concluído. Não é mais possível alterar sua presença.
                  </div>
                )}

              </div>
              
              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(203, 161, 83, 0.15)', display: 'flex', justifyContent: 'flex-end', background: '#070e09' }}>
                <button 
                  onClick={() => setSelectedEvento(null)} 
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFF',
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

        {/* ── DUPLA VALIDAÇÃO MODAL ─────────────────────────── */}
        {showConfirmModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}>
            <div style={{
              background: '#0a140d', width: '100%', maxWidth: '380px',
              borderRadius: '12px', border: '1px solid rgba(203, 161, 83, 0.3)',
              padding: '24px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
            }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', color: '#cba153', marginBottom: 12, fontSize: '1.2rem' }}>
                Confirmar Resposta?
              </h3>
              
              <p style={{ color: '#FFF', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 24 }}>
                {choice === 'confirmado' 
                  ? `Você confirma que trabalhará no evento de ${selectedEvento?.nome} no dia ${selectedEvento?.dataEvento?.split('-').reverse().join('/')}?`
                  : `Você confirma que recusa a escala para o evento de ${selectedEvento?.nome} no dia ${selectedEvento?.dataEvento?.split('-').reverse().join('/')}?`
                }
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  style={{ 
                    flex: 1, 
                    height: '40px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: choice === 'confirmado' ? '#2e8b57' : '#8b0000', 
                    border: 'none', 
                    color: 'white', 
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isSubmitting ? <div className="btn__spinner" /> : 'Confirmar'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  style={{ 
                    flex: 1, 
                    height: '40px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#FFF', 
                    border: '1px solid rgba(255,255,255,0.15)', 
                    background: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a06' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
      </div>
    }>
      <CalendarioContent />
    </Suspense>
  );
}
