"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { FiStar, FiChevronRight, FiCheck, FiX, FiChevronLeft, FiMapPin, FiCalendar, FiPlay } from 'react-icons/fi';
import BackgroundEffects from '../components/BackgroundEffects';
import PageLoader from '../components/PageLoader';
import Image from 'next/image';

// Componente de card com slideshow automático + Ken Burns
function EventoCard({ evento, onOpen, formatDate, priority = false }) {
  // Monta a lista de todas as mídias de imagem, começa com a capa
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
  const kenBurnsClass = `kb-${fotoIdx % 4}`; // alterna direção do Ken Burns

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

        {/* Badge de mídias */}
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

export default function HomeClient() {
  const [drinks, setDrinks] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [galeria, setGaleria] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [general, setGeneral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventoAberto, setEventoAberto] = useState(null);
  const [midiaAtual, setMidiaAtual] = useState(0);
  const [verTodosEventos, setVerTodosEventos] = useState(false);
  const [verTodosDrinks, setVerTodosDrinks] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configSnap = await get(ref(db, 'config'));
        if (configSnap.exists()) {
          const configData = configSnap.val();
          if (configData.general) {
            setGeneral(configData.general);
          }
          if (configData.drinksMenu) {
            const drinksArray = Object.entries(configData.drinksMenu)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setDrinks(drinksArray);
          }
          if (configData.pacotes) {
            const pacotesArray = Object.entries(configData.pacotes)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setPacotes(pacotesArray);
          }
          if (configData.galeriaEventos) {
            const galeriaArray = Object.entries(configData.galeriaEventos)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => {
                // Ordena do mais recente para o mais antigo
                if (a.data && b.data) return new Date(b.data) - new Date(a.data);
                return (a.order ?? 0) - (b.order ?? 0);
              });
            setGaleria(galeriaArray);
          }
          if (configData.tiposEvento) {
            const tiposArray = Object.entries(configData.tiposEvento)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setTiposEvento(tiposArray);
          }
        }

        const avaliacoesSnap = await get(ref(db, 'avaliacoes'));
        if (avaliacoesSnap.exists()) {
          const avaArray = Object.entries(avaliacoesSnap.val())
            .map(([id, val]) => ({ id, ...val }))
            .filter(a => a.stars >= 4 && (a.feedback || a.printUrl)); // Puxa apenas as boas com texto ou print
          setAvaliacoes(avaArray);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do portfólio:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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



  const abrirEvento = (evento) => {
    setEventoAberto(evento);
    setMidiaAtual(0);
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

  const prevMidia = () => setMidiaAtual(i => (i - 1 + (eventoAberto?.midias?.length || 1)) % (eventoAberto?.midias?.length || 1));
  const nextMidia = () => setMidiaAtual(i => (i + 1) % (eventoAberto?.midias?.length || 1));

  const modalTouchStartX = useRef(null);
  const modalTouchStartY = useRef(null);

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
        // Arrasta da direita para a esquerda -> Próxima foto
        nextMidia();
      } else {
        // Arrasta da esquerda para a direita -> Foto anterior
        prevMidia();
      }
    }
    modalTouchStartX.current = null;
    modalTouchStartY.current = null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [ano, mes, dia] = dateStr.split('-');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${parseInt(dia, 10)} de ${meses[parseInt(mes, 10) - 1]} de ${ano}`;
  };

  const featuredReviews = avaliacoes.filter(ava => ava.destacado === true);
  const reviewsToDisplay = loading
    ? [ { id: 's1', isSkeleton: true }, { id: 's2', isSkeleton: true }, { id: 's3', isSkeleton: true } ]
    : (featuredReviews.length > 0 ? featuredReviews : avaliacoes);

  const galleryToDisplay = loading
    ? [ { id: 's1', isSkeleton: true }, { id: 's2', isSkeleton: true }, { id: 's3', isSkeleton: true } ]
    : (verTodosEventos ? galeria : galeria.slice(0, 3));

  const drinksToDisplay = loading
    ? [ { id: 's1', isSkeleton: true }, { id: 's2', isSkeleton: true }, { id: 's3', isSkeleton: true }, { id: 's4', isSkeleton: true }, { id: 's5', isSkeleton: true }, { id: 's6', isSkeleton: true } ]
    : (verTodosDrinks ? drinks : drinks.slice(0, 6));

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: 100 }}>
      <BackgroundEffects />

      {/* Header / Hero */}
      <header style={{ position: 'relative', zIndex: 10, padding: '32px 16px 24px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <Image 
          src={general?.logoUrl || "/logo.webp"} 
          alt={`Logo ${general?.companyName || "Laboratório de Drinks"} - Barman em ${general?.companyCity || "Juiz de Fora"}`} 
          width={140}
          height={140}
          priority
          sizes="140px"
          style={{ width: 'clamp(90px, 25vw, 130px)', height: 'auto', marginBottom: 16 }} 
        />
        <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.5rem, 5vw, 2.4rem)', color: 'var(--primary)', margin: '0 0 12px 0', letterSpacing: '0.04em', lineHeight: 1.2 }}>
          {general?.siteTitle || "Laboratório de Drinks - Barman Juiz de Fora"}
        </h1>
        {general?.siteSubtitle && (
          <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.05rem)', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            {general.siteSubtitle}
          </p>
        )}
      </header>

      {/* 1. Testimonials moved below Cardápio for LCP performance */}

      {/* 2. Galeria de Eventos Realizados */}
      {(galeria.length > 0 || loading) && (
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
      )}

      {/* 1. Testimonials (NPS / Google Reviews) */}
      {(reviewsToDisplay.length > 0 || loading) && (
        <section style={{ position: 'relative', zIndex: 10, padding: '36px 16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
          <div style={{ maxWidth: 850, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', color: '#FFF', textAlign: 'center', margin: 0, letterSpacing: '0.03em' }}>
                O Melhor Serviço de Bartender de {general?.companyCity || 'JF'}
              </h2>
              
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.02)', padding: '8px 16px', borderRadius: 24, border: '1px solid var(--border-color)' }}>
                <img src="/google-logo.svg" alt="Google" style={{ width: 20, height: 20 }} />
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1,2,3,4,5].map(s => <FiStar key={s} size={18} fill="#FFC107" color="#FFC107" />)}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Avaliação Google 5.0 de 5</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20, scrollbarWidth: 'none' }} className="hide-scrollbar">
              {reviewsToDisplay.map((ava, idx) => (
                <div key={ava.id || idx} style={{ 
                  minWidth: 280, flex: '0 0 clamp(280px, 80vw, 320px)', background: 'var(--bg-card)', padding: ava.isSkeleton ? 24 : (ava.printUrl ? 12 : 24), borderRadius: 12, 
                  border: '1px solid rgba(203, 161, 83, 0.25)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                  {ava.isSkeleton ? (
                    <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1,2,3,4,5].map(s => <div key={s} className="skeleton-shimmer" style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(203, 161, 83, 0.3)' }} />)}
                      </div>
                      <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, width: '100%' }} />
                      <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, width: '85%' }} />
                      <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, width: '60%' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
                        <div className="skeleton-shimmer" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <div className="skeleton-shimmer" style={{ height: 12, borderRadius: 4, width: '50%' }} />
                          <div className="skeleton-shimmer" style={{ height: 10, borderRadius: 4, width: '30%' }} />
                        </div>
                      </div>
                    </div>
                  ) : ava.printUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', width: '100%' }}>
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.08)', flex: 1, maxHeight: '200px', height: 200, width: '100%', position: 'relative' }}>
                        <Image 
                          src={ava.printUrl} 
                          alt={`Print do depoimento do cliente ${ava.nome} avaliando o Laboratório de Drinks com 5 estrelas`} 
                          fill
                          sizes="(max-width: 768px) 280px, 320px"
                          loading={idx === 0 ? "eager" : "lazy"}
                          priority={idx === 0}
                          style={{ objectFit: 'contain' }} 
                        />
                      </div>
                      {ava.feedback && ava.feedback !== 'Redirecionado para Google Reviews' && (
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'center' }}>
                          "{ava.feedback}"
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
                        <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {ava.nome ? ava.nome.trim().charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.85rem' }}>{(ava.nome || '').trim().split(' ')[0]}</div>
                           {ava.pacote && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evento com Pacote {ava.pacote}</div>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[...Array(ava.stars || 5)].map((_, i) => <FiStar key={i} size={18} fill="#FFC107" color="#FFC107" />)}
                      </div>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0, flex: 1, lineHeight: 1.5 }}>
                        "{ava.feedback}"
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                          {ava.nome ? ava.nome.trim().charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#FFF' }}>{(ava.nome || '').trim().split(' ')[0]}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evento com Pacote {ava.pacote}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Drinks Gallery */}
      <section style={{ position: 'relative', zIndex: 10, padding: '36px 16px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', color: '#FFF', textAlign: 'center', marginBottom: 28, letterSpacing: '0.03em' }}>
          Cardápio de Drinks Exclusivos
        </h2>

        <div className="drinks-grid">
          {drinksToDisplay.map(drink => (
            drink.isSkeleton ? (
              <div key={drink.id} className="skeleton-card" style={{ background: 'var(--bg-card)', borderRadius: 16, height: 280, border: '1px solid rgba(203, 161, 83, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="skeleton-shimmer" style={{ height: 220 }} />
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'center' }}>
                  <div className="skeleton-shimmer" style={{ height: 16, borderRadius: 4, width: '60%' }} />
                </div>
              </div>
            ) : (
              <div key={drink.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.1)' }}>
                <div style={{ height: 220, background: '#111', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {drink.image ? (
                    <Image 
                      src={drink.image} 
                      alt={`Coquetel ${drink.name} premium preparado pelo Laboratório de Drinks`} 
                      fill
                      sizes="(max-width: 768px) 50vw, 20vw"
                      style={{ objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '4rem' }}>{drink.emoji}</span>
                  )}
                </div>
                <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>{drink.name}</h3>
                </div>
              </div>
            )
          ))}
        </div>

        {drinks.length > 6 && (
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button
              onClick={() => setVerTodosDrinks(v => !v)}
              className="btn btn--outline"
              style={{ minHeight: 48, minWidth: 200, fontSize: '1rem', fontWeight: 600 }}
            >
              {verTodosDrinks ? '↑ Ver menos' : `Ver todos os ${drinks.length} drinks`}
            </button>
          </div>
        )}
      </section>


      {/* Fixed CTA */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: 20, 
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 50%, transparent)', 
        zIndex: 100, display: 'flex', justifyContent: 'center' 
      }}>
        <button 
          onClick={() => router.push('/orcamento')}
          className="btn btn--primary"
          style={{ maxWidth: 400, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 4px 20px rgba(203, 161, 83, 0.4)' }}
        >
          Faça seu Orçamento Agora <FiChevronRight size={20} />
        </button>
      </div>
      
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 20%, rgba(203,161,83,0.18) 50%, rgba(255,255,255,0.04) 80%) !important;
          background-size: 200% 100% !important;
          animation: shimmer 1.6s ease-in-out infinite !important;
        }
        .skeleton-card {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
        }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .galeria-nav-btn:hover { background: rgba(203, 161, 83, 0.3) !important; }

        /* Grids responsivos */
        .galeria-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .drinks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .eventos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        .evento-tipo-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(203, 161, 83, 0.1);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        .evento-tipo-card:hover {
          transform: translateY(-6px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(203, 161, 83, 0.4);
          box-shadow: 0 12px 30px rgba(203, 161, 83, 0.15);
        }
        .evento-tipo-card:hover .evento-tipo-img {
          transform: scale(1.08);
        }
        .evento-tipo-icon {
          font-size: 2.5rem;
          margin-bottom: 16px;
          filter: drop-shadow(0 0 8px rgba(203, 161, 83, 0.2));
        }
        .evento-tipo-title {
          font-family: var(--font-cinzel), serif;
          font-size: 1.25rem;
          color: #FFF;
          margin: 0 0 12px 0;
          letter-spacing: 0.05em;
        }
        .evento-tipo-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* Mobile: 1 coluna */
        @media (max-width: 600px) {
          .galeria-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .drinks-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .eventos-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        /* Tablet: 2 colunas para galeria */
        @media (min-width: 601px) and (max-width: 900px) {
          .galeria-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .drinks-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .eventos-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Ken Burns base */
        .ken-burns {
          will-change: transform;
          animation-duration: 6s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }
        .ken-burns.kb-0 { animation-name: kb-zoom-tl; }
        .ken-burns.kb-1 { animation-name: kb-zoom-br; }
        .ken-burns.kb-2 { animation-name: kb-zoom-tr; }
        .ken-burns.kb-3 { animation-name: kb-zoom-bl; }

        @keyframes kb-zoom-tl {
          0%   { transform: scale(1)    translateX(0)      translateY(0); }
          100% { transform: scale(1.12) translateX(-2%)    translateY(-2%); }
        }
        @keyframes kb-zoom-br {
          0%   { transform: scale(1)    translateX(0)      translateY(0); }
          100% { transform: scale(1.12) translateX(2%)     translateY(2%); }
        }
        @keyframes kb-zoom-tr {
          0%   { transform: scale(1)    translateX(0)      translateY(0); }
          100% { transform: scale(1.12) translateX(2%)     translateY(-2%); }
        }
        @keyframes kb-zoom-bl {
          0%   { transform: scale(1)    translateX(0)      translateY(0); }
          100% { transform: scale(1.12) translateX(-2%)    translateY(2%); }
        }
      `}</style>

      {/* Modal Carrossel de Evento */}
      {eventoAberto && (
        <div
          onClick={fecharEvento}
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
              <h3 style={{ margin: '0 0 4px 0', color: '#FFF', fontFamily: 'var(--font-cinzel), serif', fontSize: '1.3rem' }}>{eventoAberto.titulo}</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                {eventoAberto.data && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <FiCalendar size={13} color="var(--primary)" /> {formatDate(eventoAberto.data)}
                  </span>
                )}
                {eventoAberto.cidade && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <FiMapPin size={13} color="var(--primary)" /> {eventoAberto.cidade}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={fecharEvento}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)' }}
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Área da mídia com suporte a swipe */}
          <div
            onClick={e => e.stopPropagation()}
            onTouchStart={handleModalTouchStart}
            onTouchEnd={handleModalTouchEnd}
            style={{ width: '100%', maxWidth: 900, flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#0a0a0a', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', touchAction: 'pan-y' }}
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
                    alt={`Foto do evento ${eventoAberto.titulo} em ${eventoAberto.cidade || 'Juiz de Fora'} - Mídia ${midiaAtual + 1} de ${eventoAberto.midias?.length} - Laboratório de Drinks`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 900px"
                    unoptimized={eventoAberto.midias[midiaAtual]?.url?.toLowerCase().includes('.gif')}
                    style={{ objectFit: 'contain', transition: 'opacity 0.2s' }}
                  />
                )}

                {/* Navegação */}
                {eventoAberto.midias.length > 1 && (
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
                    width: 64, height: 64, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                    position: 'relative',
                    border: idx === midiaAtual ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.2s', opacity: idx === midiaAtual ? 1 : 0.5
                  }}
                >
                  {midia.tipo === 'video' ? (
                    <FiPlay size={24} color="#FFF" style={{ zIndex: 2 }} />
                  ) : (
                    <Image src={midia.url} alt={`Miniatura da foto ${idx + 1} do evento ${eventoAberto.titulo} - Laboratório de Drinks`} fill sizes="64px" unoptimized={midia.url?.toLowerCase().includes('.gif')} style={{ objectFit: 'cover' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contador */}
          {eventoAberto.midias && eventoAberto.midias.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>
              {midiaAtual + 1} / {eventoAberto.midias.length}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
