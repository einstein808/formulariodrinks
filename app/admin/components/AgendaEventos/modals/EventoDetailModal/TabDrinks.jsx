import React from 'react';

export function resolveDrinkInfo(drinkItem, drinksMenu = {}, drinksConfig = []) {
  if (!drinkItem) return { nome: 'Drink', foto: null, emoji: '🍸', ingredientes: [] };

  // Se já for um objeto com dados do drink
  if (typeof drinkItem === 'object') {
    const nome = drinkItem.nome || drinkItem.name || drinkItem.title || 'Drink';
    const foto = drinkItem.imagem || drinkItem.foto || drinkItem.image || drinkItem.url || null;
    const emoji = drinkItem.emoji || null;
    const ingRaw = drinkItem.ingredientes || drinkItem.receita || [];
    const ingredientes = Array.isArray(ingRaw) 
      ? ingRaw.map(i => (typeof i === 'string' ? i : (i.nome || i.insumo || i.name || ''))).filter(Boolean)
      : [];
    return { nome, foto, emoji, ingredientes };
  }

  const slug = String(drinkItem).trim();
  const slugClean = slug.toLowerCase();
  const slugNorm = slugClean.replace(/[\s_-]+/g, '');

  // 1. Procurar em drinksMenu
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

  // 2. Se não achou, procurar em drinksConfig (de config/drinks)
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
    const nome = found.nome || found.name || found.title || slug;
    const foto = found.imagem || found.foto || found.image || found.photo || found.url || null;
    const emoji = found.emoji || null;
    const ingRaw = found.ingredientes || found.receita || [];
    const ingredientes = Array.isArray(ingRaw) 
      ? ingRaw.map(i => (typeof i === 'string' ? i : (i.nome || i.insumo || i.name || ''))).filter(Boolean)
      : [];
    return { nome, foto, emoji, ingredientes };
  }

  // 3. Fallback amigável
  let fallbackName = slug;
  if (/^drink[_-]?\d+$/i.test(slug)) {
    fallbackName = 'Drink Especial (Personalizado)';
  } else {
    fallbackName = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return {
    nome: fallbackName,
    foto: null,
    emoji: '🍸',
    ingredientes: []
  };
}

export default function TabDrinks({ selectedEvento, drinksMenu = {}, drinksConfig = [] }) {
  // Coletar drinks de todas as possíveis propriedades do lead
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
      <h3 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        🍹 Cardápio Selecionado ({drinksEscolhidosList.length} drinks)
      </h3>

      {drinksEscolhidosList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {drinksEscolhidosList.map((drinkItem, idx) => {
            const drink = resolveDrinkInfo(drinkItem, drinksMenu, drinksConfig);

            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'var(--bg-input)', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center'
                }}
              >
                {drink.foto ? (
                  <img 
                    src={drink.foto} 
                    alt={drink.nome} 
                    style={{ width: 46, height: 46, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
                  />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: '8px', background: 'rgba(203,161,83,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                    {drink.emoji || '🍸'}
                  </div>
                )}
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {drink.nome}
                  </div>
                  {drink.ingredientes && drink.ingredientes.length > 0 ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {drink.ingredientes.join(', ')}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.7 }}>
                      Receita padrão
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

