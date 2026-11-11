/**
 * lib/drinksRecipes.js
 * Fichas técnicas e dosagens padrão da coquetelaria profissional do Laboratório de Drinks.
 * Base calculada para 1 preparo (dose individual).
 */

export const DEFAULT_DRINK_RECIPES = {
  // --- Clássicos e Autorais ---
  caipirinha: [
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Limão', quantidade: '1', unidade: 'un' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
  ],
  mojito: [
    { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
    { insumo: 'Limão', quantidade: '1', unidade: 'un' },
    { insumo: 'Hortelã', quantidade: '8', unidade: 'un' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
    { insumo: 'Agua com Gás', quantidade: '120', unidade: 'ml' },
  ],
  margarita: [
    { insumo: 'Tequila Prata', quantidade: '50', unidade: 'ml' },
    { insumo: 'Licor Triple Sec', quantidade: '25', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '25', unidade: 'ml' },
    { insumo: 'Sal (borda)', quantidade: '2', unidade: 'g' },
  ],
  'pina-colada': [
    { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
    { insumo: 'Suco de Abacaxi', quantidade: '120', unidade: 'ml' },
    { insumo: 'Leite de Coco', quantidade: '50', unidade: 'ml' },
    { insumo: 'Leite Condensado', quantidade: '50', unidade: 'g' },
  ],
  'moscow-mule': [
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
    { insumo: 'Xarope de Gengibre', quantidade: '20', unidade: 'ml' },
    { insumo: 'Agua com Gás', quantidade: '100', unidade: 'ml' },
    { insumo: 'Espuma de Gengibre', quantidade: '60', unidade: 'ml' },
  ],
  negroni: [
    { insumo: 'Gin', quantidade: '30', unidade: 'ml' },
    { insumo: 'Campari', quantidade: '30', unidade: 'ml' },
    { insumo: 'Vermute Rosso', quantidade: '30', unidade: 'ml' },
    { insumo: 'Laranja', quantidade: '1', unidade: 'un' },
  ],
  'aperol-spritz': [
    { insumo: 'Aperol', quantidade: '50', unidade: 'ml' },
    { insumo: 'Espumante', quantidade: '100', unidade: 'ml' },
    { insumo: 'Agua com Gás', quantidade: '50', unidade: 'ml' },
    { insumo: 'Laranja', quantidade: '1', unidade: 'un' },
  ],
  cosmopolitan: [
    { insumo: 'Vodka', quantidade: '45', unidade: 'ml' },
    { insumo: 'Licor Triple Sec', quantidade: '15', unidade: 'ml' },
    { insumo: 'Suco de Cranberry', quantidade: '30', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '15', unidade: 'ml' },
  ],
  'gin-tonica': [
    { insumo: 'Gin', quantidade: '50', unidade: 'ml' },
    { insumo: 'Agua Tonica', quantidade: '200', unidade: 'ml' },
    { insumo: 'Limão', quantidade: '0.5', unidade: 'un' },
  ],
  'whisky-sour': [
    { insumo: 'Whisky Bourbon', quantidade: '50', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '25', unidade: 'ml' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
    { insumo: 'Angostura', quantidade: '2', unidade: 'un' },
  ],
  'sex-on-beach': [
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Licor de Pêssego', quantidade: '25', unidade: 'ml' },
    { insumo: 'Suco de Laranja', quantidade: '100', unidade: 'ml' },
    { insumo: 'Xarope Granadine', quantidade: '15', unidade: 'ml' },
  ],
  'blue-lagoon': [
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Curaçau Blue', quantidade: '25', unidade: 'ml' },
    { insumo: 'Limão', quantidade: '1', unidade: 'un' },
    { insumo: 'Sprite / Soda', quantidade: '100', unidade: 'ml' },
  ],
  'cuba-libre': [
    { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
    { insumo: 'Limão', quantidade: '1', unidade: 'un' },
    { insumo: 'Coca Cola', quantidade: '180', unidade: 'ml' },
  ],
  daiquiri: [
    { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '25', unidade: 'ml' },
    { insumo: 'Xarope de Açúcar', quantidade: '15', unidade: 'ml' },
  ],
  'espresso-martini': [
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Licor de Café', quantidade: '25', unidade: 'ml' },
    { insumo: 'Café Expresso', quantidade: '30', unidade: 'ml' },
    { insumo: 'Xarope de Açúcar', quantidade: '10', unidade: 'ml' },
  ],
  sangria: [
    { insumo: 'Vinho Tinto Seco', quantidade: '100', unidade: 'ml' },
    { insumo: 'Licor de Laranja / Brandy', quantidade: '20', unidade: 'ml' },
    { insumo: 'Agua com Gás / Soda', quantidade: '50', unidade: 'ml' },
    { insumo: 'Laranja', quantidade: '1', unidade: 'un' },
    { insumo: 'Açúcar Cristal', quantidade: '10', unidade: 'g' },
  ],
  'mai-tai': [
    { insumo: 'Rum', quantidade: '60', unidade: 'ml' },
    { insumo: 'Licor Triple Sec', quantidade: '15', unidade: 'ml' },
    { insumo: 'Xarope de Orgeat', quantidade: '15', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
  ],
  'tequila-sunrise': [
    { insumo: 'Tequila Prata', quantidade: '50', unidade: 'ml' },
    { insumo: 'Suco de Laranja', quantidade: '100', unidade: 'ml' },
    { insumo: 'Xarope Granadine', quantidade: '15', unidade: 'ml' },
  ],
  'old-fashioned': [
    { insumo: 'Whisky Bourbon', quantidade: '50', unidade: 'ml' },
    { insumo: 'Açúcar Cristal', quantidade: '5', unidade: 'g' },
    { insumo: 'Angostura', quantidade: '3', unidade: 'un' },
    { insumo: 'Laranja', quantidade: '1', unidade: 'un' },
  ],

  // --- Drinks Personalizados / IDs do Firebase ---
  'drink-1780007150182': [ // Piña Colada Sem Álcool
    { insumo: 'Suco de Abacaxi', quantidade: '150', unidade: 'ml' },
    { insumo: 'Leite de Coco', quantidade: '50', unidade: 'ml' },
    { insumo: 'Leite Condensado', quantidade: '50', unidade: 'g' },
  ],
  'drink-1780007268889': [ // Pink Limonade
    { insumo: 'Xarope Granadine', quantidade: '20', unidade: 'ml' },
    { insumo: 'Limão', quantidade: '1', unidade: 'un' },
    { insumo: 'Sprite', quantidade: '180', unidade: 'ml' },
  ],
  'drink-1780007393298': [ // Caipirinha de Morango
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Morango', quantidade: '80', unidade: 'g' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
  ],
  'drink-1780007529800': [ // Caipirinha de Morango Sem Álcool
    { insumo: 'Morango', quantidade: '80', unidade: 'g' },
    { insumo: 'Leite Condensado', quantidade: '50', unidade: 'g' },
    { insumo: 'Sprite', quantidade: '180', unidade: 'ml' },
  ],
  'drink-1782306800562': [ // Frozen de Morango
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Morango', quantidade: '100', unidade: 'g' },
    { insumo: 'Leite Condensado', quantidade: '40', unidade: 'g' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
  ],
  'drink-1782306801500': [ // Frozen Maracujá
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Polpa de Maracujá', quantidade: '60', unidade: 'g' },
    { insumo: 'Leite Condensado', quantidade: '40', unidade: 'g' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
  ],
  'drink-1782309988513': [ // Frozen Lagoa Azul
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Curaçau Blue', quantidade: '25', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
    { insumo: 'Sprite', quantidade: '80', unidade: 'ml' },
  ],
  'drink-1784650892108': [ // Caipirinha de Maracujá
    { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
    { insumo: 'Polpa de Maracujá', quantidade: '50', unidade: 'g' },
    { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
  ],
  'drink-1785880174358': [ // Fitzgerald
    { insumo: 'Gin', quantidade: '50', unidade: 'ml' },
    { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
    { insumo: 'Xarope de Açúcar', quantidade: '15', unidade: 'ml' },
    { insumo: 'Angostura', quantidade: '2', unidade: 'un' },
  ],
};

// Aliases para identificação por nome em linguagem natural
export const DRINK_NAME_ALIASES = {
  'fitzgerald': 'drink-1785880174358',
  'pink limonade': 'drink-1780007268889',
  'pink lemonade': 'drink-1780007268889',
  'caipirinha de morango': 'drink-1780007393298',
  'caipirinha de maracuja': 'drink-1784650892108',
  'caipirinha de maracujá': 'drink-1784650892108',
  'frozen de morango': 'drink-1782306800562',
  'frozen maracuja': 'drink-1782306801500',
  'frozen maracujá': 'drink-1782306801500',
  'frozen lagoa azul': 'drink-1782309988513',
  'pina colada': 'pina-colada',
  'piña colada': 'pina-colada',
};

/**
 * Sanitiza e normaliza itens de receita:
 * - Corrige limão em gramas para unidades (ex: 1 g -> 1 un)
 * - Corrige "Run" -> "Rum"
 * - Corrige "Poupa" -> "Polpa de Maracujá"
 * - Corrige "Angustura" e preenche quantidade de bitter vazia
 * - Preenche doses vazias (ex: licor de pêssego)
 * - Remove gelo em ml
 */
export function sanitizeRecipe(receita) {
  if (!receita || !Array.isArray(receita)) return [];
  return receita.map(item => {
    if (!item) return null;
    let insumo = (item.insumo || item.nome || item.name || '').trim();
    let quantidade = item.quantidade !== undefined && item.quantidade !== null ? String(item.quantidade).trim() : '';
    let unidade = (item.unidade || 'ml').trim().toLowerCase();

    if (!insumo) return null;

    // Normalizar nomes
    if (/^run$/i.test(insumo)) insumo = 'Rum';
    if (/^poupa\s+de\s+maracuj/i.test(insumo)) insumo = 'Polpa de Maracujá';
    if (/^angustura/i.test(insumo)) insumo = 'Angostura';
    if (/^xarope\s+de\s+a[cç][uú]car$/i.test(insumo)) insumo = 'Xarope de Açúcar';
    if (/^leite\s+de\s+coco$/i.test(insumo)) insumo = 'Leite de Coco';
    if (/^agua\s+com\s+g[aá]s$/i.test(insumo)) insumo = 'Agua com Gás';
    if (/^agua\s+t[oô]nica$/i.test(insumo)) insumo = 'Agua Tonica';
    if (/^cura[cç]a[uú]\s+blue$/i.test(insumo)) insumo = 'Curaçau Blue';
    if (/^suco\s+de\s+lim[aã]o$/i.test(insumo)) insumo = 'Suco de Limão';
    if (/^lim[aã]o$/i.test(insumo)) insumo = 'Limão';
    if (/^vodka$/i.test(insumo)) insumo = 'Vodka';
    if (/^gin$/i.test(insumo)) insumo = 'Gin';

    // Normalizar unidades erradas
    // Caso clássico: Limão com unidade 'g' (ex: 1 g de limão -> 1 un)
    if (insumo.toLowerCase() === 'limão' && unidade === 'g' && Number(quantidade) <= 3) {
      unidade = 'un';
    }

    // Caso de Angostura sem quantidade ou em ml
    if (insumo.toLowerCase().includes('angostura')) {
      if (!quantidade || Number(quantidade) <= 0) quantidade = '2';
      unidade = 'un';
    }

    // Caso de licor de pêssego vazio
    if (insumo.toLowerCase().includes('licor de pessego') && !quantidade) {
      quantidade = '25';
      unidade = 'ml';
    }

    // Remover gelo vazio ou em ml (gelo é insumo de bar em kg)
    if (insumo.toLowerCase() === 'gelo' && (!quantidade || unidade === 'ml')) {
      return null;
    }

    return { insumo, quantidade, unidade };
  }).filter(Boolean);
}

/**
 * Obtém a receita técnica padrão para um drink a partir de id, slug ou nome aproximado.
 */
export function getDefaultRecipeForDrink(identifier) {
  if (!identifier) return [];

  // Busca por id direto
  if (DEFAULT_DRINK_RECIPES[identifier]) {
    return DEFAULT_DRINK_RECIPES[identifier];
  }

  const rawKey = String(identifier).toLowerCase().trim();
  const aliasId = DRINK_NAME_ALIASES[rawKey];
  if (aliasId && DEFAULT_DRINK_RECIPES[aliasId]) {
    return DEFAULT_DRINK_RECIPES[aliasId];
  }

  const key = rawKey
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

  if (DEFAULT_DRINK_RECIPES[key]) {
    return DEFAULT_DRINK_RECIPES[key];
  }

  // Busca aproximada
  for (const [recipeKey, recipeList] of Object.entries(DEFAULT_DRINK_RECIPES)) {
    if (key.includes(recipeKey) || recipeKey.includes(key)) {
      return recipeList;
    }
  }

  return [];
}
