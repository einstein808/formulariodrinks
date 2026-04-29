import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiUsers, FiSettings, FiMenu, FiX, FiPieChart, FiHeart } from 'react-icons/fi';
import LeadsKanban from './components/LeadsKanban';
import ConfigsEditor from './components/ConfigsEditor';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import RetargetAlert from './components/RetargetAlert';
import CerimonialstasManager from './components/CerimonialstasManager';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('leads');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const navItems = [
    { id: 'leads', label: 'Gestão de Leads', icon: <FiUsers size={20} /> },
    { id: 'analytics', label: 'Métricas (Gráficos)', icon: <FiPieChart size={20} /> },
    { id: 'parceiros', label: 'Parceiros', icon: <FiHeart size={20} /> },
    { id: 'configs', label: 'Pacotes & Drinks', icon: <FiSettings size={20} /> }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Sidebar Mobile Toggle */}
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ 
          position: 'fixed', top: 16, right: 16, zIndex: 100, 
          background: 'var(--primary)', color: '#000', border: 'none', 
          borderRadius: '50%', width: 44, height: 44, display: 'flex', 
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
        className="md-hidden"
      >
        {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        background: '#111', 
        borderRight: '1px solid var(--border-color)',
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        zIndex: 90,
        height: '100vh'
      }}
      className={menuOpen ? '' : 'sidebar-hidden'}
      >
        {/* Custom CSS class added in index.css to handle media query for sidebar */}
        <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100px', marginBottom: '8px' }} />
          <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>Admin Dashboard</h2>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMenuOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '16px 24px', background: activeTab === item.id ? 'rgba(203, 161, 83, 0.1)' : 'transparent',
                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none', borderRight: activeTab === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontSize: '1rem', transition: 'all 0.2s'
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
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

      {/* Main Content */}
      <main className="admin-main" style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px', background: '#0a0a0a' }}>
        <style>
          {`
            @media (min-width: 768px) {
              .sidebar-hidden { transform: translateX(0) !important; position: relative !important; }
              .md-hidden { display: none !important; }
            }
          `}
        </style>
        
        {/* Fake Cron Alert */}
        <RetargetAlert />

        {activeTab === 'leads' && <LeadsKanban />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'parceiros' && <CerimonialstasManager />}
        {activeTab === 'configs' && <ConfigsEditor />}
      </main>
    </div>
  );
}
