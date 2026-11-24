"use client";
import React from 'react';
import Image from 'next/image';
import { FiArrowRight, FiMapPin, FiStar } from 'react-icons/fi';

const highlights = [
  { icon: '✦', text: 'Frutas frescas e preparo na hora' },
  { icon: '✦', text: 'Estrutura completa para sua festa' },
  { icon: '✦', text: 'Atendimento de 30 a 150 convidados' },
];

export default function HeroSection({ general }) {
  const city = general?.companyCity || 'Juiz de Fora';

  return (
    <header className="home-hero">
      <div className="home-hero__copy">
        <div className="home-hero__eyebrow">
          <span className="home-hero__eyebrow-icon"><FiMapPin size={13} /></span>
          Coquetelaria para eventos · {city} e região
        </div>

        <h1 className="home-hero__title">
          Um bar especial muda <span>o clima da festa.</span>
        </h1>
        <p className="home-hero__description">
          Drinks preparados na hora, ingredientes frescos e um bar que combina com a sua celebração — sem complicar a organização.
        </p>

        <div className="home-hero__actions">
          <a href="/orcamento" className="home-hero__primary">
            Monte seu orçamento <FiArrowRight size={17} aria-hidden="true" />
          </a>
          <a href="/menu" className="home-hero__secondary">Conheça os drinks</a>
        </div>

        <div className="home-hero__trust">
          <div className="home-hero__rating" aria-label="Avaliação 5 de 5 no Google">
            <span className="home-hero__rating-stars"><FiStar size={14} fill="currentColor" /> 5.0</span>
            <span>no Google</span>
          </div>
          <span className="home-hero__trust-divider" />
          <span>Orçamento rápido e personalizado</span>
        </div>

        <ul className="home-hero__highlights" aria-label="Diferenciais">
          {highlights.map(item => <li key={item.text}><span aria-hidden="true">{item.icon}</span>{item.text}</li>)}
        </ul>
      </div>

      <div className="home-hero__visual" aria-label="Drinks preparados para eventos">
        <div className="home-hero__visual-glow" />
        <div className="home-hero__photo home-hero__photo--back home-hero__photo--left">
          <Image src="/drinks/aperol-spritz.jpg" alt="Aperol spritz com laranja" fill priority sizes="(max-width: 760px) 28vw, 210px" />
          <span>Aperol Spritz</span>
        </div>
        <div className="home-hero__photo home-hero__photo--main">
          <Image src="/drinks/mojito.jpg" alt="Mojito com hortelã e limão" fill priority sizes="(max-width: 760px) 52vw, 340px" />
          <span>Feitos na hora, com cuidado</span>
        </div>
        <div className="home-hero__photo home-hero__photo--back home-hero__photo--right">
          <Image src="/drinks/caipirinha.jpg" alt="Caipirinha preparada com limão" fill priority sizes="(max-width: 760px) 28vw, 210px" />
          <span>Clássicos e autorais</span>
        </div>
        <div className="home-hero__visual-note"><FiStar size={15} fill="currentColor" /><span>Um brinde<br />ao seu momento</span></div>
      </div>
    </header>
  );
}
