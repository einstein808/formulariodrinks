"use client";
import React, { useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { ConfigsProvider, useConfigs } from './context/ConfigsContext';
import TabDrinks from './tabs/TabDrinks';
import TabPacotes from './tabs/TabPacotes';
import TabAbTesting from './tabs/TabAbTesting';
import TabGeral from './tabs/TabGeral';
import TabEvolutionApi from './tabs/TabEvolutionApi';
import TabScripts from './tabs/TabScripts';
import TabGaleria from './tabs/TabGaleria';
import TabShopping from './tabs/TabShopping';
import TabEventos from './tabs/TabEventos';
import TabFinanceiro from './tabs/TabFinanceiro';
import TabAvaliacoes from './tabs/TabAvaliacoes';

function ConfigsEditorContent() {
  const { loading, saving, saveSection } = useConfigs();
  const [activeGroup, setActiveGroup] = useState('cardapio');
  const [activeTab, setActiveTab] = useState('drinks');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="btn__spinner" />
      </div>
    );
  }

  const groups = [
    { id: 'cardapio', label: '🍹 Cardápio & Preços' },
    { id: 'integracoes', label: '💬 Integrações & Scripts' },
    { id: 'conteudo', label: '🎨 Conteúdo & Parâmetros' },
  ];

  const tabsByGroup = {
    cardapio: [
      { id: 'drinks', label: '🍸 Drinks & Receitas' },
      { id: 'pacotes', label: '📦 Pacotes & Tiers' },
      { id: 'abTesting', label: '🧪 Teste A/B' },
    ],
    integracoes: [
      { id: 'scripts', label: '✍️ Scripts WhatsApp' },
      { id: 'evolutionApi', label: '🤖 Evolution API' },
      { id: 'geral', label: '🏢 Dados da Empresa / White-Label' },
    ],
    conteudo: [
      { id: 'galeria', label: '📸 Galeria de Eventos' },
      { id: 'shopping', label: '🛒 Lista de Compras' },
      { id: 'eventos', label: '✨ Tipos de Evento' },
      { id: 'financeiro', label: '💸 Categorias de Custo' },
      { id: 'avaliacoes', label: '⭐ Depoimentos & NPS' },
    ]
  };

  const handleGroupChange = (groupId) => {
    setActiveGroup(groupId);
    const defaultTab = tabsByGroup[groupId]?.[0]?.id || 'drinks';
    setActiveTab(defaultTab);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* ── HEADER ── */}
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 6px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)' }}>
            Configurações do Sistema
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Gerencie o cardápio, regras comerciais, integrações e identidade da sua empresa.
          </p>
        </div>

        <button 
          className={`btn btn--primary ${saving ? 'btn--loading' : ''}`} 
          onClick={() => saveSection(activeTab)} 
          disabled={saving}
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 'bold' }}
        >
          {saving ? (
            <div className="btn__spinner" />
          ) : (
            <>
              <FiSave size={16} /> Salvar Alterações
            </>
          )}
        </button>
      </div>

      {/* ── GRUPOS PRINCIPAIS (LEVEL 1) ── */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', scrollbarWidth: 'none' }}>
        {groups.map(group => {
          const isSelected = activeGroup === group.id;
          return (
            <button
              key={group.id}
              onClick={() => handleGroupChange(group.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                color: isSelected ? '#000' : 'var(--text-secondary)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                fontWeight: isSelected ? 'bold' : '500',
                cursor: 'pointer',
                fontSize: '0.86rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* ── SUB-ABAS DO GRUPO ATIVO (LEVEL 2) ── */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px', marginBottom: '24px', scrollbarWidth: 'none' }}>
        {tabsByGroup[activeGroup]?.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                background: isActive ? 'rgba(203,161,83,0.18)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── CONTEÚDO DA ABA (LAZY LOADED) ── */}
      <div style={{ minHeight: '400px' }}>
        {activeTab === 'drinks' && <TabDrinks />}
        {activeTab === 'pacotes' && <TabPacotes />}
        {activeTab === 'abTesting' && <TabAbTesting />}
        {activeTab === 'scripts' && <TabScripts />}
        {activeTab === 'evolutionApi' && <TabEvolutionApi />}
        {activeTab === 'geral' && <TabGeral />}
        {activeTab === 'galeria' && <TabGaleria />}
        {activeTab === 'shopping' && <TabShopping />}
        {activeTab === 'eventos' && <TabEventos />}
        {activeTab === 'financeiro' && <TabFinanceiro />}
        {activeTab === 'avaliacoes' && <TabAvaliacoes />}
      </div>

    </div>
  );
}

export default function ConfigsEditor() {
  return (
    <ConfigsProvider>
      <ConfigsEditorContent />
    </ConfigsProvider>
  );
}