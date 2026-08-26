import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function MediaPreviewModal({
  previewUrl,
  onClose,
  showToast
}) {
  const [previewMode, setPreviewMode] = useState('desktop');

  if (!previewUrl) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-main)',
          width: previewMode === 'mobile' ? '390px' : '95vw',
          height: previewMode === 'mobile' ? '800px' : '90vh',
          maxHeight: '90vh',
          borderRadius: '16px', 
          overflow: 'hidden', 
          border: '1px solid rgba(203, 161, 83, 0.2)',
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* PREVIEW HEADER */}
        <div style={{ 
          padding: '12px 18px', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'var(--bg-input)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {previewUrl.includes('barman=true') ? '📋 Preview: Checklist do Barman' : (previewUrl.includes('/contrato/') ? '📄 Preview: Contrato do Cliente' : '🍹 Preview: Formulário do Cliente')}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
              Ao Vivo (Firebase Link)
            </span>
          </div>

          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setPreviewMode('mobile')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                border: 'none',
                background: previewMode === 'mobile' ? 'var(--primary)' : 'transparent',
                color: previewMode === 'mobile' ? '#000' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.1s ease'
              }}
            >
              📱 Mobile
            </button>
            <button 
              onClick={() => setPreviewMode('desktop')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                border: 'none',
                background: previewMode === 'desktop' ? 'var(--primary)' : 'transparent',
                color: previewMode === 'desktop' ? '#000' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.1s ease'
              }}
            >
              💻 Desktop
            </button>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(previewUrl);
                if (showToast) showToast('Link copiado para a área de transferência!', 'success');
              }}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                cursor: 'pointer',
                height: 'auto',
                minHeight: 'auto'
              }}
            >
              Copiar Link
            </button>
            <button 
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s'
              }}
              aria-label="Fechar"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* PREVIEW FRAME */}
        <div style={{ flex: 1, background: '#000', position: 'relative' }}>
          <iframe
            src={previewUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'var(--bg-main)'
            }}
            title="Live Link Preview"
          />
        </div>
      </div>
    </div>
  );
}
