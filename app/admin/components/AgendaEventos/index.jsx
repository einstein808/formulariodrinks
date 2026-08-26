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
    <div style={{ paddingBottom: '90px' }}>
      {/* Header & Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.45rem', margin: '0 0 4px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCalendar /> Agenda de Eventos
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>Visualize todas as festas fechadas e realizadas.</p>
          </div>
        </div>

        {/* Controles de Navegação e Visão Responsivos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          {/* Navegação de Mês */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', flex: '1', minWidth: '240px' }}>
            <button onClick={prevMonth} className="btn btn--outline" style={{ padding: '6px', minWidth: '34px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Mês Anterior">
              <FiChevronLeft size={18} />
            </button>
            
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', textAlign: 'center', flex: 1 }}>
              {monthName} <span style={{ color: 'var(--primary)' }}>{year}</span>
            </h2>
            
            <button onClick={nextMonth} className="btn btn--outline" style={{ padding: '6px', minWidth: '34px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Próximo Mês">
              <FiChevronRight size={18} />
            </button>

            <button onClick={goToToday} className="btn btn--primary" style={{ padding: '6px 12px', marginLeft: '6px', fontSize: '0.8rem', minHeight: '34px', height: '34px' }}>
              Hoje
            </button>
          </div>

          {/* Toggle Grade/Lista */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '4px', flexShrink: 0 }}>
            <button 
              onClick={() => setModoVisao('grade')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: modoVisao === 'grade' ? 'bold' : 'normal',
                background: modoVisao === 'grade' ? 'var(--primary)' : 'transparent', color: modoVisao === 'grade' ? '#000' : 'var(--text-secondary)',
                minHeight: '34px'
              }}
            >
              <FiGrid /> Grade
            </button>
            <button 
              onClick={() => setModoVisao('lista')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: modoVisao === 'lista' ? 'bold' : 'normal',
                background: modoVisao === 'lista' ? 'var(--primary)' : 'transparent', color: modoVisao === 'lista' ? '#000' : 'var(--text-secondary)',
                minHeight: '34px'
              }}
            >
              <FiList /> Lista
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
