"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiGrid, FiList } from 'react-icons/fi';
import { useAgendaData } from './hooks/useAgendaData';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import CalendarGrid from './views/CalendarGrid';
import CalendarList from './views/CalendarList';
import EventoDetailModal from './modals/EventoDetailModal';

export default function AgendaEventos() {
  const {
    eventos,
    loading,
    selectedEvento,
    setSelectedEvento,
    cerimonialistas,
    ajudantes,
    drinksMenu,
    drinksConfig,
    shoppingConfig,
    handleToggleCheckItem,
    handleToggleAllChecks
  } = useAgendaData();

  const {
    currentDate,
    prevMonth,
    nextMonth,
    goToToday,
    today,
    year,
    month,
    monthName,
    firstDayOfMonth,
    daysInMonth,
    daysOfWeek,
    getEventosDoDia
  } = useCalendarNavigation(eventos);

  const [modoVisao, setModoVisao] = useState('grade');
  const modalOpenRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setModoVisao('lista');
    }
  }, []);

  // Sync selectedEvento with browser history for mobile back button
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

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>;
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header & Controls */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 8px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCalendar /> Agenda de Eventos
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Visualize as datas de todas as festas fechadas e realizadas.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Toggle Grade/Lista */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '4px' }}>
            <button 
              onClick={() => setModoVisao('grade')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: modoVisao === 'grade' ? 'bold' : 'normal',
                background: modoVisao === 'grade' ? 'var(--primary)' : 'transparent', color: modoVisao === 'grade' ? '#000' : 'var(--text-secondary)'
              }}
            >
              <FiGrid /> Grade
            </button>
            <button 
              onClick={() => setModoVisao('lista')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: modoVisao === 'lista' ? 'bold' : 'normal',
                background: modoVisao === 'lista' ? 'var(--primary)' : 'transparent', color: modoVisao === 'lista' ? '#000' : 'var(--text-secondary)'
              }}
            >
              <FiList /> Lista
            </button>
          </div>

          {/* Navegação de Mês */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button onClick={prevMonth} className="btn btn--outline" style={{ padding: '8px', minWidth: 'auto', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiChevronLeft size={20} />
            </button>
            
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', minWidth: '150px', textAlign: 'center' }}>
              {monthName} <span style={{ color: 'var(--primary)' }}>{year}</span>
            </h2>
            
            <button onClick={nextMonth} className="btn btn--outline" style={{ padding: '8px', minWidth: 'auto', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiChevronRight size={20} />
            </button>

            <button onClick={goToToday} className="btn btn--primary" style={{ padding: '8px 16px', marginLeft: '8px', fontSize: '0.9rem' }}>
              Hoje
            </button>
          </div>
        </div>
      </div>

      {/* Visualização em Grade ou Lista */}
      {modoVisao === 'grade' ? (
        <CalendarGrid 
          daysOfWeek={daysOfWeek}
          firstDayOfMonth={firstDayOfMonth}
          daysInMonth={daysInMonth}
          today={today}
          month={month}
          year={year}
          getEventosDoDia={getEventosDoDia}
          onSelectEvento={setSelectedEvento}
        />
      ) : (
        <CalendarList 
          eventos={eventos} 
          onSelectEvento={setSelectedEvento} 
        />
      )}

      {/* Modal de Detalhes do Evento */}
      <EventoDetailModal 
        selectedEvento={selectedEvento}
        onClose={() => setSelectedEvento(null)}
        cerimonialistas={cerimonialistas}
        ajudantes={ajudantes}
        drinksMenu={drinksMenu}
        drinksConfig={drinksConfig}
        shoppingConfig={shoppingConfig}
        onToggleCheckItem={handleToggleCheckItem}
        onToggleAllChecks={handleToggleAllChecks}
      />
    </div>
  );
}
