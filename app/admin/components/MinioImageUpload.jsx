import React, { useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';

export default function MinioImageUpload({ value, onChange, placeholder = 'https://link-da-imagem.jpg' }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Apenas imagens
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao subir imagem.');

      const data = await response.json();
      if (data.url) {
        onChange(data.url);
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao fazer o upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {value && (
          <div 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '6px', 
              border: '1px solid rgba(203, 161, 83, 0.25)', 
              overflow: 'hidden', 
              background: '#000', 
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src={value} 
              alt="Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        <label 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            fontSize: '0.8rem', 
            padding: '10px 16px',
            background: 'rgba(203, 161, 83, 0.08)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            borderRadius: '6px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
            flexShrink: 0
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(203, 161, 83, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(203, 161, 83, 0.08)'; }}
        >
          <FiUploadCloud size={16} />
          {uploading ? 'Enviando imagem... ⏳' : 'Selecionar Foto'}
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            disabled={uploading}
            style={{ display: 'none' }} 
          />
        </label>
      </div>
      <input 
        type="text" 
        className="form-input" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    </div>
  );
}
