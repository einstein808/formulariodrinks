/**
 * scripts/update-drinks-recipes.mjs
 * Atualiza todas as fichas técnicas dos drinks no Firebase Realtime Database
 * com as dosagens completas de insumos (ml, g, un).
 *
 * Uso:
 *   node scripts/update-drinks-recipes.mjs
 */

import { DEFAULT_DRINK_RECIPES } from '../lib/drinksRecipes.js';

const DB_URL = 'https://formsbar-default-rtdb.firebaseio.com';

async function updateDrinksRecipes() {
  console.log('🔄 Buscando drinks atuais no Firebase Realtime Database...');

  try {
    const getRes = await fetch(`${DB_URL}/config/drinksMenu.json`);
    if (!getRes.ok) {
      throw new Error(`Erro ao buscar drinks: ${getRes.status} ${getRes.statusText}`);
    }

    const currentDrinks = (await getRes.json()) || {};
    const updatedDrinks = { ...currentDrinks };

    let countUpdated = 0;

    for (const [slug, recipe] of Object.entries(DEFAULT_DRINK_RECIPES)) {
      if (updatedDrinks[slug]) {
        updatedDrinks[slug] = {
          ...updatedDrinks[slug],
          receita: recipe,
        };
        countUpdated++;
      } else {
        // Se o drink ainda não constar no banco, cadastra estrutura base
        const cleanName = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        updatedDrinks[slug] = {
          id: slug,
          name: cleanName,
          category: 'alcool',
          order: 99,
          receita: recipe,
        };
        countUpdated++;
      }
    }

    console.log(`📤 Enviando atualização de ${countUpdated} fichas técnicas para o Firebase...`);

    const putRes = await fetch(`${DB_URL}/config/drinksMenu.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedDrinks),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Falha ao salvar no Firebase: ${errText}`);
    }

    console.log('✅ Todas as fichas técnicas de drinks foram atualizadas com sucesso no Firebase!');
  } catch (error) {
    console.error('❌ Erro na execução:', error.message);
    process.exit(1);
  }
}

updateDrinksRecipes();
