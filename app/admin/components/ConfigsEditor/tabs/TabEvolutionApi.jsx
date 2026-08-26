"use client";
import React from 'react';
import { useConfigs } from '../context/ConfigsContext';

export default function TabEvolutionApi() {
  const { evolutionApi, setEvolutionApi } = useConfigs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--primary)' }}>Credenciais da Evolution API v2</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
          Configure a API do WhatsApp para permitir disparos de orçamentos, contratos, lembretes e follow-up automático pelo painel Kanban.
        </p>

        <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="form-label">URL da Evolution API</label>
            <input 
              type="text" 
              className="form-input" 
              value={evolutionApi.url || ''} 
              onChange={(e) => setEvolutionApi({ ...evolutionApi, url: e.target.value })} 
              placeholder="Ex: https://api.seudominio.com"
            />
          </div>
          <div>
            <label className="form-label">Nome da Instância</label>
            <input 
              type="text" 
              className="form-input" 
              value={evolutionApi.instance || ''} 
              onChange={(e) => setEvolutionApi({ ...evolutionApi, instance: e.target.value })} 
              placeholder="Ex: labdrinks"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Global API Key / Token de Autenticação</label>
          <input 
            type="password" 
            className="form-input" 
            value={evolutionApi.apikey || ''} 
            onChange={(e) => setEvolutionApi({ ...evolutionApi, apikey: e.target.value })} 
            placeholder="Sua chave secreta da API"
          />
        </div>
      </div>
    </div>
  );
}