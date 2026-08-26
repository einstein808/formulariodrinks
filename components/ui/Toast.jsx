import React from 'react';
import { FiX } from 'react-icons/fi';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const color = 
    toast.type === 'success' ? '#4CAF50' : 
    toast.type === 'error' ? '#F44336' : 
    toast.type === 'info' ? '#00E5FF' : '#FFD54F';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: 'var(--bg-card)',
      border: `1px solid ${color}`,
      borderRadius: '12px',
      padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      maxWidth: '360px',
      animation: 'slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        flexShrink: 0
      }} />
      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500', lineHeight: 1.4 }}>
        {toast.message}
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            marginLeft: 'auto',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label="Fechar notificação"
        >
          <FiX size={16} />
        </button>
      )}
    </div>
  );
}
