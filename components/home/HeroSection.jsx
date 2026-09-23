"use client";
import React from 'react';
import Image from 'next/image';
import { FiStar } from 'react-icons/fi';

export default function HeroSection({ general }) {

  return (
    <header style={{ position: 'relative', zIndex: 10, padding: '24px 20px 12px', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
      {/* 1. Logo */}
      <div style={{ display: 'inline-block', marginBottom: 16 }}>
        <Image 
          src={general?.logoUrl || "/logo.webp"} 
          alt={`Logo ${general?.companyName || "Laboratório de Drinks"} - Barman em ${general?.companyCity || "Juiz de Fora"}`} 
          width={130}
          height={130}
          priority
          sizes="130px"
          style={{ width: 'clamp(90px, 24vw, 125px)', height: 'auto', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }} 
        />
      </div>

      {/* 2. Badge de Localização & Prova Social */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(203, 161, 83, 0.08)', border: '1px solid rgba(203, 161, 83, 0.25)', marginBottom: 12 }}>
        <span style={{ display: 'flex', color: 'var(--primary)', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
          <FiStar size={13} style={{ fill: 'var(--primary)' }} /> 5.0 no Google
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>•</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          {general?.companyCity || "Juiz de Fora"} & Região
        </span>
      </div>

      {/* Subtítulo Discreto e Elegante */}
      <p style={{ 
        fontSize: 'clamp(0.98rem, 2.2vw, 1.15rem)', 
        color: 'var(--text-secondary)', 
        maxWidth: '560px', 
        margin: '0 auto 16px', 
        lineHeight: 1.5,
        fontWeight: 400
      }}>
        Bar profissional de coquetelaria para casamentos e eventos de <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>30 a 150 convidados</strong>.
      </p>

      {/* CTA Principal de Conversão */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <a
          href="/orcamento"
          className="btn btn--primary"
          style={{ 
            fontSize: '0.98rem', 
            padding: '13px 28px', 
            textDecoration: 'none',
            color: '#0a100d',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(203, 161, 83, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 12
          }}
        >
          Calcule seu orçamento em menos de 1 minuto →
        </a>
      </div>
    </header>
  );
}
