'use client';
import { useEffect, useState, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import Link from 'next/link';

/* ─── helpers ─────────────────────────────────────────── */
function firebaseObjToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function groupDrinks(drinks) {
  const groups = {
    alcoolicos: { label: 'Com Álcool', emoji: '🍸', drinks: [] },
    semAlcool:  { label: 'Sem Álcool', emoji: '🥤', drinks: [] },
    frozen:     { label: 'Frozen',     emoji: '🧊', drinks: [] },
  };

  drinks.forEach(d => {
    if (d.category === 'frozen') {
      groups.frozen.drinks.push(d);
    } else if (d.isNonAlcoholic) {
      groups.semAlcool.drinks.push(d);
    } else {
      groups.alcoolicos.drinks.push(d);
    }
  });

  return Object.entries(groups)
    .filter(([, g]) => g.drinks.length > 0)
    .map(([key, g]) => ({ key, ...g }));
}

/* ─── sub-components ──────────────────────────────────── */
function DrinkItem({ drink, index = 0 }) {
  const ingredientes = drink.receita
    ? drink.receita.map(r => r.insumo).filter(Boolean).join(' · ')
    : null;

  return (
    <div
      className="menu-drink-row"
      style={{ '--item-index': index }}
    >
      <span className="menu-drink-emoji">{drink.emoji || '🍹'}</span>
      <div className="menu-drink-info">
        <div className="menu-drink-name-wrap">
          <span className="menu-drink-name">{drink.name}</span>
          {drink.isNonAlcoholic && (
            <span className="menu-drink-badge">Sem Álcool</span>
          )}
        </div>
        {ingredientes && (
          <span className="menu-drink-ingredients">{ingredientes}</span>
        )}
      </div>
      <span className="menu-drink-sep">✦</span>
    </div>
  );
}

function SectionDivider({ label, emoji }) {
  return (
    <div className="menu-section-divider">
      <span className="menu-section-line" />
      <span className="menu-section-label">{emoji} {label}</span>
      <span className="menu-section-line" />
    </div>
  );
}

/* ─── sticky pricing banner ───────────────────────────── */
function PricingBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`menu-pricing-banner ${visible ? 'menu-pricing-banner--visible' : ''}`}>
      <span className="menu-pricing-text">
        🍹 Os drinks fazem parte do seu pacote — sem cobrança por unidade
      </span>
      <Link href="/orcamento" className="menu-pricing-cta">
        Ver pacotes →
      </Link>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────── */
export default function MenuPage() {
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef([]);

  useEffect(() => {
    get(ref(db, 'config/drinksMenu'))
      .then(snap => {
        if (snap.exists()) setDrinks(firebaseObjToArray(snap.val()));
      })
      .finally(() => setLoading(false));
  }, []);

  // Intersection observer for section reveal
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('menu-section--visible');
      }),
      { threshold: 0.08 }
    );
    sectionRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const groups = groupDrinks(drinks);

  return (
    <>
      <PricingBanner />

      <header className="menu-nav-header">
        <Link href="/" className="menu-nav-back">
          ← Início
        </Link>
        <span className="menu-nav-brand">Laboratório de Drinks</span>
        <Link href="/orcamento" className="menu-nav-cta">
          Orçamento
        </Link>
      </header>

      <main className="menu-page">
        {/* Overlays visuais de iluminação e profundidade */}
        <div className="menu-ambient-lights" aria-hidden="true">
          <div className="menu-light-orb orb-gold" />
          <div className="menu-light-orb orb-emerald" />
          <div className="menu-light-orb orb-center" />
        </div>
        <div className="menu-grain-overlay" aria-hidden="true" />

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="menu-hero">
          <div className="menu-hero-eyebrow">Laboratório de Drinks</div>
          <h1 className="menu-hero-title">
            O cardápio<br />
            <em className="menu-title-glow">do seu evento</em>
          </h1>
          <p className="menu-hero-sub">
            Drinks artesanais feitos para o seu momento.<br />
            Cada receita incluída no pacote — sem surpresas no final.
          </p>
          <div className="menu-hero-scroll-hint" onClick={() => window.scrollTo({ top: window.innerHeight * 0.75, behavior: 'smooth' })}>
            <span className="scroll-arrow">↓</span>
            <span className="scroll-pulse-ring" />
          </div>
        </section>

        {/* ── PRICING NOTE (inline, not just sticky) ─── */}
        <section className="menu-note-section">
          <div className="menu-note-card">
            <div className="menu-note-card-glow" aria-hidden="true" />
            <div className="menu-note-icon">💡</div>
            <div className="menu-note-body">
              <strong>Sem preço por drink.</strong>
              <span> Diferente de buffets tradicionais, nossos drinks são inclusos no pacote contratado. Você escolhe o pacote, nós preparamos o cardápio completo para o seu evento.</span>
            </div>
            <Link href="/orcamento" className="menu-note-link">
              Solicitar orçamento →
            </Link>
          </div>
        </section>

        {/* ── DRINK GROUPS ──────────────────────────── */}
        {loading ? (
          <div className="menu-loading">
            <div className="menu-loading-bar" />
            <div className="menu-loading-bar" style={{ width: '70%', animationDelay: '0.1s' }} />
            <div className="menu-loading-bar" style={{ width: '55%', animationDelay: '0.2s' }} />
          </div>
        ) : (
          groups.map((group, gi) => (
            <section
              key={group.key}
              className="menu-section"
              ref={el => (sectionRefs.current[gi] = el)}
            >
              <SectionDivider label={group.label} emoji={group.emoji} />

              <div className="menu-drinks-list">
                {group.drinks.map((d, di) => (
                  <DrinkItem key={d.id} drink={d} index={di} />
                ))}
              </div>
            </section>
          ))
        )}

        {/* ── FOOTER CTA ────────────────────────────── */}
        <section className="menu-footer-cta">
          <div className="menu-footer-cta-inner">
            <p className="menu-footer-cta-label">Gostou do cardápio?</p>
            <h2 className="menu-footer-cta-title">
              Monte o bar perfeito<br />para o seu evento
            </h2>
            <p className="menu-footer-cta-sub">
              Todos esses drinks podem estar no seu evento.<br />
              Solicite um orçamento e escolha o pacote ideal.
            </p>
            <Link href="/orcamento" className="menu-footer-cta-btn">
              Quero um orçamento
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
