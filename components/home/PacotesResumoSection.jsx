"use client";
import React from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export default function PacotesResumoSection({ pacotes = [] }) {
  const visiblePacotes = pacotes.filter(pkg => !pkg.hidden);

  return (
    <section id="pacotes" style={{ position: 'relative', zIndex: 10, padding: '40px 20px', maxWidth: 1180, margin: '0 auto', scrollMarginBottom: 90 }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Nossos Formatos
        </span>
        <h2 style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 'clamp(1.4rem, 4vw, 2.1rem)', color: '#FFFFFF', margin: '8px 0 12px', lineHeight: 1.25 }}>
          Escolha como você quer contratar
        </h2>
        <p style={{ fontSize: 'clamp(0.92rem, 2vw, 1.05rem)', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto' }}>
          Compare os formatos e veja o valor do seu evento no simulador.
        </p>
      </div>

      {visiblePacotes.length ? (
        <div className="home-packages-grid">
          {visiblePacotes.map(pkg => {
            const features = Array.isArray(pkg.features) ? pkg.features : [];

            return (
              <article key={pkg.id} className={`home-package-card${pkg.popular ? ' home-package-card--popular' : ''}`}>
                <div>
                  <span className={`home-package-badge${pkg.popular ? ' home-package-badge--popular' : ''}`}>
                    {pkg.badge || (pkg.popular ? 'Mais escolhido' : 'Pacote')}
                  </span>
                  <div className="home-package-heading">
                    {pkg.emoji && <span aria-hidden="true" className="home-package-emoji">{pkg.emoji}</span>}
                    <h3>{pkg.name}</h3>
                  </div>
                  {pkg.desc && <p className="home-package-description">{pkg.desc}</p>}
                  <div className="home-package-price">
                    <strong>Valor personalizado</strong>
                    <span>calculado com os detalhes do seu evento</span>
                  </div>

                  {features.length > 0 && (
                    <details className="home-package-details">
                      <summary>Ver o que está incluso ({features.length})</summary>
                      <ul>
                        {features.map((feature, index) => (
                          <li key={`${pkg.id}-feature-${index}`}><FiCheck aria-hidden="true" /><span>{feature}</span></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>

                <Link href={`/orcamento?pacote=${encodeURIComponent(pkg.id)}`} className="btn btn--outline home-package-cta">
                  Simular este pacote <FiArrowRight aria-hidden="true" size={16} />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="home-packages-empty">
          <p>Os formatos e valores são definidos conforme os detalhes do evento.</p>
          <Link href="/orcamento" className="btn btn--primary">Calcular orçamento <FiArrowRight aria-hidden="true" /></Link>
        </div>
      )}

      <div className="home-packages-footer">
        <p>Os valores podem variar conforme convidados, duração e formato do evento.</p>
        <div>
          <Link href="/menu">Ver cardápio de drinks <FiArrowRight aria-hidden="true" size={14} /></Link>
          <Link href="/orcamento">Calcular orçamento <FiArrowRight aria-hidden="true" size={14} /></Link>
        </div>
      </div>
    </section>
  );
}
