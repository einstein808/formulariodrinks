"use client";
import React, { useState, useEffect, useRef } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiUsers, FiSettings, FiPieChart, FiCalendar, FiSend } from 'react-icons/fi';
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
const CampanhasManager = dynamic(() => import('./components/CampanhasManager'), {
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
  { id: 'leads',      label: 'Leads',         icon: FiUsers },
  { id: 'eventos',    label: 'Eventos',       icon: FiCalendar },
  { id: 'campanhas',  label: 'Campanhas',     icon: FiSend },
  { id: 'metricas',   label: 'Métricas',      icon: FiPieChart },
  { id: 'config',     label: 'Configurações', icon: FiSettings },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('leads');
  const [subTab, setSubTab] = useState('');
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
    <div className="admin-layout">

      {/* ── DESKTOP/MOBILE SIDEBAR ─────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src="/logo.webp" alt="Laboratório de Drinks" />
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'Cinzel, serif', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Painel Admin
          </h2>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Navegação do painel">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`admin-sidebar-item ${isActive ? 'admin-sidebar-active-btn' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="admin-sidebar-indicator" aria-hidden="true" />
                )}
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                {item.label === 'Leads' ? 'Gestão de Leads' : item.label}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
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
          <img src="/logo.webp" alt="" aria-hidden="true" />
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
      <main className="admin-main">
        {activeTab === 'leads' && <LeadsKanban />}
        
        {activeTab === 'eventos' && (
          <>
            <div className="admin-subnav" role="group" aria-label="Seções de eventos">
              <button className={`admin-subnav-item ${subTab === 'agenda' ? 'is-active' : ''}`} aria-pressed={subTab === 'agenda'} onClick={() => setSubTab('agenda')}>
                📅 Agenda
              </button>
              <button className={`admin-subnav-item ${subTab === 'contratos' ? 'is-active' : ''}`} aria-pressed={subTab === 'contratos'} onClick={() => setSubTab('contratos')}>
                ✍️ Contratos
              </button>
            </div>
            {subTab === 'agenda' && <AgendaEventos />}
            {subTab === 'contratos' && <GeradorContrato />}
          </>
        )}

        {activeTab === 'campanhas' && <CampanhasManager />}

        {activeTab === 'metricas' && (
          <>
            <div className="admin-subnav" role="group" aria-label="Seções de métricas">
              <button className={`admin-subnav-item ${subTab === 'analytics' ? 'is-active' : ''}`} aria-pressed={subTab === 'analytics'} onClick={() => setSubTab('analytics')}>
                📊 Gráficos & KPIs
              </button>
              <button className={`admin-subnav-item ${subTab === 'estoque' ? 'is-active' : ''}`} aria-pressed={subTab === 'estoque'} onClick={() => setSubTab('estoque')}>
                📦 Estoque
              </button>
            </div>
            {subTab === 'analytics' && <AnalyticsDashboard />}
            {subTab === 'estoque' && <EstoqueManager />}
          </>
        )}

        {activeTab === 'config' && (
          <>
            <div className="admin-subnav" role="group" aria-label="Seções de configurações">
              <button className={`admin-subnav-item ${subTab === 'configs' ? 'is-active' : ''}`} aria-pressed={subTab === 'configs'} onClick={() => setSubTab('configs')}>
                🍹 Pacotes, Preços & Sistema
              </button>
              <button className={`admin-subnav-item ${subTab === 'parceiros' ? 'is-active' : ''}`} aria-pressed={subTab === 'parceiros'} onClick={() => setSubTab('parceiros')}>
                🤝 Parceiros
              </button>
              <button className={`admin-subnav-item ${subTab === 'campanhas' ? 'is-active' : ''}`} aria-pressed={subTab === 'campanhas'} onClick={() => setSubTab('campanhas')}>
                📣 Campanhas WhatsApp
              </button>
              <button className={`admin-subnav-item ${subTab === 'equipe' ? 'is-active' : ''}`} aria-pressed={subTab === 'equipe'} onClick={() => setSubTab('equipe')}>
                👥 Equipe / Ajudantes
              </button>
            </div>
            {subTab === 'configs' && <ConfigsEditor />}
            {subTab === 'parceiros' && <CerimonialstasManager />}
            {subTab === 'campanhas' && <CampanhasManager />}
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
