"use client";
import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';

export default function TabFinanceiro() {
  const { custosCategorias, setCustosCategorias } = useConfigs();

  const addCustoCategoria = () => {
    const newId = `cat-${Date.now()}`;
    setCustosCategorias([...custosCategorias, { id: newId, label: 'Nova Categoria', color: '#ffd54f', emoji: '✨', order: custosCategorias.length }]);
  };

  const updateCustoCategoria = (id, field, value) => {
    setCustosCategorias(custosCategorias.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCustoCategoria = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Os custos associados a ela serão agrupados como Outros no Analytics.')) {
      setCustosCategorias(custosCategorias.filter(c => c.id !== id));
    }
  };

  const moveCustoCategoria = (index, direction) => {
    const list = [...custosCategorias];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < list.length) {
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      setCustosCategorias(list);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
          Gerencie as categorias de custos dos eventos. Estas categorias aparecem nos lançamentos financeiros dos leads e no Analytics de Lucro Real.
        </p>
        <button className="btn btn--outline" onClick={addCustoCategoria} style={{ width: 'auto', flexShrink: 0 }}>
          <FiPlus /> Nova Categoria
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {custosCategorias.map((cat, index) => (
          <div key={cat.id} className="admin-config-row" style={{ display: 'flex', gap: '14px', alignItems: 'center', background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <div style={{ width: '60px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Emoji</label>
              <input type="text" className="form-input" value={cat.emoji || ''} onChange={(e) => updateCustoCategoria(cat.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
            </div>

            <div style={{ flex: 2, minWidth: '160px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Nome da Categoria</label>
              <input type="text" className="form-input" value={cat.label || ''} onChange={(e) => updateCustoCategoria(cat.id, 'label', e.target.value)} placeholder="Ex: Mão de Obra, Insumos..." />
            </div>

            <div style={{ width: '130px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Cor</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input type="color" className="form-input" value={cat.color || '#ffffff'} onChange={(e) => updateCustoCategoria(cat.id, 'color', e.target.value)} style={{ width: '38px', padding: '0', height: '36px', cursor: 'pointer' }} />
                <input type="text" className="form-input" value={cat.color || ''} onChange={(e) => updateCustoCategoria(cat.id, 'color', e.target.value)} style={{ fontSize: '0.8rem', flex: 1 }} />
              </div>
            </div>

            <div style={{ width: '130px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>ID</label>
              <input type="text" className="form-input" value={cat.id} disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
              <button
                className="btn btn--outline"
                onClick={() => moveCustoCategoria(index, 'up')}
                disabled={index === 0}
                style={{ padding: '6px 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Mover para Cima"
              >
                ↑
              </button>
              <button
                className="btn btn--outline"
                onClick={() => moveCustoCategoria(index, 'down')}
                disabled={index === custosCategorias.length - 1}
                style={{ padding: '6px 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Mover para Baixo"
              >
                ↓
              </button>
              <button
                className="btn btn--danger"
                onClick={() => removeCustoCategoria(cat.id)}
                style={{ padding: '6px 10px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', background: '#F44336', border: 'none' }}
                title="Excluir Categoria"
              >
                <FiTrash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}