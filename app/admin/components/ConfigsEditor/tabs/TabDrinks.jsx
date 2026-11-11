"use client";
import React from 'react';
import { FiPlus, FiTrash2, FiZap } from 'react-icons/fi';
import { useConfigs } from '../context/ConfigsContext';
import MinioImageUpload from '@/app/admin/components/MinioImageUpload';
import { getDefaultRecipeForDrink, sanitizeRecipe } from '@/lib/drinksRecipes';

export default function TabDrinks() {
  const { drinks, setDrinks } = useConfigs();

  const addDrink = () => {
    const newId = `drink-${Date.now()}`;
    setDrinks([...drinks, { id: newId, name: 'Novo Drink', emoji: '🍹', category: 'alcool' }]);
  };

  const updateDrink = (id, field, value) => {
    setDrinks(drinks.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const updateDrinkRecipe = (id, ingredientIndex, field, value) => {
    setDrinks(drinks.map(d => {
      if (d.id !== id) return d;
      const novaReceita = [...(d.receita || [])];
      novaReceita[ingredientIndex] = { ...novaReceita[ingredientIndex], [field]: value };
      return { ...d, receita: novaReceita };
    }));
  };

  const addDrinkRecipeItem = (id) => {
    setDrinks(drinks.map(d => {
      if (d.id !== id) return d;
      return { ...d, receita: [...(d.receita || []), { insumo: '', quantidade: '', unidade: 'ml' }] };
    }));
  };

  const removeDrinkRecipeItem = (id, ingredientIndex) => {
    setDrinks(drinks.map(d => {
      if (d.id !== id) return d;
      const novaReceita = [...(d.receita || [])];
      novaReceita.splice(ingredientIndex, 1);
      return { ...d, receita: novaReceita };
    }));
  };

  const applyDefaultRecipe = (id, drinkName) => {
    const defaultRec = getDefaultRecipeForDrink(id || drinkName);
    if (defaultRec && defaultRec.length > 0) {
      setDrinks(drinks.map(d => d.id === id ? { ...d, receita: defaultRec } : d));
    } else {
      alert('Nenhuma receita padrão cadastrada para este drink.');
    }
  };

  const fixAndStandardizeAllRecipes = () => {
    if (window.confirm('Deseja corrigir e padronizar automaticamente todas as unidades e fichas técnicas (corrigindo limão em gramas, Run -> Rum, doses vazias e adicionando receitas de frozens)?')) {
      let count = 0;
      const updated = drinks.map(d => {
        let rec = d.receita && Array.isArray(d.receita) && d.receita.length > 0
          ? sanitizeRecipe(d.receita)
          : [];
        if (rec.length === 0) {
          rec = getDefaultRecipeForDrink(d.id || d.name);
        }
        count++;
        return { ...d, receita: rec };
      });
      setDrinks(updated);
      alert(`Todas as ${count} fichas de drinks foram corrigidas e padronizadas com sucesso! Lembre-se de clicar em "Salvar Alterações" no topo do painel.`);
    }
  };

  const applyAllDefaultRecipes = () => {
    if (window.confirm('Deseja preencher as fichas técnicas e dosagens padrão em todos os drinks cadastrados?')) {
      let count = 0;
      const updated = drinks.map(d => {
        const defaultRec = getDefaultRecipeForDrink(d.id || d.name);
        if (defaultRec && defaultRec.length > 0) {
          count++;
          return { ...d, receita: defaultRec };
        }
        return d;
      });
      setDrinks(updated);
      alert(`Ficha técnica padrão aplicada a ${count} drinks! Lembre-se de clicar em "Salvar Alterações" no topo do painel.`);
    }
  };

  const removeDrink = (id) => {
    if (window.confirm('Remover este drink do cardápio?')) {
      setDrinks(drinks.filter(d => d.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, flex: 1, minWidth: '240px' }}>
          Cadastre as opções de drinks do bar, fotos para o cardápio e os insumos de cada receita para o cálculo automático de compras.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn--primary" 
            onClick={fixAndStandardizeAllRecipes} 
            style={{ width: 'auto', fontSize: '0.82rem', padding: '8px 12px' }}
            title="Corrigir unidades erradas (1g -> 1un), nomes duplicados e preencher frozens sem receita"
          >
            🔧 Corrigir Unidades & Nomes
          </button>
          <button 
            type="button"
            className="btn btn--outline" 
            onClick={applyAllDefaultRecipes} 
            style={{ width: 'auto', color: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '0.82rem', padding: '8px 12px' }}
            title="Preencher dosagens padrão da coquetelaria em todos os drinks"
          >
            <FiZap /> Restaurar Todas Fichas
          </button>
          <button className="btn btn--outline" onClick={addDrink} style={{ width: 'auto', fontSize: '0.82rem', padding: '8px 12px' }}>
            <FiPlus /> Novo Drink
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {drinks.map((drink) => (
          <div key={drink.id} className="admin-config-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-input)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '60px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Emoji</label>
                <input type="text" className="form-input" value={drink.emoji || ''} onChange={(e) => updateDrink(drink.id, 'emoji', e.target.value)} style={{ textAlign: 'center' }} />
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Nome do Drink</label>
                <input type="text" className="form-input" value={drink.name || ''} onChange={(e) => updateDrink(drink.id, 'name', e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Imagem do Drink (Opcional)</label>
                <MinioImageUpload value={drink.image} onChange={(url) => updateDrink(drink.id, 'image', url)} placeholder="https://link-da-imagem.jpg" />
              </div>
              <div style={{ width: '90px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }} title="Maior peso significa que sai mais na festa">Peso (1-10)</label>
                <input type="number" className="form-input" value={drink.popularityWeight || ''} onChange={(e) => updateDrink(drink.id, 'popularityWeight', Number(e.target.value))} min="1" max="10" placeholder="5" />
              </div>
              <div style={{ width: '140px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Categoria</label>
                <select
                  className="form-select"
                  value={drink.category || (drink.isNonAlcoholic ? 'sem_alcool' : 'alcool')}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setDrinks(drinks.map(d => d.id === drink.id ? { ...d, category: cat, isNonAlcoholic: cat === 'sem_alcool' } : d));
                  }}
                  style={{ padding: '8px', fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="alcool">🍸 Alcoólico</option>
                  <option value="sem_alcool">🧃 Sem Álcool</option>
                  <option value="sofisticado">✨ Sofisticado</option>
                  <option value="frozen">❄️ Frozen</option>
                </select>
              </div>
              <button onClick={() => removeDrink(drink.id)} style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', marginTop: '18px' }} title="Excluir Drink">
                <FiTrash2 size={16} />
              </button>
            </div>
            
            {/* Receita do Drink */}
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <h5 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Receita / Ficha Técnica (Base para 1 preparo)</h5>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button"
                    onClick={() => applyDefaultRecipe(drink.id, drink.name)} 
                    style={{ background: 'none', border: '1px solid rgba(203,161,83,0.3)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}
                    title="Preencher com a receita e dosagens padrão"
                  >
                    ⚡ Ficha Padrão
                  </button>
                  <button 
                    type="button"
                    onClick={() => addDrinkRecipeItem(drink.id)} 
                    style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}
                  >
                    + Adicionar Insumo
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(drink.receita || []).length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nenhuma receita cadastrada. O cálculo de insumos usará as médias gerais.</span>
                )}
                {(drink.receita || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="Ex: Vodka" value={item.insumo || ''} onChange={(e) => updateDrinkRecipe(drink.id, idx, 'insumo', e.target.value)} style={{ padding: '6px 10px', fontSize: '0.82rem' }} />
                    <input type="number" className="form-input" placeholder="Ex: 50" value={item.quantidade || ''} onChange={(e) => updateDrinkRecipe(drink.id, idx, 'quantidade', e.target.value)} style={{ width: '80px', padding: '6px 10px', fontSize: '0.82rem' }} />
                    <select className="form-select" value={item.unidade || 'ml'} onChange={(e) => updateDrinkRecipe(drink.id, idx, 'unidade', e.target.value)} style={{ width: '80px', padding: '6px', fontSize: '0.82rem' }}>
                      <option value="ml">ml</option>
                      <option value="g">g</option>
                      <option value="un">un</option>
                      <option value="fatias">fatias</option>
                    </select>
                    <button onClick={() => removeDrinkRecipeItem(drink.id, idx)} style={{ background: 'none', border: 'none', color: '#F44336', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
