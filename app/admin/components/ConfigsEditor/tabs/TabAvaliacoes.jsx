"use client";
import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';
import MinioImageUpload from '@/app/admin/components/MinioImageUpload';

export default function TabAvaliacoes() {
  const { avaliacoes, setAvaliacoes } = useConfigs();

  const addReview = () => {
    const newId = `review-${Date.now()}`;
    setAvaliacoes([...avaliacoes, { 
      id: newId, 
      nome: 'Novo Cliente', 
      sobrenome: '', 
      feedback: 'Equipe e drinks impecáveis!', 
      stars: 5, 
      printUrl: '', 
      destacado: false, 
      data: Date.now() 
    }]);
  };

  const updateReview = (id, field, value) => {
    setAvaliacoes(avaliacoes.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteReview = (id) => {
    if (window.confirm('Deseja realmente excluir este depoimento?')) {
      setAvaliacoes(avaliacoes.filter(r => r.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
          Cadastre as avaliações de clientes e prints de feedbacks do Google Reviews para gerar autoridade imediata no site.
        </p>
        <button className="btn btn--outline" onClick={addReview} style={{ width: 'auto', flexShrink: 0 }}>
          <FiPlus /> Novo Depoimento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {avaliacoes.map((rev) => (
          <div key={rev.id} className="admin-config-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-input)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Nome do Cliente</label>
                <input type="text" className="form-input" value={rev.nome || ''} onChange={(e) => updateReview(rev.id, 'nome', e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Sobrenome (Opcional)</label>
                <input type="text" className="form-input" value={rev.sobrenome || ''} onChange={(e) => updateReview(rev.id, 'sobrenome', e.target.value)} />
              </div>
              <div style={{ width: '130px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Avaliação</label>
                <select className="form-select" value={rev.stars || 5} onChange={(e) => updateReview(rev.id, 'stars', Number(e.target.value))} style={{ padding: '6px 10px', fontSize: '0.82rem' }}>
                  <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  <option value={4}>⭐⭐⭐⭐ (4)</option>
                  <option value={3}>⭐⭐⭐ (3)</option>
                  <option value={2}>⭐⭐ (2)</option>
                  <option value={1}>⭐ (1)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                <input type="checkbox" id={`destacado-${rev.id}`} checked={rev.destacado || false} onChange={(e) => updateReview(rev.id, 'destacado', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                <label htmlFor={`destacado-${rev.id}`} className="form-label" style={{ margin: 0, fontSize: '0.85rem', cursor: 'pointer' }}>Destaque</label>
              </div>
              <div style={{ marginTop: '20px' }}>
                <button className="btn btn--danger" onClick={() => deleteReview(rev.id)} style={{ padding: '6px 12px', height: '36px', display: 'flex', alignItems: 'center', color: '#FFF', background: '#F44336', border: 'none', borderRadius: '6px' }}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Texto do Depoimento</label>
                <textarea className="form-input" value={rev.feedback || ''} onChange={(e) => updateReview(rev.id, 'feedback', e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} placeholder="O que o cliente disse sobre a experiência..." />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Print da Mensagem / Google Reviews (Upload Minio)</label>
                <MinioImageUpload value={rev.printUrl} onChange={(url) => updateReview(rev.id, 'printUrl', url)} placeholder="Upload do print da avaliação" />
              </div>
            </div>

          </div>
        ))}

        {avaliacoes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            Nenhum depoimento cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}