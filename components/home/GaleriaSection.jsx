"use client";
import React from 'react';
import EventoCard from './EventoCard';

export default function GaleriaSection({
  galeria,
  loading,
  verTodosEventos,
  setVerTodosEventos,
  abrirEvento,
  formatDate
}) {
  if (galeria.length === 0 && !loading) return null;

  const galleryToDisplay = loading
    ? [{ id: 's1', isSkeleton: true }, { id: 's2', isSkeleton: true }, { id: 's3', isSkeleton: true }]
    : (verTodosEventos ? galeria : galeria.slice(0, 3));

  return (
    <section style={{ position: 'relative', zIndex: 10, padding: '36px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', color: '#FFF', textAlign: 'center', marginBottom: 28, letterSpacing: '0.03em' }}>
        Eventos Realizados: Barman em Casamentos e Festas em JF
      </h2>

      <div className="galeria-grid">
        {galleryToDisplay.map((evento, idx) => (
          evento.isSkeleton ? (
            <div key={evento.id || idx} className="skeleton-card" style={{ background: 'var(--bg-card)', borderRadius: 16, height: 340, border: '1px solid rgba(203, 161, 83, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="skeleton-shimmer" style={{ height: 240, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
              <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                <div className="skeleton-shimmer" style={{ height: 16, borderRadius: 4, width: '70%' }} />
                <div className="skeleton-shimmer" style={{ height: 12, borderRadius: 4, width: '40%' }} />
              </div>
            </div>
          ) : (
            <EventoCard
              key={evento.id}
              evento={evento}
              onOpen={abrirEvento}
              formatDate={formatDate}
              priority={idx === 0}
            />
          )
        ))}
      </div>

      {galeria.length > 3 && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            onClick={() => setVerTodosEventos(v => !v)}
            className="btn btn--outline"
            style={{ minHeight: 48, minWidth: 200, fontSize: '1rem', fontWeight: 600 }}
          >
            {verTodosEventos ? '↑ Ver menos' : `Ver todos os ${galeria.length} eventos`}
          </button>
        </div>
      )}
    </section>
  );
}
