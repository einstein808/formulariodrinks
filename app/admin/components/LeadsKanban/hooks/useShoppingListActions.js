import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';

export function useShoppingListActions({
  selectedLead,
  setSelectedLead,
  isEditingShoppingList,
  setIsEditingShoppingList,
  editedShoppingList,
  setEditedShoppingList,
  showToast
}) {
  const handleStartEditShoppingList = () => {
    if (!selectedLead) return;
    setEditedShoppingList({
      insumos: { ...(selectedLead.shoppingListResult?.insumos || {}) },
      fixos: (selectedLead.shoppingListResult?.fixos || []).map(f => ({ ...f }))
    });
    setIsEditingShoppingList(true);
  };

  const handleSaveShoppingList = async () => {
    if (!selectedLead || !editedShoppingList) return;
    try {
      await update(ref(db, `leads/${selectedLead.id}`), {
        shoppingListResult: editedShoppingList
      });
      setSelectedLead(prev => ({
        ...prev,
        shoppingListResult: editedShoppingList
      }));
      setIsEditingShoppingList(false);
      setEditedShoppingList(null);
      showToast("Lista de compras atualizada com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar lista:", err);
      showToast("Erro ao salvar alterações da lista.", "error");
    }
  };

  const toggleShoppingListItem = async (lead, itemId) => {
    if (!lead) return;
    const currentChecked = lead.shoppingListChecked || {};
    const newChecked = { ...currentChecked, [itemId]: !currentChecked[itemId] };
    setSelectedLead(prev => ({
      ...prev,
      shoppingListChecked: newChecked
    }));
    try {
      await update(ref(db, `leads/${lead.id}`), {
        shoppingListChecked: newChecked
      });
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar conferência do item.", "error");
    }
  };

  const updateInsumoKey = (oldKey, newKey) => {
    if (!editedShoppingList || oldKey === newKey) return;
    const insumos = { ...editedShoppingList.insumos };
    insumos[newKey] = insumos[oldKey];
    delete insumos[oldKey];
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const updateInsumoVal = (key, val) => {
    if (!editedShoppingList) return;
    const insumos = { ...editedShoppingList.insumos };
    insumos[key] = val;
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const deleteInsumo = (key) => {
    if (!editedShoppingList) return;
    const insumos = { ...editedShoppingList.insumos };
    delete insumos[key];
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const addInsumo = () => {
    if (!editedShoppingList) return;
    const insumos = { ...editedShoppingList.insumos, "Novo Insumo": "1 Litros" };
    setEditedShoppingList({ ...editedShoppingList, insumos });
  };

  const updateFixoField = (idx, field, val) => {
    if (!editedShoppingList) return;
    const fixos = [...editedShoppingList.fixos];
    fixos[idx] = { ...fixos[idx], [field]: val };
    setEditedShoppingList({ ...editedShoppingList, fixos });
  };

  const deleteFixo = (idx) => {
    if (!editedShoppingList) return;
    const fixos = [...editedShoppingList.fixos];
    fixos.splice(idx, 1);
    setEditedShoppingList({ ...editedShoppingList, fixos });
  };

  const addFixo = () => {
    if (!editedShoppingList) return;
    const fixos = [
      ...editedShoppingList.fixos,
      { id: 'custom_' + Date.now(), nome: 'Novo Item Fixo', quantidade: 1, unidade: 'un', categoria: 'bar' }
    ];
    setEditedShoppingList({ ...editedShoppingList, fixos });
  };

  return {
    handleStartEditShoppingList,
    handleSaveShoppingList,
    toggleShoppingListItem,
    updateInsumoKey,
    updateInsumoVal,
    deleteInsumo,
    addInsumo,
    updateFixoField,
    deleteFixo,
    addFixo
  };
}
export default useShoppingListActions;
