"use client";
import React from 'react';
import Image from 'next/image';
import { FiCheckCircle, FiStar } from 'react-icons/fi';

export default function HeroSection({ general }) {

  return (
    <header style={{ position: 'relative', zIndex: 10, padding: '40px 20px 24px', textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
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
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(203, 161, 83, 0.08)', border: '1px solid rgba(203, 161, 83, 0.25)', marginBottom: 20 }}>
        <span style={{ display: 'flex', color: 'var(--primary)', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600 }}>
          <FiStar size={13} style={{ fill: 'var(--primary)' }} /> 5.0 no Google
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>•</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          {general?.companyCity || "Juiz de Fora"} & Região
        </span>
      </div>

      {/* 3. Headline Principal de Alto Impacto */}
      <h1 style={{ 
        fontFamily: 'var(--font-cinzel), serif', 
        fontSize: 'clamp(1.75rem, 5.5vw, 2.75rem)', 
        color: '#FFFFFF', 
        margin: '0 0 16px 0', 
        letterSpacing: '0.02em', 
        lineHeight: 1.18,
        fontWeight: 700
      }}>
        Um bar de qualidade para sua festa, <span style={{ color: 'var(--primary)', display: 'inline-block' }}>sem gastar uma fortuna.</span>
      </h1>

      {/* 4. Subtítulo Racional e Direto */}
      <p style={{ 
        fontSize: 'clamp(0.95rem, 2.2vw, 1.12rem)', 
        color: 'var(--text-secondary)', 
        maxWidth: '620px', 
        margin: '0 auto 28px', 
        lineHeight: 1.6 
      }}>
        Drinks bem preparados, atendimento profissional e uma experiência que combina com o seu evento. Bar móvel sob medida para mini weddings, aniversários e confraternizações.
      </p>

      {/* 5. CTA secundário */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <a
          href="#pacotes"
          className="btn btn--outline"
          style={{ 
            fontSize: '0.95rem', 
            padding: '13px 22px', 
            textDecoration: 'none',
            color: 'var(--text-primary)',
            borderColor: 'rgba(255,255,255,0.18)'
          }}
        >
          Conhecer pacotes ↓
        </a>
      </div>

      {/* 6. Micro-chancelas de confiança */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FiCheckCircle size={14} style={{ color: 'var(--primary)' }} /> Cálculo em menos de 1 minuto
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FiCheckCircle size={14} style={{ color: 'var(--primary)' }} /> Preço claro e sem taxas ocultas
        </span>
      </div>
    </header>
  );
}
