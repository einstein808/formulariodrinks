"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiArrowRight } from 'react-icons/fi';

export default function Navbar({ general }) {
  const router = useRouter();
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
            background: rgba(5, 10, 6, 0.95);
            backdrop-filter: blur(14px);
            border-top: 1px solid rgba(203, 161, 83, 0.18);
            border-bottom: none;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
      `}</style>

      <nav className="site-nav">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image
            src={general?.logoUrl || '/logo.webp'}
            alt="Laboratório de Drinks"
            width={36}
            height={36}
            style={{ width: 34, height: 'auto', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
          />
          <span style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.04em',
            lineHeight: 1.2
          }}>
            Laboratório<br />
            <span style={{ color: 'var(--primary)', fontWeight: 400, fontSize: '0.75rem' }}>de Drinks</span>
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/orcamento')}
          className="btn btn--primary"
          style={{
            fontSize: '0.82rem',
            padding: '9px 18px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            boxShadow: '0 2px 12px rgba(203, 161, 83, 0.3)'
          }}
        >
          Calcular orçamento <FiArrowRight size={14} />
        </button>
      </nav>
    </>
  );
}
