"use client";
import React, { useState, useEffect, useRef } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiUsers, FiSettings, FiPieChart, FiHeart, FiCalendar, FiUserPlus, FiMenu, FiX, FiFileText, FiPackage } from 'react-icons/fi';
import dynamic from 'next/dynamic';

const LeadsKanban = dynamic(() => import('./components/LeadsKanban'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});
const ConfigsEditor = dynamic(() => import('./components/ConfigsEditor'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});
const AnalyticsDashboard = dynamic(() => import('./components/AnalyticsDashboard'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});

const CerimonialstasManager = dynamic(() => import('./components/CerimonialstasManager'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});
const AgendaEventos = dynamic(() => import('./components/AgendaEventos'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});
const AjudantesManager = dynamic(() => import('./components/AjudantesManager'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});
const GeradorContrato = dynamic(() => import('./components/GeradorContrato'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});
const EstoqueManager = dynamic(() => import('./components/EstoqueManager'), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="btn__spinner" /></div>,
  ssr: false
});

const navItems = [
  { id: 'leads',    label: 'Leads',         icon: FiUsers },
  { id: 'eventos',  label: 'Eventos',       icon: FiCalendar },
  { id: 'metricas', label: 'Métricas',      icon: FiPieChart },
  { id: 'config',   label: 'Configurações', icon: FiSettings },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('leads');
  const [subTab, setSubTab] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const lastTabRef = useRef('leads');

  // Initialize history state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.history.state === null || window.history.state.tab === undefined) {
        window.history.replaceState({ tab: 'leads' }, '');
      } else {
        setActiveTab(window.history.state.tab);
      }
    }
  }, []);

  // Listen to popstate (back/forward browser buttons)
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && typeof e.state.tab === 'string') {
        lastTabRef.current = e.state.tab;
        setActiveTab(e.state.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state when activeTab changes
  useEffect(() => {
    if (activeTab !== lastTabRef.current) {
      window.history.pushState({ tab: activeTab }, '');
      lastTabRef.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'eventos') setSubTab('agenda');
    else if (activeTab === 'metricas') setSubTab('analytics');
    else if (activeTab === 'config') setSubTab('configs');
    else setSubTab('');
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', alignItems: 'center', justifyContent: 'center' }}>
        <div className="btn__spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const activeNavItem = navItems.find(n => n.id === activeTab);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>

      {/* ── MOBILE BACKDROP ─────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="admin-sidebar-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1050,
            animation: 'fadeIn 0.2s ease'
          }}
        />
      )}

      {/* ── DESKTOP/MOBILE SIDEBAR ─────────────────────────────────── */}
      <aside className={`admin-sidebar ${menuOpen ? 'admin-sidebar--open' : ''}`} style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-dark) 100%)', borderRight: '1px solid var(--border-color)', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', width: '260px', flexShrink: 0 }}>
        <div style={{ padding: '32px 24px', textAlign: 'center', borderBottom: '1px solid rgba(203, 161, 83, 0.1)', position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(false)}
            className="admin-sidebar-close-btn"
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'transparent',
              border: 'none',
              color: '#FFF',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32
            }}
            aria-label="Fechar menu"
          >
            <FiX size={20} />
          </button>
          <img src="/logo.webp" alt="Logo" style={{ width: '90px', marginBottom: '12px' }} />
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Cinzel, serif', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Painel Admin
          </h2>
        </div>

        <nav style={{ flex: 1, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMenuOpen(false);
                }}
                style={{
                  width: 'calc(100% - 32px)',
                  margin: '2px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: isActive ? 'rgba(203, 161, 83, 0.08)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 600 : 'normal',
                  transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  minHeight: 48,
                  position: 'relative',
                  outline: 'none'
                }}
                className={isActive ? 'admin-sidebar-active-btn' : ''}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '12px',
                    bottom: '12px',
                    width: '3.5px',
                    borderRadius: '0 4px 4px 0',
                    background: 'var(--primary)',
                    boxShadow: '0 0 10px var(--primary)'
                  }} />
                )}
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                {item.label === 'Leads' ? 'Gestão de Leads' : item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid rgba(203, 161, 83, 0.1)' }}>
          <button
            onClick={handleLogout}
            className="btn btn--outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ff5252', borderColor: 'rgba(255, 82, 82, 0.3)', background: 'rgba(255, 82, 82, 0.02)', borderRadius: '10px' }}
          >
            <FiLogOut size={16} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ───────────────────────────────────── */}
      <header className="admin-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              minWidth: 40,
              minHeight: 40
            }}
            aria-label="Abrir menu"
          >
            <FiMenu size={24} />
          </button>
          <img src="/logo.webp" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>
            {activeNavItem?.label || 'Admin'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', border: '1px solid #ff5252', color: '#ff5252',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem',
            minHeight: 44,
          }}
        >
          <FiLogOut size={14} />
          Sair
        </button>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="admin-main" style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px', background: 'var(--bg-dark)' }}>
        {activeTab === 'leads' && <LeadsKanban />}
        
        {activeTab === 'eventos' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button 
                onClick={() => setSubTab('agenda')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'agenda' ? 'var(--primary)' : 'transparent', color: subTab === 'agenda' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Agenda
              </button>
              <button 
                onClick={() => setSubTab('contratos')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'contratos' ? 'var(--primary)' : 'transparent', color: subTab === 'contratos' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Contratos
              </button>
            </div>
            {subTab === 'agenda' && <AgendaEventos />}
            {subTab === 'contratos' && <GeradorContrato />}
          </>
        )}

        {activeTab === 'metricas' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button 
                onClick={() => setSubTab('analytics')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'analytics' ? 'var(--primary)' : 'transparent', color: subTab === 'analytics' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Gráficos
              </button>
              <button 
                onClick={() => setSubTab('estoque')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'estoque' ? 'var(--primary)' : 'transparent', color: subTab === 'estoque' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Estoque
              </button>
            </div>
            {subTab === 'analytics' && <AnalyticsDashboard />}
            {subTab === 'estoque' && <EstoqueManager />}
          </>
        )}

        {activeTab === 'config' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button 
                onClick={() => setSubTab('configs')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'configs' ? 'var(--primary)' : 'transparent', color: subTab === 'configs' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Pacotes & Drinks
              </button>
              <button 
                onClick={() => setSubTab('parceiros')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'parceiros' ? 'var(--primary)' : 'transparent', color: subTab === 'parceiros' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Parceiros
              </button>
              <button 
                onClick={() => setSubTab('equipe')} 
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === 'equipe' ? 'var(--primary)' : 'transparent', color: subTab === 'equipe' ? '#000' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: '0.2s ease' }}
              >
                Equipe
              </button>
            </div>
            {subTab === 'configs' && <ConfigsEditor />}
            {subTab === 'parceiros' && <CerimonialstasManager />}
            {subTab === 'equipe' && <AjudantesManager />}
          </>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────── */}
      <nav className="admin-bottom-nav" aria-label="Navegação principal">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`admin-bottom-nav-item ${isActive ? 'admin-bottom-nav-item--active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
