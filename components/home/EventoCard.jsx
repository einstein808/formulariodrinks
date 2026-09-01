"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FiCalendar, FiMapPin } from 'react-icons/fi';

export default function EventoCard({ evento, onOpen, formatDate, priority = false }) {
  const todasFotos = [
    ...(evento.capa ? [{ url: evento.capa, tipo: 'imagem' }] : []),
    ...(evento.midias || []).filter(m => m.tipo !== 'video' && m.url)
  ];

  const [fotoIdx, setFotoIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipedRef = useRef(false);

  const retroceder = () => {
    if (todasFotos.length <= 1) return;
    setFadeIn(false);
    setTimeout(() => {
      setFotoIdx(i => (i - 1 + todasFotos.length) % todasFotos.length);
      setFadeIn(true);
    }, 250);
  };

  const avancar = () => {
    if (todasFotos.length <= 1) return;
    setFadeIn(false);
    setTimeout(() => {
      setFotoIdx(i => (i + 1) % todasFotos.length);
      setFadeIn(true);
    }, 250);
  };

  useEffect(() => {
    if (todasFotos.length <= 1 || !hovered) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(avancar, 2500);
    return () => clearInterval(intervalRef.current);
  }, [todasFotos.length, hovered, fotoIdx]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipedRef.current = false;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - endX;
    const diffY = touchStartY.current - endY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      swipedRef.current = true;
      if (diffX > 0) {
        avancar();
      } else {
        retroceder();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleClick = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    onOpen(evento);
  };

  const fotoAtual = todasFotos[fotoIdx]?.url;
  const totalMidias = (evento.midias || []).length;
  const temVideo = (evento.midias || []).some(m => m.tipo === 'video');
  const kenBurnsClass = `kb-${fotoIdx % 4}`;

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, border-color 0.25s, box-shadow 0.25s',
        touchAction: 'pan-y'
      }}
      onMouseEnter={(e) => { 
        e.currentTarget.style.transform = 'translateY(-4px)'; 
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'; 
        e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.35)'; 
        setHovered(true); 
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.transform = 'translateY(0)'; 
        e.currentTarget.style.boxShadow = 'none'; 
        e.currentTarget.style.borderColor = 'var(--border-color)'; 
        setHovered(false);
        setFotoIdx(0);
        setFadeIn(true);
      }}
    >
      {/* Área da capa com slideshow */}
      <div style={{ height: 240, background: '#111', position: 'relative', overflow: 'hidden' }}>
        {fotoAtual ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Image
              key={fotoAtual + fotoIdx}
              src={fotoAtual}
              alt={`Serviço de barman para ${evento.titulo} em ${evento.cidade || 'Juiz de Fora'} - Laboratório de Drinks`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={priority && fotoIdx === 0}
              style={{
                objectFit: 'cover',
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 0.35s ease',
              }}
              className={`ken-burns ${kenBurnsClass}`}
            />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)' }}>
            <span style={{ fontSize: '4rem' }}>🎉</span>
          </div>
        )}

        {/* Gradiente e badge */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)', pointerEvents: 'none' }} />

        {totalMidias > 0 && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', color: '#FFF', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.12)' }}>
            🖼️ {totalMidias}{temVideo ? ' & 🎬' : ''}
          </div>
        )}

        {/* Dots de indicação */}
        {todasFotos.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
            {todasFotos.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === fotoIdx ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === fotoIdx ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Call to action */}
        <div style={{ position: 'absolute', bottom: 26, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ver galeria →</span>
        </div>
      </div>

      {/* Info do card */}
      <div style={{ padding: '16px 20px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', color: '#FFF', fontFamily: 'var(--font-cinzel), serif' }}>{evento.titulo}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {evento.data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
              <FiCalendar size={13} color="var(--primary)" />
              <span>{formatDate(evento.data)}</span>
            </div>
          )}
          {evento.cidade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
              <FiMapPin size={13} color="var(--primary)" />
              <span>{evento.cidade}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
