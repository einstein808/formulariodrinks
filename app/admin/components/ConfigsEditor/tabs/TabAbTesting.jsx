"use client";
import React from 'react';
import { useConfigs } from '../context/ConfigsContext';

export default function TabAbTesting() {
  const { abTesting, setAbTesting } = useConfigs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{
        background: abTesting.active ? 'rgba(0, 229, 255, 0.05)' : 'var(--bg-input)',
        border: `1px solid ${abTesting.active ? '#00E5FF' : 'var(--border-color)'}`,
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', color: abTesting.active ? '#00E5FF' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧪 Teste A/B de Preços & Variantes de Proposta
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Distribua novos visitantes 50/50 entre Grupo A (Preço Base) e Grupo B (Preço Variante) para testar elasticidade de preço e conversão.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '10px 18px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <input
              type="checkbox"
              checked={abTesting.active || false}
              onChange={(e) => setAbTesting({ ...abTesting, active: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#00E5FF', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', color: abTesting.active ? '#00E5FF' : 'var(--text-muted)' }}>
              {abTesting.active ? 'TESTE A/B ATIVO 🚀' : 'TESTE A/B INATIVO'}
            </span>
          </label>
        </div>

        {abTesting.active && (
          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.85rem', color: '#00E5FF' }}>
                🏷️ Identificador / Nome da Campanha (ex: aumento_julho_48)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: aumento_julho_48"
                value={abTesting.campaignName || ''}
                onChange={(e) => setAbTesting({ ...abTesting, campaignName: e.target.value.toLowerCase().trim().replace(/\s+/g, '_') })}
                style={{ maxWidth: '400px', borderColor: '#00E5FF' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Tag salva nos leads gerados durante este teste para comparação de métricas no Analytics.
              </span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={abTesting.hideMaoDeObraInB || false}
                onChange={(e) => setAbTesting({ ...abTesting, hideMaoDeObraInB: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#FF9800', cursor: 'pointer' }}
              />
              <span>🚫 Ocultar opção de "Mão de Obra Avulsa" no Grupo B (forçar pacotes completos com insumos inclusos)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}