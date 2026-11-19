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
    <div className="admin-settings-page">
      
      {/* ── HEADER ── */}
      <div className="admin-header admin-settings-header">
        <div>
          <h1>
            Configurações do Sistema
          </h1>
          <p>
            Organize as informações por área. Salve cada seção após editar.
          </p>
        </div>

      </div>

      {/* ── GRUPOS PRINCIPAIS (LEVEL 1) ── */}
      <nav className="admin-settings-groups" aria-label="Áreas de configuração">
        {groups.map(group => {
          const isSelected = activeGroup === group.id;
          return (
            <button
              key={group.id}
              onClick={() => handleGroupChange(group.id)}
              className={`admin-settings-group ${isSelected ? 'is-active' : ''}`}
              aria-current={isSelected ? 'page' : undefined}
            >
              {group.label}
            </button>
          );
        })}
      </nav>

      {/* Uma área por vez; os detalhes relacionados ficam agrupados na mesma tela. */}
      <div className="admin-settings-sections" role="region" aria-label={`Seções de ${groups.find(group => group.id === activeGroup)?.label.replace(/^\S+\s/, '') || 'configuração'}`}>
        {tabsByGroup[activeGroup]?.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <details
              key={tab.id}
              className="admin-settings-accordion"
              open={isActive}
              onToggle={event => {
                if (event.currentTarget.open && activeTab !== tab.id) setActiveTab(tab.id);
                if (!event.currentTarget.open && activeTab === tab.id) setActiveTab('');
              }}
            >
              <summary>{tab.label}</summary>
              {isActive && (
                <div className="admin-settings-content">
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
                  <button
                    type="button"
                    className={`btn btn--primary admin-settings-save ${saving ? 'btn--loading' : ''}`}
                    onClick={() => saveSection(tab.id)}
                    disabled={saving}
                  >
                    {saving ? <><span className="btn__spinner" /> Salvando…</> : <><FiSave size={16} /> Salvar {tab.label.replace(/^\S+\s/, '')}</>}
                  </button>
                </div>
              )}
            </details>
          );
        })}
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
