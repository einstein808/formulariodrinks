import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar estado de toasts/notificações no app.
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
export default useToast;
