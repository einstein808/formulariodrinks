'use client';
import { useEffect, useState, useRef } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { FiSearch, FiX, FiArrowRight } from 'react-icons/fi';

/* ─── helpers ─────────────────────────────────────────── */
function firebaseObjToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function groupDrinks(drinks) {
  const groups = {
    alcoolicos: { label: 'Com Álcool', emoji: '🍸', description: 'Clássicos e autorais preparados na hora.', drinks: [] },
    semAlcool:  { label: 'Sem Álcool', emoji: '🥤', description: 'Opções refrescantes para todos aproveitarem.', drinks: [] },
    frozen:     { label: 'Frozen',     emoji: '🧊', description: 'Textura gelada e sabores marcantes.', drinks: [] },
  };

  drinks.forEach(d => {
    const category = normalizeSearch(d.category).replace(/[\s-]+/g, '_');
    if (category === 'frozen') {
      groups.frozen.drinks.push(d);
    } else if (d.isNonAlcoholic || ['sem_alcool', 'nao_alcoolico'].includes(category)) {
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
  const [imageFailed, setImageFailed] = useState(false);
  const receita = Array.isArray(drink.receita) ? drink.receita : [];
  const ingredientes = receita.map(item => item?.insumo).filter(Boolean).join(' · ');
  const normalizedCategory = normalizeSearch(drink.category).replace(/[\s-]+/g, '_');
  const isNonAlcoholic = drink.isNonAlcoholic || ['sem_alcool', 'nao_alcoolico'].includes(normalizedCategory);

  return (
    <article
      className="menu-drink-card"
      style={{ '--item-index': index }}
    >
      <div className="menu-drink-image">
        {drink.image && !imageFailed ? (
          <img src={drink.image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="menu-drink-image-emoji" aria-hidden="true">{drink.emoji || '🍹'}</span>
        )}
        {isNonAlcoholic && <span className="menu-drink-badge">Sem Álcool</span>}
      </div>
      <div className="menu-drink-info">
        <h3 className="menu-drink-name">{drink.name}</h3>
        {ingredientes && (
          <span className="menu-drink-ingredients">{ingredientes}</span>
        )}
      </div>
    </article>
  );
}

function SectionDivider({ label, emoji, description, count, headingId }) {
  return (
    <div className="menu-section-divider">
      <div>
        <h2 id={headingId} className="menu-section-label">{emoji} {label}</h2>
        <p className="menu-section-description">{description} <span>{count} {count === 1 ? 'drink' : 'drinks'}</span></p>
      </div>
      <span className="menu-section-line" aria-hidden="true" />
    </div>
  );
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const sectionRefs = useRef({});

  useEffect(() => {
    get(ref(db, 'config/drinksMenu'))
      .then(snap => {
        if (snap.exists()) setDrinks(firebaseObjToArray(snap.val()));
      })
      .catch(err => {
        console.error('Erro ao carregar o cardápio:', err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const groups = groupDrinks(drinks);
  const normalizedSearch = normalizeSearch(searchTerm);
  const visibleGroups = groups
    .filter(group => selectedCategory === 'todos' || selectedCategory === group.key)
    .map(group => ({
      ...group,
      drinks: group.drinks.filter(drink => {
        if (!normalizedSearch) return true;
        const ingredients = (Array.isArray(drink.receita) ? drink.receita : []).map(item => item?.insumo).join(' ');
        return normalizeSearch(`${drink.name} ${ingredients}`).includes(normalizedSearch);
      }),
    }))
    .filter(group => group.drinks.length > 0);
  const visibleDrinkCount = visibleGroups.reduce((total, group) => total + group.drinks.length, 0);
  const visibleGroupKeys = visibleGroups.map(group => group.key).join('|');

  // Intersection observer is reconnected when search/category filtering changes sections.
  useEffect(() => {
    if (loading) return;
    if (!('IntersectionObserver' in window)) {
      Object.values(sectionRefs.current).forEach(el => el?.classList.add('menu-section--visible'));
      return;
    }
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('menu-section--visible');
      }),
      { threshold: 0.08 }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loading, visibleGroupKeys]);

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
          <button type="button" className="menu-hero-scroll-hint" aria-label="Ir para o cardápio" onClick={() => document.getElementById('menu-catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="scroll-arrow">↓</span>
            <span className="scroll-pulse-ring" />
          </button>
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

        {/* ── DRINK CATALOG ──────────────────────────── */}
        <section id="menu-catalogo" className="menu-catalog" aria-label="Catálogo de drinks">
          <div className="menu-catalog-heading">
            <div>
              <span className="menu-catalog-eyebrow">Nossa carta</span>
              <h2>Encontre seu próximo favorito</h2>
              <p>Busque por nome ou ingrediente e explore cada estilo.</p>
            </div>
            {!loading && !loadError && <span className="menu-result-count" aria-live="polite">{visibleDrinkCount} de {drinks.length} drinks</span>}
          </div>

          {!loading && !loadError && drinks.length > 0 && (
            <div className="menu-controls">
              <div className="menu-search">
                <FiSearch aria-hidden="true" size={18} />
                <label htmlFor="menu-search-input" className="sr-only">Buscar drinks por nome ou ingrediente</label>
                <input
                  id="menu-search-input"
                  type="search"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Buscar drink ou ingrediente..."
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar busca"><FiX size={18} /></button>
                )}
              </div>
              <nav className="menu-category-filters" aria-label="Filtrar por categoria">
                <button type="button" className={selectedCategory === 'todos' ? 'is-active' : ''} aria-pressed={selectedCategory === 'todos'} onClick={() => setSelectedCategory('todos')}>
                  Todos <span>{drinks.length}</span>
                </button>
                {groups.map(group => (
                  <button key={group.key} type="button" className={selectedCategory === group.key ? 'is-active' : ''} aria-pressed={selectedCategory === group.key} onClick={() => setSelectedCategory(group.key)}>
                    {group.emoji} {group.label} <span>{group.drinks.length}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          {loading ? (
            <div className="menu-loading" aria-label="Carregando cardápio" aria-busy="true">
              <div className="menu-loading-bar" />
              <div className="menu-loading-bar" style={{ width: '70%', animationDelay: '0.1s' }} />
              <div className="menu-loading-bar" style={{ width: '55%', animationDelay: '0.2s' }} />
            </div>
          ) : loadError ? (
            <div className="menu-empty-state" role="alert">
              <span aria-hidden="true">🥂</span>
              <h3>Não conseguimos carregar o cardápio agora.</h3>
              <p>Tente novamente em instantes ou fale com nossa equipe.</p>
              <Link href="/orcamento" className="menu-empty-cta">Pedir um orçamento <FiArrowRight aria-hidden="true" /></Link>
            </div>
          ) : drinks.length === 0 ? (
            <div className="menu-empty-state">
              <span aria-hidden="true">🍹</span>
              <h3>Estamos preparando nossa carta.</h3>
              <p>Enquanto isso, conte para nós como será o seu evento.</p>
              <Link href="/orcamento" className="menu-empty-cta">Conversar sobre meu evento <FiArrowRight aria-hidden="true" /></Link>
            </div>
          ) : visibleGroups.length ? (
            visibleGroups.map(group => (
              <section
                key={group.key}
                id={`menu-${group.key}`}
                className="menu-section"
                aria-labelledby={`menu-heading-${group.key}`}
                ref={el => {
                  if (el) sectionRefs.current[group.key] = el;
                  else delete sectionRefs.current[group.key];
                }}
              >
                <SectionDivider headingId={`menu-heading-${group.key}`} label={group.label} emoji={group.emoji} description={group.description} count={group.drinks.length} />
                <div className="menu-drinks-list">
                  {group.drinks.map((drink, index) => <DrinkItem key={drink.id} drink={drink} index={index} />)}
                </div>
              </section>
            ))
          ) : (
            <div className="menu-empty-state">
              <span aria-hidden="true">🔎</span>
              <h3>Nenhum drink encontrado</h3>
              <p>Tente outro nome ou ingrediente, ou limpe os filtros.</p>
              <button type="button" className="menu-empty-cta" onClick={() => { setSearchTerm(''); setSelectedCategory('todos'); }}>Limpar busca e filtros <FiX aria-hidden="true" /></button>
            </div>
          )}
        </section>

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
