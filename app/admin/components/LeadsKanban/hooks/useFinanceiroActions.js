import { ref, update, set, remove, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { slugify, detectCategoryByDescription } from '@/lib/utils';

export function useFinanceiroActions({
  selectedLead,
  setSelectedLead,
  setLeads,
  pacotes,
  estoque,
  newCost,
  setNewCost,
  setFaturamentoInput,
  showToast,
  showConfirm
}) {
  const handleUpdateFaturamento = async (valor) => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { faturamento: numValor });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev?.financeiro || {}),
          faturamento: numValor
        }
      }));
    } catch (err) {
      console.error("Erro ao atualizar faturamento:", err);
      showToast("Erro ao atualizar faturamento.", "error");
    }
  };

  const handleImportFromPackage = () => {
    if (!selectedLead) return;
    const normalizedSelectedPackage = (selectedLead.pacote || '').toLowerCase().trim();
    const pac = pacotes.find(p => 
      (p.name || '').toLowerCase().trim() === normalizedSelectedPackage ||
      (p.id || '').toLowerCase().trim() === normalizedSelectedPackage
    );
    if (!pac) {
      showToast("Não foi possível encontrar um pacote correspondente nas configurações.", "warning");
      return;
    }
    const cleanPriceStr = (pac.price || '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const basePrice = parseFloat(cleanPriceStr) || 0;
    let total = basePrice;
    const isPerGuest = (pac.priceLabel || '').toLowerCase().includes('convidado') || 
                       (pac.priceLabel || '').toLowerCase().includes('pessoa') ||
                       (pac.priceLabel || '').toLowerCase().includes('pax');
    if (isPerGuest && selectedLead.convidados) {
      const numGuests = parseInt(selectedLead.convidados, 10) || 0;
      total = basePrice * numGuests;
    }
    setFaturamentoInput(total.toString());
    handleUpdateFaturamento(total.toString());
    showToast(`Faturamento importado do pacote "${pac.name}": R$ ${total.toFixed(2)}`, "success");
  };

  const handleUpdateDesconto = async (valor) => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { desconto: numValor });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev?.financeiro || {}),
          desconto: numValor
        }
      }));
    } catch (err) {
      console.error("Erro ao atualizar desconto:", err);
      showToast("Erro ao atualizar desconto.", "error");
    }
  };

  const handleUpdateAplicarDescontoMaoDeObra = async (checked) => {
    if (!selectedLead) return;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { aplicarDescontoMaoDeObra: checked });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev?.financeiro || {}),
          aplicarDescontoMaoDeObra: checked
        }
      }));
      showToast(checked ? "Desconto ativado para Mão de Obra!" : "Desconto desativado para Mão de Obra.", "success");
    } catch (err) {
      console.error("Erro ao atualizar desconto de Mão de Obra:", err);
      showToast("Erro ao atualizar desconto de Mão de Obra.", "error");
    }
  };

  const handleUpdateValorPago = async (valor) => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    try {
      const path = `leads/${selectedLead.id}/financeiro`;
      await update(ref(db, path), { valorPago: numValor });
      setSelectedLead(prev => ({
        ...prev,
        financeiro: {
          ...(prev?.financeiro || {}),
          valorPago: numValor
        }
      }));
    } catch (err) {
      console.error("Erro ao atualizar valor pago:", err);
      showToast("Erro ao atualizar valor pago.", "error");
    }
  };

  const handleRegisterRecebimento = async (valor, forma, observacao = '') => {
    if (!selectedLead) return;
    const numValor = parseFloat(valor) || 0;
    if (numValor <= 0) {
      showToast("Insira um valor maior que zero.", "warning");
      return;
    }
    try {
      const recId = `rec-${Date.now()}`;
      const recData = {
        id: recId,
        valor: numValor,
        formaPagamento: forma || 'Pix',
        data: new Date().toISOString(),
        observacao: observacao.trim()
      };
      await set(ref(db, `leads/${selectedLead.id}/financeiro/recebimentos/${recId}`), recData);
      const currentRecebimentos = selectedLead.financeiro?.recebimentos || {};
      const newRecebimentos = { ...currentRecebimentos, [recId]: recData };
      const newTotalPaid = Object.values(newRecebimentos).reduce((acc, cur) => acc + (parseFloat(cur.valor) || 0), 0);
      await update(ref(db, `leads/${selectedLead.id}/financeiro`), { valorPago: newTotalPaid });
      setSelectedLead(prev => {
        const currentFinanceiro = prev?.financeiro || {};
        return {
          ...prev,
          financeiro: {
            ...currentFinanceiro,
            recebimentos: newRecebimentos,
            valorPago: newTotalPaid
          }
        };
      });
      showToast("Recebimento registrado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao registrar recebimento.", "error");
    }
  };

  const handleDeleteRecebimento = async (recId) => {
    if (!selectedLead || !recId) return;
    try {
      await remove(ref(db, `leads/${selectedLead.id}/financeiro/recebimentos/${recId}`));
      const currentRecebimentos = { ...(selectedLead.financeiro?.recebimentos || {}) };
      delete currentRecebimentos[recId];
      const newTotalPaid = Object.values(currentRecebimentos).reduce((acc, cur) => acc + (parseFloat(cur.valor) || 0), 0);
      await update(ref(db, `leads/${selectedLead.id}/financeiro`), { valorPago: newTotalPaid });
      setSelectedLead(prev => {
        const currentFinanceiro = prev?.financeiro || {};
        return {
          ...prev,
          financeiro: {
            ...currentFinanceiro,
            recebimentos: currentRecebimentos,
            valorPago: newTotalPaid
          }
        };
      });
      showToast("Recebimento removido.", "info");
    } catch (err) {
      console.error(err);
      showToast("Erro ao remover recebimento.", "error");
    }
  };

  const handleAddCost = async (descricao, valor, categoriaInput) => {
    if (!selectedLead || !descricao.trim()) {
      showToast("Descrição do custo é obrigatória.", "warning");
      return;
    }
    const cat = categoriaInput || detectCategoryByDescription(descricao);
    const costId = `custo-${Date.now()}`;
    const numQty = parseFloat(newCost.quantidade) || 0;
    const numUnit = parseFloat(newCost.valorUnitario) || 0;
    const rawValor = parseFloat(valor) || 0;
    const totalValor = (numQty > 0 && numUnit > 0) ? numQty * numUnit : rawValor;
    
    try {
      const costData = {
        id: costId,
        descricao: descricao.trim(),
        valor: totalValor,
        categoria: cat,
        ...(numQty > 0 ? { quantidade: numQty } : {}),
        ...(numUnit > 0 ? { valorUnitario: numUnit } : {}),
        ...(newCost.itemIdEstoque ? { itemIdEstoque: newCost.itemIdEstoque } : {})
      };

      if (newCost.itemIdEstoque && numQty > 0) {
        const itemEstoque = estoque.find(i => i.id === newCost.itemIdEstoque);
        if (itemEstoque) {
          const novaQtd = Math.max(0, (itemEstoque.quantidadeAtual || 0) - numQty);
          await update(ref(db, `config/estoque/${newCost.itemIdEstoque}`), { quantidadeAtual: novaQtd });
          
          const movRef = push(ref(db, 'config/estoqueMovimentacoes'));
          await set(movRef, {
            itemId: newCost.itemIdEstoque,
            tipo: 'saida',
            quantidade: numQty,
            motivo: `Uso no evento: ${selectedLead.nome} ${selectedLead.sobrenome || ''}`.trim(),
            data: new Date().toISOString()
          });
        }
      }

      const pathCost = `leads/${selectedLead.id}/financeiro/custos/${costId}`;
      await set(ref(db, pathCost), costData);

      const slug = slugify(descricao);
      if (slug) {
        const pathPreset = `config/financeiroPresets/${slug}`;
        await set(ref(db, pathPreset), {
          descricao: descricao.trim(),
          valor: rawValor,
          categoria: cat
        });
      }

      setSelectedLead(prev => {
        const currentFinanceiro = prev?.financeiro || {};
        const currentCustos = currentFinanceiro.custos || {};
        return {
          ...prev,
          financeiro: {
            ...currentFinanceiro,
            custos: { ...currentCustos, [costId]: costData }
          }
        };
      });

      setNewCost({ descricao: '', valor: '', quantidade: '', valorUnitario: '', categoria: 'insumos', itemIdEstoque: '' });
      showToast("Custo adicionado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao adicionar custo:", err);
      showToast("Erro ao adicionar custo.", "error");
    }
  };

  const handleUpdateCostCategory = async (costId, newCat) => {
    if (!selectedLead || !costId) return;
    try {
      const path = `leads/${selectedLead.id}/financeiro/custos/${costId}/categoria`;
      await set(ref(db, path), newCat);
      setSelectedLead(prev => {
        const currentFinanceiro = prev?.financeiro || {};
        const currentCustos = { ...(currentFinanceiro.custos || {}) };
        if (currentCustos[costId]) {
          currentCustos[costId] = { ...currentCustos[costId], categoria: newCat };
        }
        return {
          ...prev,
          financeiro: { ...currentFinanceiro, custos: currentCustos }
        };
      });
      setLeads(prev => prev.map(l => {
        if (l.id !== selectedLead.id) return l;
        const cCustos = { ...(l.financeiro?.custos || {}) };
        if (cCustos[costId]) {
          cCustos[costId] = { ...cCustos[costId], categoria: newCat };
        }
        return { ...l, financeiro: { ...(l.financeiro || {}), custos: cCustos } };
      }));
      showToast("Categoria do custo atualizada!", "success");
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      showToast("Erro ao atualizar categoria.", "error");
    }
  };

  const handleRemoveCost = async (costId) => {
    if (!selectedLead || !costId) return;
    showConfirm("Remover este custo do evento?", async () => {
      try {
        const path = `leads/${selectedLead.id}/financeiro/custos/${costId}`;
        await remove(ref(db, path));
        setSelectedLead(prev => {
          const currentFinanceiro = prev?.financeiro || {};
          const currentCustos = { ...(currentFinanceiro.custos || {}) };
          delete currentCustos[costId];
          return {
            ...prev,
            financeiro: {
              ...currentFinanceiro,
              custos: currentCustos
            }
          };
        });
        showToast("Custo removido com sucesso!", "success");
      } catch (err) {
        console.error("Erro ao remover custo:", err);
        showToast("Erro ao remover custo.", "error");
      }
    }, "Remover Custo");
  };

  const handleApplyPackageCostsTemplate = async (leadToUpdate) => {
    const targetLead = leadToUpdate || selectedLead;
    if (!targetLead) return;

    const leadPackageName = targetLead.pacote || targetLead.pacoteNome || targetLead.pacoteId || '';
    const foundPacote = pacotes.find(p =>
      p.id === targetLead.pacoteId ||
      (p.name && leadPackageName && p.name.toLowerCase().trim() === leadPackageName.toLowerCase().trim()) ||
      (p.name && leadPackageName && leadPackageName.toLowerCase().includes(p.name.toLowerCase()))
    );

    let templateItems = [];
    if (foundPacote && Array.isArray(foundPacote.custosPadrao) && foundPacote.custosPadrao.length > 0) {
      templateItems = foundPacote.custosPadrao;
    } else {
      const convidados = parseInt(targetLead.convidados || targetLead.numConvidados || 50, 10);
      const factor = Math.max(1, Math.round(convidados / 50));
      templateItems = [
        { item: 'Insumos & Bebidas Base', valor: 150 * factor, quantidade: 1, categoria: 'insumos' },
        { item: 'Gelo, Frutas & Perecíveis', valor: 70 * factor, quantidade: 1, categoria: 'insumos' },
        { item: 'Ajudante / Bartender', valor: 200, quantidade: 1, categoria: 'equipe' },
        { item: 'Logística & Frete', valor: 60, quantidade: 1, categoria: 'logistica' }
      ];
    }

    try {
      const currentCustos = targetLead?.financeiro?.custos || {};
      const newCustosObject = { ...currentCustos };

      templateItems.forEach((item, index) => {
        const costId = `cost_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`;
        const val = parseFloat(item.valor || item.valorUnitario) || 0;
        const qtd = parseInt(item.quantidade, 10) || 1;
        const totalVal = val * qtd;

        newCustosObject[costId] = {
          id: costId,
          descricao: item.item || item.descricao || 'Custo Estimado',
          valor: totalVal,
          quantidade: qtd,
          valorUnitario: val,
          categoria: item.categoria || detectCategoryByDescription(item.item || item.descricao || ''),
          data: new Date().toISOString()
        };
      });

      const pathCustos = `leads/${targetLead.id}/financeiro/custos`;
      await set(ref(db, pathCustos), newCustosObject);

      setLeads(prev => prev.map(l => l.id === targetLead.id ? {
        ...l,
        financeiro: { ...(l.financeiro || {}), custos: newCustosObject }
      } : l));

      if (selectedLead && selectedLead.id === targetLead.id) {
        setSelectedLead(prev => ({
          ...prev,
          financeiro: { ...(prev?.financeiro || {}), custos: newCustosObject }
        }));
      }

      showToast("⚡ Custos estimados do pacote inseridos com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao aplicar template de custos:", err);
      showToast("Erro ao aplicar template de custos.", "error");
    }
  };

  return {
    handleUpdateFaturamento,
    handleImportFromPackage,
    handleUpdateDesconto,
    handleUpdateAplicarDescontoMaoDeObra,
    handleUpdateValorPago,
    handleRegisterRecebimento,
    handleDeleteRecebimento,
    handleAddCost,
    handleUpdateCostCategory,
    handleRemoveCost,
    handleApplyPackageCostsTemplate
  };
}
export default useFinanceiroActions;
