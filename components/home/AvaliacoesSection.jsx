"use client";
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiStar } from 'react-icons/fi';

const defaultReviews = [
  {
    id: 'default-1',
    nome: 'Mariana Silva',
    pacote: 'Laboratório',
    feedback: 'Sem dúvidas a melhor escolha para o nosso casamento! Os drinks autorais fizeram muito sucesso e a equipe foi extremamente ágil e simpática. Nota 1000!',
    stars: 5,
    printUrl: ''
  },
  {
    id: 'default-2',
    nome: 'Lucas Oliveira',
    pacote: 'Reatividade',
    feedback: 'Super profissionais! Contratei para meu aniversário e todos os convidados elogiaram a qualidade dos insumos e a organização do bar. Recomendo!',
    stars: 5,
    printUrl: ''
  },
  {
    id: 'default-3',
    nome: 'Juliana Mendes',
    pacote: 'Experimento',
    feedback: 'Apresentação impecável e atendimento de primeira. A caipirinha gourmet e o Moscow Mule estavam divinos. Já quero para o próximo evento!',
    stars: 5,
    printUrl: ''
  }
];

export default function AvaliacoesSection({
  avaliacoes,
  general,
  loading
}) {
  const router = useRouter();

  const featuredReviews = avaliacoes.filter(ava => ava.destacado === true);
  const allValidReviews = (featuredReviews.length > 0 ? featuredReviews : avaliacoes);
  const finalReviewsList = allValidReviews.length > 0 ? allValidReviews : defaultReviews;
  const reviewsToDisplay = loading
    ? [{ id: 's1', isSkeleton: true }, { id: 's2', isSkeleton: true }, { id: 's3', isSkeleton: true }]
    : finalReviewsList.slice(0, 6);

  if (reviewsToDisplay.length === 0 && !loading) return null;

  return (
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

        {/* Print Oficial Geral do Google Reviews se cadastrado pelo admin */}
        {general?.googleReviewsPrint && (
          <div style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', background: 'rgba(255,255,255,0.01)' }}>
            <Image 
              src={general.googleReviewsPrint} 
              alt="Avaliações do Google Reviews 5 Estrelas" 
              width={850}
              height={250}
              sizes="(max-width: 850px) 100vw, 850px"
              quality={80}
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '350px', objectFit: 'contain' }} 
            />
          </div>
        )}

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
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(203, 161, 83, 0.08)', flex: 1, minHeight: '180px', maxHeight: '220px', height: 200, width: '100%', position: 'relative', background: '#0a0a0a' }}>
                    <Image 
                      src={ava.printUrl} 
                      alt={`Print do depoimento do cliente ${ava.nome} avaliando o Laboratório de Drinks com 5 estrelas`} 
                      fill
                      sizes="(max-width: 768px) 280px, 320px"
                      loading="lazy"
                      decoding="async"
                      quality={80}
                      style={{ objectFit: 'contain' }} 
                    />
                  </div>
                  {ava.feedback && ava.feedback !== 'Redirecionado para Google Reviews' && (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'center' }}>
                      "{ava.feedback}"
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 160 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[...Array(ava.stars || 5)].map((_, i) => <FiStar key={i} size={18} fill="#FFC107" color="#FFC107" />)}
                  </div>
                  <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0, flex: 1, lineHeight: 1.5, fontSize: '0.9rem' }}>
                    "{ava.feedback}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                      {ava.nome ? ava.nome.trim().charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#FFF' }}>{(ava.nome || '').trim().split(' ')[0]}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evento com Pacote {ava.pacote}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {finalReviewsList.length > 6 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => router.push('/avaliacoes')}
              className="btn btn--outline"
              style={{ minHeight: 40, padding: '8px 24px', fontSize: '0.88rem', fontWeight: 600 }}
            >
              Ver todas as {finalReviewsList.length} avaliações →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
