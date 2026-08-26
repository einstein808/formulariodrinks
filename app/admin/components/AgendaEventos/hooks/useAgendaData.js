import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';

export function useAgendaData() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [cerimonialistas, setCerimonialistas] = useState({});
  const [ajudantes, setAjudantes] = useState({});
  const [drinksMenu, setDrinksMenu] = useState({});
  const [drinksConfig, setDrinksConfig] = useState([]);
  const [shoppingConfig, setShoppingConfig] = useState(null);

  useEffect(() => {
    const leadsRef = ref(db, 'leads');
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const todosLeads = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        
        // Filtra apenas leads fechados ou realizados que possuem dataEvento
        const eventosFechados = todosLeads.filter(
          lead => (lead.status === 'fechado' || lead.status === 'realizado') && lead.dataEvento
        );
        
        setEventos(eventosFechados);

        // Se o evento selecionado foi atualizado no DB, atualiza no modal
        setSelectedEvento(prev => {
          if (!prev) return null;
          const updated = eventosFechados.find(ev => ev.id === prev.id);
          return updated || prev;
        });
      } else {
        setEventos([]);
      }
      setLoading(false);
    });

    const configRef = ref(db, 'config');
    const unsubscribeConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.cerimonialistas) setCerimonialistas(data.cerimonialistas);
        if (data.ajudantes) setAjudantes(data.ajudantes);
        if (data.drinksMenu) setDrinksMenu(data.drinksMenu);
        if (data.drinks) setDrinksConfig(data.drinks);
        if (data.shoppingConfig) setShoppingConfig(data.shoppingConfig);
      }
    });

    return () => {
      unsubscribeLeads();
      unsubscribeConfig();
    };
  }, []);

  const handleToggleCheckItem = async (itemId) => {
    if (!selectedEvento) return;
    const currentChecked = selectedEvento.shoppingListChecked || {};
    const nextChecked = {
      ...currentChecked,
      [itemId]: !currentChecked[itemId]
    };
    setSelectedEvento(prev => ({
      ...prev,
      shoppingListChecked: nextChecked
    }));
    try {
      await update(ref(db, `leads/${selectedEvento.id}`), {
        shoppingListChecked: nextChecked
      });
    } catch (err) {
      console.error("Erro ao salvar checklist:", err);
    }
  };

  const handleToggleAllChecks = async (allItemIds, checkVal) => {
    if (!selectedEvento) return;
    const nextChecked = { ...(selectedEvento.shoppingListChecked || {}) };
    allItemIds.forEach(id => {
      nextChecked[id] = checkVal;
    });
    setSelectedEvento(prev => ({
      ...prev,
      shoppingListChecked: nextChecked
    }));
    try {
      await update(ref(db, `leads/${selectedEvento.id}`), {
        shoppingListChecked: nextChecked
      });
    } catch (err) {
      console.error("Erro ao salvar checklist:", err);
    }
  };

  return {
    eventos,
    loading,
    selectedEvento,
    setSelectedEvento,
    cerimonialistas,
    ajudantes,
    drinksMenu,
    drinksConfig,
    shoppingConfig,
    handleToggleCheckItem,
    handleToggleAllChecks
  };
}
