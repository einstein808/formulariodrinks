import React from 'react';
import { getDefaultRecipeForDrink, sanitizeRecipe } from '@/lib/drinksRecipes';

export function resolveDrinkInfo(drinkItem, drinksMenu = {}, drinksConfig = []) {
  if (!drinkItem) return { nome: 'Drink', foto: null, emoji: '🍸', ingredientes: [], receita: [] };

  let nome = 'Drink';
  let foto = null;
  let emoji = null;
  let ingRaw = null;
  let identifier = '';

  // 1. Se já for um objeto com dados do drink
  if (typeof drinkItem === 'object') {
    nome = drinkItem.nome || drinkItem.name || drinkItem.title || 'Drink';
    foto = drinkItem.imagem || drinkItem.foto || drinkItem.image || drinkItem.url || null;
    emoji = drinkItem.emoji || null;
    ingRaw = drinkItem.ingredientes || drinkItem.receita || null;
    identifier = drinkItem.id || drinkItem.slug || nome;
  } else {
    const slug = String(drinkItem).trim();
    identifier = slug;
    const slugClean = slug.toLowerCase();
    const slugNorm = slugClean.replace(/[\s_-]+/g, '');

    // Procurar em drinksMenu
    let found = null;
    if (drinksMenu && typeof drinksMenu === 'object') {
      if (drinksMenu[slug]) {
        found = drinksMenu[slug];
      } else {
        const list = Array.isArray(drinksMenu) ? drinksMenu : Object.values(drinksMenu);
        found = list.find(d => {
          if (!d) return false;
          const dId = String(d.id || '').toLowerCase().replace(/[\s_-]+/g, '');
          const dSlug = String(d.slug || '').toLowerCase().replace(/[\s_-]+/g, '');
          const dName = String(d.name || d.nome || '').toLowerCase().replace(/[\s_-]+/g, '');
          return dId === slugNorm || dSlug === slugNorm || dName === slugNorm || d.id === slug || d.slug === slug;
        });
      }
    }

    // Se não achou, procurar em drinksConfig
    if (!found && drinksConfig) {
      const list = Array.isArray(drinksConfig) ? drinksConfig : Object.values(drinksConfig);
      found = list.find(d => {
        if (!d) return false;
        const dId = String(d.id || '').toLowerCase().replace(/[\s_-]+/g, '');
        const dSlug = String(d.slug || '').toLowerCase().replace(/[\s_-]+/g, '');
        const dName = String(d.name || d.nome || '').toLowerCase().replace(/[\s_-]+/g, '');
        return dId === slugNorm || dSlug === slugNorm || dName === slugNorm || d.id === slug || d.slug === slug;
      });
    }

    if (found) {
      nome = found.nome || found.name || found.title || slug;
      foto = found.imagem || found.foto || found.image || found.photo || found.url || null;
      emoji = found.emoji || null;
      ingRaw = found.ingredientes || found.receita || null;
    } else {
      // Fallback amigável
      if (/^drink[_-]?\d+$/i.test(slug)) {
        nome = 'Drink Especial (Personalizado)';
      } else {
        nome = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  }

  // Sanitiza a receita para corrigir unidades erradas (ex: limão 1g -> 1un, Run -> Rum)
  let finalReceita = (Array.isArray(ingRaw) && ingRaw.length > 0)
    ? sanitizeRecipe(ingRaw)
    : [];

  // Se não tiver receita própria ou estiver vazia, busca na ficha técnica padrão
  if (finalReceita.length === 0) {
    finalReceita = getDefaultRecipeForDrink(identifier || nome);
  }

  const formattedIngredientes = finalReceita.map(i => {
    if (typeof i === 'string') return { insumo: i, quantidade: '', unidade: '', label: i };
    const n = i.nome || i.insumo || i.name || '';
    if (!n) return null;
    const qtd = i.quantidade !== undefined && i.quantidade !== '' ? i.quantidade : '';
    const un = i.unidade || '';
    const label = qtd ? `${n} (${qtd} ${un})`.trim() : n;
    return { insumo: n, quantidade: qtd, unidade: un, label };
  }).filter(Boolean);

  return {
    nome,
    foto,
    emoji: emoji || '🍸',
    ingredientes: formattedIngredientes.map(i => i.label),
    receita: formattedIngredientes
  };
}

export default function TabDrinks({ selectedEvento, drinksMenu = {}, drinksConfig = [] }) {
  let drinksEscolhidosList = selectedEvento?.drinksEscolhidos || [];
  if (drinksEscolhidosList.length === 0) {
    const outros = [
      ...(selectedEvento?.drinks_alcool || []),
      ...(selectedEvento?.drinks_sofisticados || []),
      ...(selectedEvento?.drinks_sem_alcool || []),
      ...(selectedEvento?.drinks_frozen || [])
    ];
    if (outros.length > 0) drinksEscolhidosList = outros;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🍹 Cardápio Selecionado & Ficha Técnica ({drinksEscolhidosList.length} drinks)
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Dosagens para 1 preparo
        </span>
      </div>

      {drinksEscolhidosList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {drinksEscolhidosList.map((drinkItem, idx) => {
            const drink = resolveDrinkInfo(drinkItem, drinksMenu, drinksConfig);

            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'var(--bg-input)', 
                  borderRadius: '10px', 
                  padding: '14px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {drink.foto ? (
                    <img 
                      src={drink.foto} 
                      alt={drink.nome} 
                      style={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '8px', background: 'rgba(203,161,83,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                      {drink.emoji}
                    </div>
                  )}
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {drink.nome}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '1px' }}>
                      Ficha Técnica do Bar
                    </div>
                  </div>
                </div>

                {/* Insumos e Quantidades da Ficha Técnica */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {drink.receita && drink.receita.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {drink.receita.map((item, iIdx) => (
                        <span 
                          key={iIdx}
                          style={{
                            fontSize: '0.73rem',
                            background: 'rgba(203, 161, 83, 0.08)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(203, 161, 83, 0.25)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <strong style={{ color: 'var(--text-primary)' }}>{item.insumo}</strong>
                          {item.quantidade && (
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                              {item.quantidade}{item.unidade}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                      Receita clássica padrão
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Nenhum drink selecionado no contrato deste evento ainda.
        </div>
      )}
    </div>
  );
}
