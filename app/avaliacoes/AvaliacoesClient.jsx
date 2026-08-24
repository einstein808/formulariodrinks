"use client";
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiStar, FiCalendar } from 'react-icons/fi';
import BackgroundEffects from '../../components/BackgroundEffects';
import PageLoader from '../../components/PageLoader';
import Image from 'next/image';

export default function AvaliacoesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dbReviews, setDbReviews] = useState([]);
  const [googleReviewsPrint, setGoogleReviewsPrint] = useState('');
  const [general, setGeneral] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const avaliacoesSnap = await get(ref(db, 'avaliacoes'));
        if (avaliacoesSnap.exists()) {
          const val = avaliacoesSnap.val();
          const arr = Object.entries(val).map(([id, value]) => ({ id, ...value }));
          setDbReviews(arr);
        }

        const configSnap = await get(ref(db, 'config'));
        if (configSnap.exists()) {
          const d = configSnap.val();
          if (d.general) {
            setGeneral(d.general);
            if (d.general.googleReviewsPrint) {
              setGoogleReviewsPrint(d.general.googleReviewsPrint);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar avaliações:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const reviewsToDisplay = dbReviews.length > 0 ? dbReviews : [
    {
      id: 'default-1',
      nome: 'Mariana',
      sobrenome: 'Silva',
      feedback: 'Sem dúvidas a melhor escolha para o nosso casamento! Os drinks frozen fizeram muito sucesso e a equipe foi extremamente ágil e simpática. Nota 1000!',
      stars: 5,
      printUrl: ''
    },
    {
      id: 'default-2',
      nome: 'Lucas',
      sobrenome: 'Oliveira',
      feedback: 'Super profissionais! Contratei o pacote Standard para meu aniversário e todos os convidados elogiaram a qualidade dos insumos e a organização do bar. Recomendo!',
      stars: 5,
      printUrl: ''
    },
    {
      id: 'default-3',
      nome: 'Juliana',
      sobrenome: 'Mendes',
      feedback: 'Cardápio muito variado e apresentação impecável. A caipirinha de morango e o Moscow Mule estavam divinos. Já quero contratar para o próximo evento!',
      stars: 5,
      printUrl: ''
    }
  ];

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
          Depoimentos de Clientes
        </h1>
        
        {/* Classificação Google 5.0 */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.03)', padding: '6px 16px', borderRadius: 30, marginBottom: 20, border: '1px solid rgba(203, 161, 83, 0.12)' }}>
          <img src="/google-logo.svg" alt="Google" style={{ width: 16, height: 16 }} />
          <div style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(s => <FiStar key={s} size={14} fill="#FFC107" color="#FFC107" />)}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>Avaliação 5.0 ★ no Google Reviews</span>
        </div>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
          Veja o que nossos clientes dizem sobre a experiência do bar em seus eventos especiais.
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

      {/* Grade de Depoimentos */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        
        {/* Global Google Reviews Print (se enviado pelo admin e com prioridade) */}
        {googleReviewsPrint && (
          <div style={{ marginBottom: '40px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', background: 'rgba(255,255,255,0.01)' }}>
            <Image 
              src={googleReviewsPrint} 
              alt="Avaliações do Google" 
              width={1000}
              height={300}
              sizes="(max-width: 1000px) 100vw, 1000px"
              quality={80}
              priority
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '400px', objectFit: 'contain' }} 
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '24px' }}>
          {reviewsToDisplay.map((r, idx) => (
            <div 
              key={r.id} 
              style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid rgba(203, 161, 83, 0.08)', 
                borderRadius: '16px', 
                padding: r.printUrl ? '12px' : '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                transition: 'transform 0.3s, border-color 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.08)';
              }}
            >
              {r.printUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.08)', width: '100%', position: 'relative', height: '180px' }}>
                    <Image 
                      src={r.printUrl} 
                      alt={r.nome ? `Depoimento de ${r.nome}` : 'Depoimento de cliente'} 
                      fill 
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
                      loading="lazy"
                      decoding="async"
                      quality={75}
                      style={{ objectFit: 'contain' }} 
                    />
                  </div>
                  {r.feedback && r.feedback !== 'Redirecionado para Google Reviews' && (
                    <p style={{ 
                      margin: '4px 0 0 0', 
                      fontSize: '0.85rem', 
                      color: 'var(--text-secondary)', 
                      lineHeight: '1.4',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}>
                      "{r.feedback}"
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: 'var(--primary)', 
                      color: '#000', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}>
                      {r.nome ? r.nome.trim().charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>{(r.nome || '').trim().split(' ')[0]}</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cliente {r.pacote ? `(Pacote ${r.pacote})` : ''}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'var(--primary)', 
                        color: '#000', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        {r.nome ? r.nome.trim().charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>{(r.nome || '').trim().split(' ')[0]}</h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cliente {r.pacote ? `(Pacote ${r.pacote})` : ''}</span>
                      </div>
                    </div>
                    <div style={{ color: '#FFD54F', fontSize: '0.85rem' }}>
                      {'⭐'.repeat(r.stars || 5)}
                    </div>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.5',
                    fontStyle: 'italic',
                    flex: 1
                  }}>
                    "{r.feedback}"
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé CTA */}
        <div style={{ textAlign: 'center', marginTop: '64px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(203,161,83,0.08)', padding: '40px 24px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFF', fontSize: '1.4rem', marginBottom: '8px' }}>Quer Drinks Premium no seu Evento?</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
            Garanta a nossa equipe de bartenders renomada e surpreenda seus convidados.
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
    </div>
  );
}
