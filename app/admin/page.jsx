"use client";
import React, { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiUsers, FiSettings, FiPieChart, FiHeart, FiCalendar, FiUserPlus } from 'react-icons/fi';
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
const RetargetAlert = dynamic(() => import('./components/RetargetAlert'), {
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

const navItems = [
  { id: 'leads',     label: 'Leads',     icon: FiUsers },
  { id: 'agenda',    label: 'Agenda',    icon: FiCalendar },
  { id: 'analytics', label: 'Métricas',  icon: FiPieChart },
  { id: 'parceiros', label: 'Parceiros', icon: FiHeart },
  { id: 'equipe',    label: 'Equipe',    icon: FiUserPlus },
  { id: 'configs',   label: 'Configs',   icon: FiSettings },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('leads');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <img src="/logo.webp" alt="Logo" style={{ width: '100px', marginBottom: '8px' }} />
          <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
            Admin Dashboard
          </h2>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px 24px',
                  background: activeTab === item.id ? 'rgba(203, 161, 83, 0.1)' : 'transparent',
                  color: activeTab === item.id ? 'var(--primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRight: activeTab === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left', fontSize: '1rem', transition: 'all 0.2s',
                  minHeight: 48,
                }}
              >
                <Icon size={20} />
                {item.label === 'Leads' ? 'Gestão de Leads' :
                 item.label === 'Métricas' ? 'Métricas (Gráficos)' :
                 item.label === 'Parceiros' ? 'Parceiros' :
                 item.label === 'Equipe' ? 'Equipe / Staff' :
                 item.label === 'Configs' ? 'Pacotes & Drinks' :
                 item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleLogout}
            className="btn btn--outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ff5252', borderColor: '#ff5252' }}
          >
            <FiLogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ───────────────────────────────────── */}
      <header className="admin-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
      <main className="admin-main" style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px', background: '#0a0a0a' }}>
        <RetargetAlert />
        {activeTab === 'leads'     && <LeadsKanban />}
        {activeTab === 'agenda'    && <AgendaEventos />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'parceiros' && <CerimonialstasManager />}
        {activeTab === 'equipe'    && <AjudantesManager />}
        {activeTab === 'configs'   && <ConfigsEditor />}
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
