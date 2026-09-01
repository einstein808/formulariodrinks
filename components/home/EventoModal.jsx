"use client";
import React, { useRef } from 'react';
import Image from 'next/image';
import { FiX, FiCalendar, FiMapPin, FiChevronLeft, FiChevronRight, FiPlay } from 'react-icons/fi';

export default function EventoModal({
  evento,
  midiaAtual,
  setMidiaAtual,
  onClose,
  formatDate
}) {
  const modalTouchStartX = useRef(null);
  const modalTouchStartY = useRef(null);

  if (!evento) return null;

  const prevMidia = () => setMidiaAtual(i => (i - 1 + (evento.midias?.length || 1)) % (evento.midias?.length || 1));
  const nextMidia = () => setMidiaAtual(i => (i + 1) % (evento.midias?.length || 1));

  const handleModalTouchStart = (e) => {
    modalTouchStartX.current = e.touches[0].clientX;
    modalTouchStartY.current = e.touches[0].clientY;
  };

  const handleModalTouchEnd = (e) => {
    if (modalTouchStartX.current === null || modalTouchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = modalTouchStartX.current - endX;
    const diffY = modalTouchStartY.current - endY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) {
        nextMidia();
      } else {
        prevMidia();
      }
    }
    modalTouchStartX.current = null;
    modalTouchStartY.current = null;
  };

  const midia = evento.midias?.[midiaAtual];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', padding: '20px'
      }}
    >
      {/* Header do modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: '#FFF', fontFamily: 'var(--font-cinzel), serif', fontSize: '1.3rem' }}>{evento.titulo}</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {evento.data && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <FiCalendar size={13} color="var(--primary)" /> {formatDate(evento.data)}
              </span>
            )}
            {evento.cidade && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <FiMapPin size={13} color="var(--primary)" /> {evento.cidade}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)' }}
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Área central com imagem/vídeo e setas */}
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={handleModalTouchStart}
        onTouchEnd={handleModalTouchEnd}
        style={{ position: 'relative', width: '100%', maxWidth: 900, height: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {midia ? (
          <>
            {midia.tipo === 'video' ? (
              <video
                src={midia.url}
                controls
                autoPlay
                playsInline
                style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, outline: 'none', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <Image
                  src={midia.url}
                  alt={`Foto do evento ${evento.titulo} em ${evento.cidade || 'Juiz de Fora'} - Laboratório de Drinks`}
                  fill
                  sizes="(max-width: 900px) 100vw, 900px"
                  unoptimized={midia.url?.toLowerCase().includes('.gif')}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Setas de navegação desktop */}
            {evento.midias && evento.midias.length > 1 && (
              <>
                <button
                  onClick={prevMidia}
                  className="galeria-nav-btn"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
                >
                  <FiChevronLeft size={22} />
                </button>
                <button
                  onClick={nextMidia}
                  className="galeria-nav-btn"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
                >
                  <FiChevronRight size={22} />
                </button>
              </>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🖼️</span>
            <p>Nenhuma mídia cadastrada para este evento.</p>
          </div>
        )}
      </div>

      {/* Miniaturas + contador */}
      {evento.midias && evento.midias.length > 1 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', maxWidth: 900, width: '100%', paddingBottom: 4, scrollbarWidth: 'none', flexShrink: 0 }}
          className="hide-scrollbar"
        >
          {evento.midias.map((m, idx) => (
            <div
              key={idx}
              onClick={() => setMidiaAtual(idx)}
              style={{
                width: 64, height: 64, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                position: 'relative',
                border: idx === midiaAtual ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.2s', opacity: idx === midiaAtual ? 1 : 0.5
              }}
            >
              {m.tipo === 'video' ? (
                <FiPlay size={24} color="#FFF" style={{ zIndex: 2 }} />
              ) : (
                <Image src={m.url} alt={`Miniatura da foto ${idx + 1} do evento ${evento.titulo} - Laboratório de Drinks`} fill sizes="64px" unoptimized={m.url?.toLowerCase().includes('.gif')} style={{ objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      {evento.midias && evento.midias.length > 1 && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>
          {midiaAtual + 1} / {evento.midias.length}
        </div>
      )}
    </div>
  );
}
