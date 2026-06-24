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
  const kenBurnsClass = `kb-${fotoIdx % 4}`; // alterna direção do Ken Burns

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
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.01)'; 
        e.currentTarget.style.boxShadow = '0 20px 50px rgba(203, 161, 83, 0.25)'; 
        e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.6)'; 
        setPausado(true); 
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
        e.currentTarget.style.boxShadow = 'none'; 
        e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.15)'; 
        setPausado(false);
      }}
    >
      {/* Área da capa com slideshow */}
      <div style={{ height: 240, background: '#111', position: 'relative', overflow: 'hidden' }}>
        {fotoAtual ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Image
              key={fotoAtual + fotoIdx}
              src={fotoAtual}
              alt={evento.titulo}
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

export default function Portfolio() {
  const [drinks, setDrinks] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [galeria, setGaleria] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
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
            .filter(a => a.stars >= 4 && a.feedback); // Puxa apenas as boas com texto
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

  if (loading) {
    return <PageLoader />;
  }

  const abrirEvento = (evento) => {
    setEventoAberto(evento);
    setMidiaAtual(0);
    document.body.style.overflow = 'hidden';
  };

  const fecharEvento = () => {
    setEventoAberto(null);
    document.body.style.overflow = '';
  };

  const prevMidia = () => setMidiaAtual(i => (i - 1 + (eventoAberto?.midias?.length || 1)) % (eventoAberto?.midias?.length || 1));
  const nextMidia = () => setMidiaAtual(i => (i + 1) % (eventoAberto?.midias?.length || 1));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [ano, mes, dia] = dateStr.split('-');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${parseInt(dia, 10)} de ${meses[parseInt(mes, 10) - 1]} de ${ano}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: 100 }}>
      <BackgroundEffects />

      {/* Header / Hero */}
      <header style={{ position: 'relative', zIndex: 10, padding: '32px 16px 24px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <Image 
          src="/logo.webp" 
          alt="Logo Laboratório de Drinks - Barman em Juiz de Fora" 
          width={140}
          height={140}
          priority
          style={{ width: 'clamp(90px, 25vw, 140px)', height: 'auto', marginBottom: 20, filter: 'drop-shadow(0 0 20px rgba(203, 161, 83, 0.4))' }} 
        />
        <h1 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 6vw, 2.5rem)', color: 'var(--primary)', margin: '0 0 16px 0', textShadow: '0 4px 20px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
          Barman em Juiz de Fora: Transforme seu evento com o Laboratório de Drinks
        </h1>
        
        {/* Trust Badge - SEO Social Proof */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.05)', padding: '8px 16px', borderRadius: 30, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: 18, height: 18 }} />
          <div style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(s => <FiStar key={s} size={14} fill="#FFC107" color="#FFC107" />)}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>Avaliação totalizada Google 5.0 de 5</span>
        </div>

        <p style={{ fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '0 4px' }}>
          Surpreenda seus convidados com uma experiência inesquecível. Da alquimia da fumaça do Laboratório Frozen aos clássicos da coquetelaria reinventados.
        </p>
      </header>

      {/* 1. Testimonials */}
      {avaliacoes.length > 0 && (
        <section style={{ position: 'relative', zIndex: 10, padding: '40px 24px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: '#FFF', textAlign: 'center', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ height: 1, flex: 1, background: 'linear-gradient(to left, var(--primary), transparent)' }} />
              O Melhor Serviço de Bartender de JF
              <span style={{ height: 1, flex: 1, background: 'linear-gradient(to right, var(--primary), transparent)' }} />
            </h2>
            <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 24, scrollbarWidth: 'none' }} className="hide-scrollbar">
              {avaliacoes.map((ava, idx) => (
                <div key={idx} style={{ 
                  minWidth: 300, flex: '0 0 300px', background: 'var(--bg-card)', padding: 24, borderRadius: 16, 
                  border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[...Array(ava.stars)].map((_, i) => <FiStar key={i} size={18} fill="#FFC107" color="#FFC107" />)}
                  </div>
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0, flex: 1, lineHeight: 1.5 }}>
                    "{ava.feedback}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                    <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                      {ava.nome.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#FFF' }}>{ava.nome}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evento com Pacote {ava.pacote}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. Galeria de Eventos Realizados */}
      {galeria.length > 0 && (
        <section style={{ position: 'relative', zIndex: 10, padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: '#FFF', textAlign: 'center', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ height: 1, flex: 1, background: 'linear-gradient(to left, var(--primary), transparent)' }} />
            Eventos Realizados: Barman em Casamentos e Festas em JF
            <span style={{ height: 1, flex: 1, background: 'linear-gradient(to right, var(--primary), transparent)' }} />
          </h2>

          <div className="galeria-grid">
            {(verTodosEventos ? galeria : galeria.slice(0, 3)).map((evento, idx) => (
              <EventoCard
                key={evento.id}
                evento={evento}
                onOpen={abrirEvento}
                formatDate={formatDate}
                priority={idx === 0}
              />
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

      {/* 3. Tipos de Eventos que Atendemos */}
      <section style={{ position: 'relative', zIndex: 10, padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: '#FFF', textAlign: 'center', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ height: 1, flex: 1, background: 'linear-gradient(to left, var(--primary), transparent)' }} />
          Bar para Diferentes Eventos
          <span style={{ height: 1, flex: 1, background: 'linear-gradient(to right, var(--primary), transparent)' }} />
        </h2>

        <div className="eventos-grid">
          {(tiposEvento.length > 0 ? tiposEvento : [
            { id: 'casamento', label: 'Casamento', icon: '💍' },
            { id: 'aniversario', label: 'Aniversário', icon: '🎂' },
            { id: 'corporativo', label: 'Corporativo', icon: '🏢' },
            { id: 'formatura', label: 'Formatura', icon: '🎓' },
            { id: 'confraternizacao', label: 'Confraternização', icon: '🎉' },
            { id: 'cha-bar', label: 'Chá Bar', icon: '🍸' },
            { id: 'debutante', label: 'Debutante', icon: '👑' },
          ]).map((item) => {
            const descricoes = {
              casamento: "O brinde perfeito para o seu grande dia. Um bar sofisticado com coquetéis personalizados e atendimento premium para encantar seus convidados.",
              aniversario: "Celebre a vida com muito estilo. Estruturas completas de bar temático que encantam convidados de todas as idades com drinks incríveis.",
              corporativo: "Sofisticação e profissionalismo para sua marca. Ideal para confraternizações, lançamentos e congressos que exigem excelência.",
              formatura: "A celebração máxima da sua conquista. Drinks instagramáveis, dezenas de opções e muita energia para fazer sua noite histórica.",
              confraternizacao: "Reúna amigos ou colaboradores com o melhor bar. Drinks descontraídos e clássicos preparados por barmen profissionais.",
              'cha-bar': "Comemore seu chá bar com coquetéis personalizados, brincadeiras temáticas e muita diversão antes do grande dia.",
              debutante: "Os 15 anos merecem um bar dos sonhos. Coquetéis sem álcool super coloridos, milkshakes especiais e drinks premium para os adultos."
            };
            return (
              <div 
                key={item.id} 
                className="evento-tipo-card"
                onClick={() => router.push(`/eventos/${item.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ height: 180, background: '#111', position: 'relative', overflow: 'hidden', borderRadius: '12px', marginBottom: 16 }}>
                  {item.image ? (
                    <Image 
                      src={item.image} 
                      alt={item.label} 
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      style={{ objectFit: 'cover', transition: 'transform 0.5s' }} 
                      className="evento-tipo-img" 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a140d, #1a2a1d)' }}>
                      <span style={{ fontSize: '3rem' }}>{item.icon}</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {item.icon}
                  </div>
                </div>
                <h3 className="evento-tipo-title">{item.label}</h3>
                <p className="evento-tipo-desc">
                  {item.desc || descricoes[item.id] || "Estrutura de bar completa com atendimento profissional e coquetéis personalizados para o seu evento."}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Packages Section */}
      {pacotes.length > 0 && (
        <section style={{ position: 'relative', zIndex: 10, padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: '1.8rem', color: '#FFF', textAlign: 'center', marginBottom: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <span style={{ height: 1, flex: 1, background: 'linear-gradient(to left, var(--primary), transparent)' }} />
            Pacotes de Barman para Casamentos e Festas
            <span style={{ height: 1, flex: 1, background: 'linear-gradient(to right, var(--primary), transparent)' }} />
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 24, 
            alignItems: 'center' 
          }}>
            {pacotes.map((pacote, idx) => {
              const isPopular = idx === 1; // Efeito Isca: pacote do meio destacado
              
              return (
                <div key={pacote.id} style={{ 
                  background: isPopular ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)',
                  borderRadius: 16, 
                  border: isPopular ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                  padding: 32,
                  position: 'relative',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  transform: isPopular ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isPopular ? '0 8px 32px rgba(203, 161, 83, 0.2)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}>
                  {isPopular && (
                    <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#000', padding: '4px 16px', borderRadius: 20, fontWeight: 'bold', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🔥 Mais Escolhido
                    </div>
                  )}

                  <h3 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: '1.5rem', color: isPopular ? 'var(--primary)' : '#FFF', margin: '0 0 8px 0', textAlign: 'center' }}>
                    {pacote.name}
                  </h3>
                  
                  {pacote.desc && (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 24px 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {pacote.desc}
                    </p>
                  )}

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                    {(pacote.features || []).map((feature, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <FiCheck size={12} />
                        </div>
                        <span style={{ color: '#DDD', fontSize: '0.95rem', lineHeight: 1.4 }}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => router.push(`/orcamento?pacote=${pacote.id}`)}
                    className="btn btn--primary"
                    style={{ width: '100%', background: isPopular ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: isPopular ? '#000' : '#FFF', borderColor: 'transparent' }}
                  >
                    Selecionar Pacote
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Drinks Gallery */}
      <section style={{ position: 'relative', zIndex: 10, padding: '32px 16px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: '#FFF', textAlign: 'center', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ height: 1, flex: 1, background: 'linear-gradient(to left, var(--primary), transparent)' }} />
          Cardápio de Drinks Exclusivos
          <span style={{ height: 1, flex: 1, background: 'linear-gradient(to right, var(--primary), transparent)' }} />
        </h2>

        <div className="drinks-grid">
          {(verTodosDrinks ? drinks : drinks.slice(0, 6)).map(drink => (
            <div key={drink.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.1)' }}>
              <div style={{ height: 220, background: '#111', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {drink.image ? (
                  <Image 
                    src={drink.image} 
                    alt={drink.name} 
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

          {/* Área da mídia */}
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
                    alt={`${eventoAberto.titulo} - ${midiaAtual + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 900px"
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
                    <Image src={midia.url} alt="thumb" fill sizes="64px" style={{ objectFit: 'cover' }} />
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
    </div>
  );
}
