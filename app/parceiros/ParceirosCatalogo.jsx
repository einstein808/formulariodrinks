"use client";
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../lib/firebase';
import { FiPhone, FiExternalLink, FiSearch } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Link from 'next/link';

export default function ParceirosCatalogo() {
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedCat, setSelectedCat] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubParceiros = onValue(ref(db, 'config/cerimonialistas'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data)
          .map(([slug, item]) => ({ slug, ...item }))
          .filter(p => p.ativo !== false && p.exibirNaVitrine !== false);
        list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        setParceiros(list);
      } else {
        setParceiros([]);
      }
      setLoading(false);
    });

    const unsubCategorias = onValue(ref(db, 'config/categorias-parceiros'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([slug, item]) => ({ slug, ...item }));
        list.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
        setCategorias(list);
      } else {
        setCategorias([
          { slug: 'cerimonialista', nome: 'Cerimonialista', cor: '#cba153' },
          { slug: 'cantor', nome: 'Cantor', cor: '#4cbb7b' },
          { slug: 'pagodeiro', nome: 'Pagodeiro', cor: '#e67e22' },
          { slug: 'decoracao', nome: 'Decoração', cor: '#e84393' },
        ]);
      }
    });

    return () => {
      unsubParceiros();
      unsubCategorias();
    };
  }, []);

  const getCatObj = (catSlug) => {
    return categorias.find(c => c.slug === catSlug) || { nome: catSlug, cor: '#cba153' };
  };

  const filteredParceiros = parceiros.filter(p => {
    const pCats = Array.isArray(p.categorias) ? p.categorias : (p.categoria ? [p.categoria] : ['cerimonialista']);
    const matchesCat = selectedCat === 'todos' || pCats.includes(selectedCat);
    const matchesSearch = !searchTerm.trim() || 
      (p.nome && p.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      pCats.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(180deg, rgba(12, 22, 16, 0.98) 0%, rgba(5, 10, 6, 0.9) 100%)',
        borderBottom: '1px solid var(--border-color)',
        padding: '40px 20px 32px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
            <img src="/logo.webp" alt="Laboratório de Drinks" style={{ width: '85px', height: 'auto' }} />
          </Link>
          <h1 style={{
            fontFamily: 'Cinzel, serif',
            color: 'var(--primary)',
            fontSize: 'clamp(1.6rem, 4vw, 2.3rem)',
            margin: '0 0 10px 0',
            letterSpacing: '1px'
          }}>
            Guia de Parceiros Recomendados
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'clamp(0.9rem, 2vw, 1.05rem)',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Profissionais e fornecedores de excelência em Juiz de Fora e região que confiamos para tornar seu evento inesquecível.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 0' }}>
        {/* Barra de Busca e Filtros */}
        <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Busca */}
          <div style={{
            position: 'relative',
            maxWidth: '480px',
            width: '100%',
            margin: '0 auto'
          }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Categorias Chips */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setSelectedCat('todos')}
              style={{
                padding: '8px 18px',
                borderRadius: '24px',
                border: selectedCat === 'todos' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                background: selectedCat === 'todos' ? 'var(--primary)' : 'var(--bg-card)',
                color: selectedCat === 'todos' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✨ Todos ({parceiros.length})
            </button>

            {categorias.map(cat => {
              const isSelected = selectedCat === cat.slug;
              const count = parceiros.filter(p => {
                const cats = Array.isArray(p.categorias) ? p.categorias : (p.categoria ? [p.categoria] : ['cerimonialista']);
                return cats.includes(cat.slug);
              }).length;

              return (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCat(cat.slug)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '24px',
                    border: isSelected ? `1px solid ${cat.cor || 'var(--primary)'}` : '1px solid var(--border-color)',
                    background: isSelected ? (cat.cor || 'var(--primary)') : 'var(--bg-card)',
                    color: isSelected ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat.nome} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="btn__spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
          </div>
        ) : filteredParceiros.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.1rem' }}>Nenhum parceiro encontrado</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Tente selecionar outra categoria ou limpar sua busca.
            </p>
          </div>
        ) : (
          /* Grid de Parceiros */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {filteredParceiros.map(parceiro => {
              const pCats = Array.isArray(parceiro.categorias) 
                ? parceiro.categorias 
                : (parceiro.categoria ? [parceiro.categoria] : ['cerimonialista']);
              
              const cleanPhone = (parceiro.whatsapp || '').replace(/\D/g, '');
              const formattedPhone = cleanPhone.length === 11 
                ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}` 
                : cleanPhone;

              const wppUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${parceiro.nome}! Vi sua indicação no site do Laboratório de Drinks e gostaria de solicitar um orçamento.`)}`;

              return (
                <div
                  key={parceiro.slug || parceiro.nome}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(203, 161, 83, 0.4)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  {/* Foto / Avatar */}
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    border: '2px solid var(--primary)',
                    background: 'rgba(203, 161, 83, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    flexShrink: 0
                  }}>
                    {parceiro.foto ? (
                      <img
                        src={parceiro.foto}
                        alt={parceiro.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        fontFamily: 'Cinzel, serif'
                      }}>
                        {(parceiro.nome || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Nome */}
                  <h3 style={{
                    margin: '0 0 10px 0',
                    fontSize: '1.2rem',
                    color: 'var(--text-primary)',
                    fontWeight: 700
                  }}>
                    {parceiro.nome}
                  </h3>

                  {/* Badges de Categorias */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    {pCats.map(cSlug => {
                      const cObj = getCatObj(cSlug);
                      return (
                        <span
                          key={cSlug}
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            background: `${cObj.cor || '#cba153'}15`,
                            color: cObj.cor || 'var(--primary)',
                            border: `1px solid ${cObj.cor || 'var(--primary)'}40`
                          }}
                        >
                          {cObj.nome}
                        </span>
                      );
                    })}
                  </div>

                  {/* Botão de Contato WhatsApp */}
                  {cleanPhone && (
                    <a
                      href={wppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginTop: 'auto',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#25D366',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#25D366';
                        e.currentTarget.style.color = '#000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.12)';
                        e.currentTarget.style.color = '#25D366';
                      }}
                    >
                      <FaWhatsapp size={18} />
                      Falar no WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer link to home */}
      <footer style={{ textAlign: 'center', marginTop: '60px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            padding: '8px 18px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}
        >
          ← Voltar para a página principal
        </Link>
      </footer>
    </div>
  );
}
