"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronRight } from 'react-icons/fi';

export default function ParceirosBanner() {
  const router = useRouter();

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px 100px 20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.1) 0%, rgba(12, 22, 16, 0.8) 100%)',
        border: '1px solid rgba(203, 161, 83, 0.3)',
        borderRadius: 20,
        padding: '32px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>
        <span style={{ fontSize: '2.2rem' }}>🤝✨</span>
        <h2 style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--primary)', fontSize: '1.4rem', margin: 0 }}>
          Guia de Fornecedores & Parceiros
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 550, margin: 0, fontSize: '0.92rem', lineHeight: 1.6 }}>
          Planejando seu evento? Conheça os cantores, pagodeiros, decoradores e cerimonialistas de confiança que recomendamos.
        </p>
        <button
          onClick={() => router.push('/parceiros')}
          className="btn btn--outline"
          style={{
            padding: '10px 24px',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4
          }}
        >
          Conferir Parceiros Recomendados <FiChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
