import { getDefaultRecipeForDrink, sanitizeRecipe } from './drinksRecipes';

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
    const conv = Number(evento.convidados) || Number(res.convidadosCalculados) || 40;

    if (res.insumos) {
      Object.entries(res.insumos).forEach(([nome, qtd]) => {
        let qtdFormatada = qtd;

        // Auto-correção para valores legados distorcidos de limão (> 2.5 limões por convidado)
        if (nome.toLowerCase().includes('limão') && typeof qtd === 'string') {
          const matchNum = qtd.match(/^(\d+)/);
          if (matchNum && Number(matchNum[1]) > conv * 2.5) {
            const limaoReal = Math.ceil(conv * 1.0);
            qtdFormatada = `${limaoReal} un`;
          }
        }

        items.push({
          id: `insumo_${nome.toLowerCase().replace(/\s+/g, '_')}`,
          nome: nome,
          quantidade: qtdFormatada,
          categoria: 'drinks'
        });
      });
    }
    if (res.fixos && Array.isArray(res.fixos)) {
      res.fixos.forEach(f => {
        items.push({
          id: f.id || `fixo_${f.nome.toLowerCase().replace(/\s+/g, '_')}`,
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

    const totalDrinks = Math.ceil(conv * 3.5);
    const drinksPorTipo = chosen.length > 0 ? Math.ceil(totalDrinks / chosen.length) : Math.ceil(totalDrinks / 5);

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

      const rawList = drinkObj?.ingredientes || drinkObj?.receita;
      const ingList = (rawList && Array.isArray(rawList) && rawList.length > 0)
        ? sanitizeRecipe(rawList)
        : getDefaultRecipeForDrink(dSlug);

      if (ingList && Array.isArray(ingList)) {
        ingList.forEach(ing => {
          let nomeIng = (ing.nome || ing.insumo || ing.name || '').trim();
          let qtdIng = ing.quantidade || ing.qtd;
          let unIng = (ing.unidade || 'un').trim();
          if (!nomeIng || !qtdIng) return;

          // Padrão do bar: 20 ml de suco = 1 limão (un)
          if (nomeIng.toLowerCase().includes('limão') && unIng.toLowerCase() === 'ml' && Number(qtdIng) <= 60) {
            qtdIng = Math.max(0.5, Math.round((Number(qtdIng) / 20) * 10) / 10);
            unIng = 'un';
            nomeIng = 'Limão';
          }

          const key = nomeIng.charAt(0).toUpperCase() + nomeIng.slice(1).toLowerCase();
          const baseQ = Number(qtdIng) * drinksPorTipo;

          if (!agregInsumos[key]) {
            agregInsumos[key] = { qtd: 0, unidade: unIng };
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

  // Contagem de checados
  const total = items.length;
  const checked = items.filter(i => savedChecked[i.id]).length;

  return { items, total, checked };
}
