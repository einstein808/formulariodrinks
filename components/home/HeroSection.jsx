"use client";
import React from 'react';
import Image from 'next/image';

export default function HeroSection({ general }) {
  return (
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
  );
}
