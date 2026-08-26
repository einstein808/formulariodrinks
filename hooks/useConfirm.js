import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar modais de confirmação de ação.
 */
export function useConfirm() {
  const [confirmModal, setConfirmModal] = useState(null);

  const showConfirm = useCallback((message, onConfirm, title = "Confirmação") => {
    setConfirmModal({
      title,
      message,
      onConfirm: async () => {
        setConfirmModal(null);
        await onConfirm();
      },
      onCancel: () => {
        setConfirmModal(null);
      }
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmModal(null);
  }, []);

  return { confirmModal, showConfirm, hideConfirm };
}
export default useConfirm;
