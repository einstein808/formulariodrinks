"use client";
import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';

export default function TabShopping() {
  const { shoppingConfig, setShoppingConfig } = useConfigs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      
      {/* Margens e Proporções */}
      <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--primary)' }}>Parâmetros Globais de Dimensionamento</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
          Defina as regras automáticas para estimativa de compras e insumos por evento.
        </p>

        <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '8px' }}>
          <div>
            <label className="form-label">Margem de Segurança Global (% Extra)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '120px' }}
                value={shoppingConfig.margemSeguranca || 0} 
                onChange={(e) => setShoppingConfig({ ...shoppingConfig, margemSeguranca: Number(e.target.value) })} 
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>% de folga nos insumos</span>
            </div>
          </div>

          <div>
            <label className="form-label">Proporção de Drinks Sem Álcool (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '120px' }}
                value={shoppingConfig.nonAlcoholicPercentage ?? 15} 
                onChange={(e) => setShoppingConfig({ ...shoppingConfig, nonAlcoholicPercentage: Number(e.target.value) })} 
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>% do volume da festa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Itens Fixos Escaláveis */}
      <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: 'var(--primary)' }}>Itens Fixos & Estrutura de Bar</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Itens que são comprados ou dimensionados por convidado (gelo, guardanapos, copos, canudos, etc.).
            </p>
          </div>
          <button 
            className="btn btn--outline" 
            style={{ width: 'auto', flexShrink: 0 }}
            onClick={() => setShoppingConfig({
              ...shoppingConfig,
              itensFixos: [...(shoppingConfig.itensFixos || []), { id: Date.now().toString(), nome: 'Novo Item', quantidade: 1, unidade: 'un', categoria: 'bar', tipoCalc: 'porConvidado' }]
            })}
          >
            <FiPlus /> Novo Item Fixo
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(shoppingConfig.itensFixos || []).length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '20px' }}>
              Nenhum item fixo cadastrado.
            </div>
          )}

          {(shoppingConfig.itensFixos || []).map((item, idx) => (
            <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 180px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Nome do Item</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={item.nome || ''} 
                  placeholder="Ex: Gelo Filtrado (Saco 5kg)"
                  onChange={(e) => {
                    const novos = [...shoppingConfig.itensFixos];
                    novos[idx].nome = e.target.value;
                    setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                  }} 
                />
              </div>

              <div style={{ width: '130px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Tipo Cálculo</label>
                <select
                  className="form-select"
                  value={item.tipoCalc || 'porConvidado'}
                  onChange={(e) => {
                    const novos = [...shoppingConfig.itensFixos];
                    novos[idx].tipoCalc = e.target.value;
                    setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                  }}
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  <option value="porConvidado">👥 Por Convidado</option>
                  <option value="fixo">📌 Valor Fixo</option>
                </select>
              </div>

              <div style={{ width: '90px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Quantidade</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={item.quantidade || 0} 
                  step="0.001"
                  onChange={(e) => {
                    const novos = [...shoppingConfig.itensFixos];
                    novos[idx].quantidade = Number(e.target.value);
                    setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                  }} 
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ width: '80px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Unidade</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={item.unidade || ''} 
                  placeholder="sacos"
                  onChange={(e) => {
                    const novos = [...shoppingConfig.itensFixos];
                    novos[idx].unidade = e.target.value;
                    setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                  }} 
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ width: '130px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Categoria</label>
                <select
                  className="form-select"
                  value={item.categoria || 'bar'}
                  onChange={(e) => {
                    const novos = [...shoppingConfig.itensFixos];
                    novos[idx].categoria = e.target.value;
                    setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                  }}
                  style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  <option value="bar">🍸 Equipamento Bar</option>
                  <option value="insumo">🍋 Insumo Fresco</option>
                  <option value="decoracao">✨ Decoração</option>
                  <option value="descartavel">🧾 Descartável</option>
                </select>
              </div>

              <button 
                onClick={() => {
                  const novos = [...shoppingConfig.itensFixos];
                  novos.splice(idx, 1);
                  setShoppingConfig({ ...shoppingConfig, itensFixos: novos });
                }} 
                style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}
                title="Excluir Item Fixo"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          💡 <strong>Dica de escala:</strong> Para itens do tipo <strong>Por Convidado</strong>, se você calcula 1 saco de gelo a cada 10 pessoas, a quantidade é <strong>0.1</strong>.
        </div>
      </div>

    </div>
  );
}