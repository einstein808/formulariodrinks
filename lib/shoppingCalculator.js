export const DEFAULT_FIXED_ITEMS = [
  { id: 'sifao_espuma', nome: 'Sifão de Espuma (carga)', categoria: 'bar', tipoCalc: 'fixo', quantidade: 6, unidade: 'un' },
  { id: 'limoes', nome: 'Limões', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.04, unidade: 'kg' },
  { id: 'gelo', nome: 'Gelo', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.2, unidade: 'kg' },
  { id: 'hortela', nome: 'Hortelã', categoria: 'insumo', tipoCalc: 'porConvidado', quantidade: 0.02, unidade: 'maço' },
  { id: 'decoracao', nome: 'Decoração de Mesa', categoria: 'decoracao', tipoCalc: 'fixo', quantidade: 1, unidade: 'kit' },
  { id: 'guardanapos', nome: 'Guardanapos', categoria: 'descartavel', tipoCalc: 'porConvidado', quantidade: 0.05, unidade: 'pct' },
  { id: 'canudos', nome: 'Canudos', categoria: 'descartavel', tipoCalc: 'fixo', quantidade: 2, unidade: 'pct' },
];

export const CATEGORY_LABELS = {
  drinks:      { label: '🍹 Bebidas e Insumos', color: '#FF9800' },
  bar:         { label: '🍸 Equipamentos de Bar', color: '#CBA153' },
  insumo:      { label: '🍋 Insumos Frescos', color: '#4CAF50' },
  decoracao:   { label: '✨ Decoração', color: '#CE93D8' },
  descartavel: { label: '🧾 Descartáveis', color: '#00E5FF' },
};

export function calculateShoppingItems(evento, shoppingConfig, drinksMenu = {}, drinksConfig = []) {
  if (!evento) return { items: [], total: 0, checked: 0 };
  const savedChecked = evento.shoppingListChecked || {};
  let items = [];

  if (evento.shoppingListResult) {
    const res = evento.shoppingListResult;
    if (res.insumos) {
      Object.entries(res.insumos).forEach(([nome, qtd]) => {
        items.push({
          id: `insumo_${nome.toLowerCase().replace(/\\s+/g, '_')}`,
          nome: nome,
          quantidade: qtd,
          categoria: 'drinks'
        });
      });
    }
    if (res.fixos && Array.isArray(res.fixos)) {
      res.fixos.forEach(f => {
        items.push({
          id: f.id || `fixo_${f.nome.toLowerCase().replace(/\\s+/g, '_')}`,
          nome: f.nome,
          quantidade: `${f.quantidade} ${f.unidade || 'un'}`,
          categoria: f.categoria || 'bar'
        });
      });
    }
  } else {
    const conv = Number(evento.convidados) || 50;
    const margem = 1 + ((shoppingConfig?.margemSeguranca || 10) / 100);
    let chosen = evento.drinksEscolhidos || [];
    if (chosen.length === 0) {
      chosen = [
        ...(evento.drinks_alcool || []),
        ...(evento.drinks_sofisticados || []),
        ...(evento.drinks_sem_alcool || []),
        ...(evento.drinks_frozen || [])
      ];
    }

    const agregInsumos = {};
    chosen.forEach(dSlug => {
      let drinkObj = drinksMenu?.[dSlug];
      if (!drinkObj && typeof drinksMenu === 'object') {
        const menuList = Array.isArray(drinksMenu) ? drinksMenu : Object.values(drinksMenu);
        drinkObj = menuList.find(d => d && (d.slug === dSlug || d.id === dSlug || d.nameKey === dSlug));
      }
      if (!drinkObj && drinksConfig) {
        const confList = Array.isArray(drinksConfig) ? drinksConfig : Object.values(drinksConfig);
        drinkObj = confList.find(d => d && (d.id === dSlug || d.slug === dSlug || d.name === dSlug || d.nome === dSlug));
      }

      const ingList = drinkObj?.ingredientes || drinkObj?.receita;
      if (ingList && Array.isArray(ingList)) {
        ingList.forEach(ing => {
          const nomeIng = ing.nome || ing.insumo || ing.name;
          const qtdIng = ing.quantidade || ing.qtd;
          if (!nomeIng || !qtdIng) return;
          const key = nomeIng.trim();
          const baseQ = Number(qtdIng) * conv;
          if (!agregInsumos[key]) {
            agregInsumos[key] = { qtd: 0, unidade: ing.unidade || 'un' };
          }
          agregInsumos[key].qtd += (baseQ * margem);
        });
      }
    });

    Object.entries(agregInsumos).forEach(([nome, data]) => {
      let q = data.qtd;
      let u = data.unidade;
      if (u === 'ml') {
        q = Math.ceil(q / 1000);
        u = 'Litros';
      } else if (u === 'g' && q >= 1000) {
        q = Math.ceil(q / 1000);
        u = 'Kg';
      } else {
        q = Math.ceil(q);
      }
      items.push({
        id: `insumo_${nome.toLowerCase().replace(/\s+/g, '_')}`,
        nome,
        quantidade: `${q} ${u}`,
        categoria: 'drinks'
      });
    });

    const fixBase = shoppingConfig?.itensFixos && shoppingConfig.itensFixos.length > 0 
      ? shoppingConfig.itensFixos 
      : DEFAULT_FIXED_ITEMS;

    fixBase.forEach(fixo => {
      if (!fixo.nome) return;
      const tot = fixo.tipoCalc === 'porConvidado' 
        ? Math.ceil(Number(fixo.quantidade) * conv) 
        : Math.ceil(Number(fixo.quantidade));
      items.push({
        id: fixo.id || `fixo_${fixo.nome.toLowerCase().replace(/\s+/g, '_')}`,
        nome: fixo.nome,
        quantidade: `${tot} ${fixo.unidade || 'un'}`,
        categoria: fixo.categoria || 'bar'
      });
    });
  }

  const total = items.length;
  const checked = items.filter(i => savedChecked[i.id]).length;
  return { items, total, checked };
}
