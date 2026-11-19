import React from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const variants = {
    success: { color: '#53d68a', Icon: FiCheckCircle },
    error: { color: '#ff7373', Icon: FiAlertCircle },
    info: { color: '#70c7e8', Icon: FiInfo },
    warning: { color: '#f0c66e', Icon: FiAlertTriangle },
  };
  const { Icon } = variants[toast.type] || variants.warning;

  return (
    <div className={`app-toast app-toast--${toast.type || 'warning'}`} role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'}>
      <Icon className="app-toast-icon" size={20} aria-hidden="true" />
      <div className="app-toast-message">{toast.message}</div>
      {onClose && (
        <button className="app-toast-close" onClick={onClose}
          aria-label="Fechar notificação"
        >
          <FiX size={16} />
        </button>
      )}
    </div>
  );
}
