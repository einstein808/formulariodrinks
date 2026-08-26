import React from 'react';

export default function ConfirmModal({ confirmModal }) {
  if (!confirmModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 10, 6, 0.65)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9998,
      padding: '20px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(203, 161, 83, 0.15)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontFamily: 'Cinzel, serif', color: 'var(--primary)', fontSize: '1.15rem' }}>
          {confirmModal.title || 'Confirmação'}
        </h3>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          {confirmModal.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={confirmModal.onCancel}
            className="btn btn--outline"
            style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none' }}
          >
            Cancelar
          </button>
          <button 
            onClick={confirmModal.onConfirm}
            className="btn btn--primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem', minHeight: '40px', height: 'auto', width: 'auto', flex: 'none', color: '#050a06' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
