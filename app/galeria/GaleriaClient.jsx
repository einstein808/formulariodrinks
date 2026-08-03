"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiChevronRight, FiX, FiPlay, FiMapPin, FiCalendar } from 'react-icons/fi';
import BackgroundEffects from '../../components/BackgroundEffects';
import PageLoader from '../../components/PageLoader';
import Image from 'next/image';

// Card component with slideshow animation
function EventoCard({ evento, onOpen, formatDate }) {
  const todasFotos = [
    ...(evento.capa ? [{ url: evento.capa, tipo: 'imagem', alt: `Foto de capa do evento ${evento.titulo} - Laboratório de Drinks` }] : []),
    ...(evento.midias || []).filter(m => m.tipo !== 'video' && m.url)
  ];

  const [fotoIdx, setFotoIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [pausado, setPausado] = useState(false);
  const intervalRef = useRef(null);

  const avancar = () => {
    if (todasFotos.length <= 1) return;
    setFadeIn(false);
    setTimeout(() => {
      setFotoIdx(i => (i + 1) % todasFotos.length);
      setFadeIn(true);
    }, 300);
  };

  useEffect(() => {
    if (todasFotos.length <= 1 || pausado) return;
    intervalRef.current = setInterval(avancar, 3000);
    return () => clearInterval(intervalRef.current);
  }, [todasFotos.length, pausado, fotoIdx]);

  const fotoAtual = todasFotos[fotoIdx]?.url;
  const totalMidias = (evento.midias || []).length;
  const temVideo = (evento.midias || []).some(m => m.tipo === 'video');

  return (
    <div
      onClick={() => onOpen(evento)}
      style={{
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(203, 161, 83, 0.15)',
        cursor: 'pointer',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s, border-color 0.35s',
      }}
      onMouseEnter={(e) => { 
        e.currentTarget.style.transform = 'translateY(-6px)'; 
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(203, 161, 83, 0.18)'; 
        e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.5)'; 
        setPausado(true); 
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.transform = 'translateY(0)'; 
        e.currentTarget.style.boxShadow = 'none'; 
        e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.15)'; 
        setPausado(false);
      }}
    >
      <div style={{ height: 220, background: '#111', position: 'relative', overflow: 'hidden' }}>
        {fotoAtual ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Image
              key={fotoAtual + fotoIdx}
              src={fotoAtual}
              alt={todasFotos[fotoIdx]?.alt || `Serviço de barman para ${evento.titulo} em ${evento.cidade || 'Juiz de Fora'} - Laboratório de Drinks`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{
                objectFit: 'cover',
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 0.35s ease',
              }}
            />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)' }}>
            <span style={{ fontSize: '3rem' }}>🎉</span>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)', pointerEvents: 'none' }} />

        {totalMidias > 0 && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', color: '#FFF', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.1)' }}>
            🖼️ {totalMidias}{temVideo ? ' & 🎬' : ''}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ver galeria →</span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#FFF', fontFamily: 'var(--font-cinzel), serif' }}>{evento.titulo}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {evento.data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <FiCalendar size={13} color="var(--primary)" />
              <span>{formatDate(evento.data)}</span>
            </div>
          )}
          {evento.cidade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <FiMapPin size={13} color="var(--primary)" />
              <span>{evento.cidade}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GaleriaClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [galeria, setGaleria] = useState([]);
  const [eventoAberto, setEventoAberto] = useState(null);
  const [midiaAtual, setMidiaAtual] = useState(0);
  const [general, setGeneral] = useState(null);

  useEffect(() => {
    const fetchGaleria = async () => {
      try {
        const configSnap = await get(ref(db, 'config'));
        if (configSnap.exists()) {
          const configData = configSnap.val();
          if (configData.general) {
            setGeneral(configData.general);
          }
          if (configData.galeriaEventos) {
            const galeriaArray = Object.entries(configData.galeriaEventos)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setGaleria(galeriaArray);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar galeria:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGaleria();
  }, []);

  const openEvento = (evento) => {
    setMidiaAtual(0);
    setEventoAberto(evento);
    document.body.style.overflow = 'hidden';
    window.history.pushState({ modalOpen: true }, '');
  };

  const fecharEvento = () => {
    setEventoAberto(null);
    document.body.style.overflow = '';
    if (window.history.state?.modalOpen) {
      window.history.back();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (eventoAberto) {
        setEventoAberto(null);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [eventoAberto]);

  const prevMidia = () => setMidiaAtual(i => (i - 1 + (eventoAberto?.midias?.length || 1)) % (eventoAberto?.midias?.length || 1));
  const nextMidia = () => setMidiaAtual(i => (i + 1) % (eventoAberto?.midias?.length || 1));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [ano, mes, dia] = dateStr.split('-');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${parseInt(dia, 10)} de ${meses[parseInt(mes, 10) - 1]} de ${ano}`;
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '120px' }}>
      <BackgroundEffects />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, padding: '32px 16px 24px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <Image 
          src={general?.logoUrl || "/logo.webp"} 
          alt={`Logo ${general?.companyName || "Laboratório de Drinks"}`} 
          width={100}
          height={100}
          priority
          style={{ width: 'clamp(80px, 20vw, 100px)', height: 'auto', marginBottom: 16, filter: 'drop-shadow(0 0 15px rgba(203, 161, 83, 0.3))' }} 
        />
        <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', color: 'var(--primary)', margin: '0 0 8px 0', textShadow: '0 4px 15px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
          Galeria de Eventos
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
          Explore alguns dos melhores eventos já realizados com a experiência premium do {general?.companyName || "Laboratório de Drinks"}.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => router.push('/')}
            className="btn btn--outline" 
            style={{ width: 'auto', padding: '8px 20px', fontSize: '0.85rem' }}
          >
            ← Voltar ao Início
          </button>
          <button 
            onClick={() => router.push('/orcamento')}
            className="btn btn--primary" 
            style={{ width: 'auto', padding: '8px 24px', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            Fazer Reserva
          </button>
        </div>
      </header>

      {/* Grid de Eventos */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        {galeria.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '24px' }}>
            {galeria.map((evento) => (
              <EventoCard key={evento.id} evento={evento} onOpen={openEvento} formatDate={formatDate} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '3rem' }}>📸</span>
            <p style={{ marginTop: '12px' }}>Nenhum evento registrado na galeria ainda.</p>
          </div>
        )}

        {/* Rodapé CTA */}
        <div style={{ textAlign: 'center', marginTop: '64px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(203,161,83,0.08)', padding: '40px 24px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFF', fontSize: '1.4rem', marginBottom: '8px' }}>Gostou das Nossas Festas?</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
            Garanta a melhor coquetelaria e barman premium para a data do seu casamento, formatura ou festa especial.
          </p>
          <button 
            onClick={() => router.push('/orcamento')}
            className="btn btn--primary" 
            style={{ width: 'auto', padding: '12px 32px', fontSize: '0.9rem', fontWeight: 'bold' }}
          >
            Fazer Reserva / Solicitar Orçamento
          </button>
        </div>
      </main>

      {/* Lightbox Modal */}
      {eventoAberto && (
        <div
          onClick={fecharEvento}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}
          >
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#FFF', fontFamily: 'var(--font-cinzel), serif', fontSize: '1.25rem' }}>{eventoAberto.titulo}</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                {eventoAberto.data && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <FiCalendar size={13} color="var(--primary)" /> {formatDate(eventoAberto.data)}
                  </span>
                )}
                {eventoAberto.cidade && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <FiMapPin size={13} color="var(--primary)" /> {eventoAberto.cidade}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={fecharEvento}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)' }}
            >
              <FiX size={18} />
            </button>
          </div>

          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 900, flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#0a0a0a', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {eventoAberto.midias && eventoAberto.midias.length > 0 ? (
              <>
                {eventoAberto.midias[midiaAtual]?.tipo === 'video' ? (
                  <video
                    key={midiaAtual}
                    src={eventoAberto.midias[midiaAtual].url}
                    controls
                    autoPlay
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Image
                    key={midiaAtual}
                    src={eventoAberto.midias[midiaAtual]?.url}
                    alt={eventoAberto.midias[midiaAtual]?.alt || `Foto do evento ${eventoAberto.titulo} em ${eventoAberto.cidade || 'Juiz de Fora'} - Mídia ${midiaAtual + 1} de ${eventoAberto.midias?.length} - Laboratório de Drinks`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 900px"
                    unoptimized={eventoAberto.midias[midiaAtual]?.url?.toLowerCase().includes('.gif')}
                    style={{ objectFit: 'contain' }}
                  />
                )}

                {eventoAberto.midias.length > 1 && (
                  <>
                    <button
                      onClick={prevMidia}
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextMidia}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                    >
                      <FiChevronRight size={20} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>🖼️</span>
                <p>Nenhuma mídia disponível.</p>
              </div>
            )}
          </div>

          {eventoAberto.midias && eventoAberto.midias.length > 1 && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', maxWidth: 900, width: '100%', paddingBottom: 4, scrollbarWidth: 'none', flexShrink: 0 }}
              className="hide-scrollbar"
            >
              {eventoAberto.midias.map((midia, idx) => (
                <div
                  key={idx}
                  onClick={() => setMidiaAtual(idx)}
                  style={{
                    width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                    position: 'relative',
                    border: idx === midiaAtual ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.2s', opacity: idx === midiaAtual ? 1 : 0.5
                  }}
                >
                  {midia.tipo === 'video' ? (
                    <FiPlay size={20} color="#FFF" style={{ zIndex: 2 }} />
                  ) : (
                    <Image src={midia.url} alt={midia.alt || `Miniatura da foto ${idx + 1} do evento ${eventoAberto.titulo} - Laboratório de Drinks`} fill sizes="56px" unoptimized={midia.url?.toLowerCase().includes('.gif')} style={{ objectFit: 'cover' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {eventoAberto.midias && eventoAberto.midias.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>
              {midiaAtual + 1} / {eventoAberto.midias.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
