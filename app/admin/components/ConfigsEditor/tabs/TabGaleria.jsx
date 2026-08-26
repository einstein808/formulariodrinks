"use client";
import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';
import MinioImageUpload from '@/app/admin/components/MinioImageUpload';

export default function TabGaleria() {
  const { galeria, setGaleria } = useConfigs();

  const addEvento = () => {
    const newId = `evento-${Date.now()}`;
    setGaleria([...galeria, { id: newId, titulo: 'Novo Evento', data: '', cidade: '', capa: '', midias: [] }]);
  };

  const updateEvento = (id, field, value) => {
    setGaleria(galeria.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeEvento = (id) => {
    if (window.confirm('Remover este evento da galeria?')) {
      setGaleria(galeria.filter(e => e.id !== id));
    }
  };

  const addMidia = (eventoId) => {
    setGaleria(galeria.map(e => {
      if (e.id !== eventoId) return e;
      return { ...e, midias: [...(e.midias || []), { url: '', tipo: 'imagem' }] };
    }));
  };

  const updateMidia = (eventoId, index, field, value) => {
    setGaleria(galeria.map(e => {
      if (e.id !== eventoId) return e;
      const newMidias = [...e.midias];
      newMidias[index] = { ...newMidias[index], [field]: value };
      return { ...e, midias: newMidias };
    }));
  };

  const removeMidia = (eventoId, index) => {
    setGaleria(galeria.map(e => {
      if (e.id !== eventoId) return e;
      const newMidias = [...e.midias];
      newMidias.splice(index, 1);
      return { ...e, midias: newMidias };
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Cadastre os eventos realizados para exibir fotos, vídeos e depoimentos visuais na página pública de Galeria.
        </p>
        <button className="btn btn--outline" onClick={addEvento} style={{ width: 'auto', flexShrink: 0 }}>
          <FiPlus /> Novo Evento
        </button>
      </div>

      {galeria.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
          Nenhum evento cadastrado ainda. Clique em "Novo Evento" para começar.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {galeria.map((evento) => (
          <div key={evento.id} style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            
            {/* Header do Evento */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>
                🎉 {evento.titulo || 'Evento sem título'}
              </h3>
              <button onClick={() => removeEvento(evento.id)} style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <FiTrash2 size={14} /> Excluir Evento
              </button>
            </div>

            {/* Dados do Evento */}
            <div className="admin-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Título do Evento</label>
                <input type="text" className="form-input" value={evento.titulo || ''} onChange={(e) => updateEvento(evento.id, 'titulo', e.target.value)} placeholder="Ex: Casamento Marina & Lucas" />
              </div>
              <div>
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={evento.data || ''} onChange={(e) => updateEvento(evento.id, 'data', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Cidade</label>
                <input type="text" className="form-input" value={evento.cidade || ''} onChange={(e) => updateEvento(evento.id, 'cidade', e.target.value)} placeholder="Ex: Juiz de Fora" />
              </div>
            </div>

            {/* Foto de Capa */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Foto de Capa Principal</label>
              <MinioImageUpload value={evento.capa} onChange={(url) => updateEvento(evento.id, 'capa', url)} placeholder="Upload da imagem de capa" />
            </div>

            {/* Mídias do Carrossel */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="form-label" style={{ margin: 0 }}>Mídias do Álbum ({(evento.midias || []).length} fotos/vídeos)</label>
                <button onClick={() => addMidia(evento.id)} style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiPlus size={13} /> Adicionar Mídia
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(evento.midias || []).map((midia, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <select
                      className="form-select"
                      value={midia.tipo || 'imagem'}
                      onChange={(e) => updateMidia(evento.id, idx, 'tipo', e.target.value)}
                      style={{ width: '120px', flexShrink: 0 }}
                    >
                      <option value="imagem">🖼️ Imagem</option>
                      <option value="video">🎬 Vídeo</option>
                    </select>
                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <MinioImageUpload 
                        value={midia.url} 
                        onChange={(url) => updateMidia(evento.id, idx, 'url', url)} 
                        placeholder={midia.tipo === 'video' ? "https://link-do-video.mp4" : "https://link-da-imagem.jpg"} 
                        accept={midia.tipo === 'video' ? "video/*" : "image/*"}
                      />
                      {(!midia.tipo || midia.tipo === 'imagem') && (
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Descrição da foto (Alt text SEO)..." 
                          value={midia.alt || ''} 
                          onChange={(e) => updateMidia(evento.id, idx, 'alt', e.target.value)} 
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        />
                      )}
                    </div>
                    <button onClick={() => removeMidia(evento.id, idx)} style={{ background: 'none', color: '#F44336', border: 'none', cursor: 'pointer', padding: '6px' }}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}