"use client";
import React, { useState } from 'react';
import { FiTag, FiPlus, FiX } from 'react-icons/fi';

export default function CategoriasManagerSection({
  categorias,
  onAddCategoria,
  onDeleteCategoria
}) {
  const [showAddCat, setShowAddCat] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatCor, setNovaCatCor] = useState('#cba153');

  const handleAdd = () => {
    if (!novaCatNome.trim()) return;
    onAddCategoria(novaCatNome.trim(), novaCatCor);
    setNovaCatNome('');
    setShowAddCat(false);
  };

  return (
    <div style={{
      background: 'var(--bg-input)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border-color)',
      marginBottom: '28px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiTag style={{ color: 'var(--primary)' }} /> Categorias Disponíveis
        </h3>
        <button
          type="button"
          onClick={() => setShowAddCat(!showAddCat)}
          className="btn btn--outline"
          style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto', minHeight: '34px' }}
        >
          {showAddCat ? <><FiX size={14} /> Fechar</> : <><FiPlus size={14} /> Nova Categoria</>}
        </button>
      </div>

      {/* Modal/Form Add Categoria */}
      {showAddCat && (
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          background: 'var(--bg-card)',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder="Nome da Categoria (Ex: Iluminação, DJ...)"
            className="form-input"
            value={novaCatNome}
            onChange={(e) => setNovaCatNome(e.target.value)}
            style={{ flex: 1, minWidth: '180px', height: '38px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cor:</label>
            <input
              type="color"
              value={novaCatCor}
              onChange={(e) => setNovaCatCor(e.target.value)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                cursor: 'pointer'
              }}
            />
          </div>
          <button
            onClick={handleAdd}
            className="btn btn--primary"
            style={{ height: '38px', padding: '0 16px', fontSize: '0.85rem' }}
          >
            Adicionar
          </button>
        </div>
      )}

      {/* Badges de Categorias Existentes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {categorias.map(cat => (
          <div
            key={cat.slug}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: `${cat.cor || '#cba153'}15`,
              border: `1px solid ${cat.cor || '#cba153'}40`,
              color: cat.cor || 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <span>{cat.nome}</span>
            <button
              type="button"
              onClick={() => onDeleteCategoria(cat.slug, cat.nome)}
              style={{
                background: 'none',
                border: 'none',
                color: cat.cor || 'var(--primary)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.7
              }}
              title="Excluir Categoria"
            >
              <FiX size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
