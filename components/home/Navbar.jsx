"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

export default function Navbar({ general }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        .site-nav {
          position: fixed;
          left: 0;
          right: 0;
          z-index: 200;
          padding: 0 20px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
        }

        .site-nav__brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .site-nav__brand-name { font-family: var(--font-cinzel), serif; font-size: 0.85rem; font-weight: 700; color: #fff; letter-spacing: 0.04em; line-height: 1.2; }
        .site-nav__actions { display: flex; align-items: center; gap: 10px; }
        .site-nav__link { color: var(--text-secondary); text-decoration: none; font-size: 0.84rem; font-weight: 600; padding: 10px 8px; border-radius: 8px; transition: color 0.2s ease, background 0.2s ease; }
        .site-nav__link:hover { color: var(--primary-light); background: rgba(203, 161, 83, 0.08); }
        .site-nav__cta { flex: 0 0 auto; min-height: 44px; text-decoration: none; }
        .site-nav__mobile-label { display: none; }

        /* Desktop: topo */
        @media (min-width: 768px) {
          .site-nav {
            top: 0;
            bottom: auto;
            background: ${scrolled ? 'rgba(5, 10, 6, 0.92)' : 'transparent'};
            backdrop-filter: ${scrolled ? 'blur(12px)' : 'none'};
            border-bottom: ${scrolled ? '1px solid rgba(203, 161, 83, 0.12)' : 'none'};
            border-top: none;
          }
        }

        /* Mobile: rodapé */
        @media (max-width: 767px) {
          .site-nav {
            bottom: 0;
            top: auto;
            height: calc(60px + env(safe-area-inset-bottom, 0px));
            background: rgba(5, 10, 6, 0.95);
            backdrop-filter: blur(14px);
            border-top: 1px solid rgba(203, 161, 83, 0.18);
            border-bottom: none;
            padding: 0 12px env(safe-area-inset-bottom, 0px);
          }
          .site-nav__brand { gap: 0; }
          .site-nav__brand-name { display: none; }
          .site-nav__actions { flex: 1; justify-content: flex-end; gap: 4px; }
          .site-nav__link { font-size: 0.77rem; padding: 10px 7px; white-space: nowrap; }
          .site-nav__cta { padding: 10px 12px !important; font-size: 0.78rem !important; white-space: nowrap; }
          .site-nav__desktop-label { display: none; }
          .site-nav__mobile-label { display: inline; }
        }

        @media (max-width: 360px) {
          .site-nav { padding-left: 8px; padding-right: 8px; }
          .site-nav__link { font-size: 0.72rem; padding-left: 5px; padding-right: 5px; }
          .site-nav__cta { padding-left: 9px !important; padding-right: 9px !important; }
          .site-nav__actions { gap: 1px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .site-nav, .site-nav__link { transition: none; }
        }
      `}</style>

      <nav className="site-nav" aria-label="Navegação principal">
        {/* Logo */}
        <Link href="/" className="site-nav__brand" aria-label="Laboratório de Drinks, página inicial" style={{ textDecoration: 'none' }}>
          <Image
            src={general?.logoUrl || '/logo.webp'}
            alt="Laboratório de Drinks"
            width={36}
            height={36}
            style={{ width: 34, height: 'auto', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
          />
          <span className="site-nav__brand-name">
            Laboratório<br />
            <span style={{ color: 'var(--primary)', fontWeight: 400, fontSize: '0.75rem' }}>de Drinks</span>
          </span>
        </Link>

        {/* Ações */}
        <div className="site-nav__actions">
          <Link
            href="/menu"
            className="site-nav__link"
          >
            Drinks
          </Link>
          <Link href="#pacotes" className="site-nav__link">Pacotes</Link>

          {/* CTA */}
          <Link href="/orcamento" className="btn btn--primary site-nav__cta">
            <span className="site-nav__desktop-label">Calcular orçamento</span>
            <span className="site-nav__mobile-label">Orçamento</span>
            <FiArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </nav>
    </>
  );
}
