"use client";
import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';
import MinioImageUpload from '@/app/admin/components/MinioImageUpload';

export default function TabEventos() {
  const { tiposEvento, setTiposEvento } = useConfigs();

  const addTipoEvento = () => {
    const newId = `evento-${Date.now()}`;
    setTiposEvento([...tiposEvento, { id: newId, label: 'Novo Tipo de Evento', icon: '✨', image: '', desc: '' }]);
  };

  const updateTipoEvento = (id, field, value) => {
    setTiposEvento(tiposEvento.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTipoEvento = (id) => {
    if (window.confirm('Remover este tipo de evento?')) {
      setTiposEvento(tiposEvento.filter(t => t.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Cadastre os tipos de celebrações disponíveis no formulário de orçamento e páginas de landing.
        </p>
        <button className="btn btn--outline" onClick={addTipoEvento} style={{ width: 'auto', flexShrink: 0 }}>
          <FiPlus /> Novo Tipo de Evento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {tiposEvento.map((tipo) => (
          <div key={tipo.id} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>{tipo.icon || '✨'}</span>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{tipo.label || 'Sem Nome'}</h3>
              </div>
              <button onClick={() => removeTipoEvento(tipo.id)} style={{ background: 'none', color: '#F44336', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <FiTrash2 /> Excluir
              </button>
            </div>

            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">ID / Slug da Rota (ex: casamento)</label>
                <input type="text" className="form-input" value={tipo.id} onChange={(e) => updateTipoEvento(tipo.id, 'id', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nome de Exibição</label>
                <input type="text" className="form-input" value={tipo.label || ''} onChange={(e) => updateTipoEvento(tipo.id, 'label', e.target.value)} />
              </div>
            </div>

            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Ícone/Emoji</label>
                <input type="text" className="form-input" value={tipo.icon || ''} onChange={(e) => updateTipoEvento(tipo.id, 'icon', e.target.value)} style={{ textAlign: 'center' }} />
              </div>
              <div>
                <label className="form-label">Imagem de Capa (MinIO)</label>
                <MinioImageUpload value={tipo.image} onChange={(url) => updateTipoEvento(tipo.id, 'image', url)} placeholder="Upload da imagem de capa" />
              </div>
            </div>

            <div>
              <label className="form-label">Descrição da Experiência</label>
              <textarea 
                className="form-input" 
                value={tipo.desc || ''} 
                onChange={(e) => updateTipoEvento(tipo.id, 'desc', e.target.value)} 
                style={{ minHeight: '80px', resize: 'vertical' }}
                placeholder="Descreva o bar ideal para este tipo de comemoração..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}