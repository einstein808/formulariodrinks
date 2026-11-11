/**
 * scripts/fix-all-live-drinks.mjs
 * Corrige todos os erros de unidades, grafia, quantidades vazias e drinks sem receita
 * diretamente no Firebase Realtime Database.
 */

const DB_URL = 'https://formsbar-default-rtdb.firebaseio.com';

async function fixAllDrinks() {
  console.log('🔄 Baixando drinksMenu atual do Firebase...');
  const res = await fetch(`${DB_URL}/config/drinksMenu.json`);
  if (!res.ok) {
    throw new Error(`Falha ao obter drinks: ${res.status} ${res.statusText}`);
  }

  const drinks = await res.json();
  if (!drinks) {
    throw new Error('Nenhum drink retornado do Firebase.');
  }

  console.log(`📋 Total de drinks encontrados: ${Object.keys(drinks).length}`);

  // 1. Blue Lagoon: Limão 1g -> 1 un, padronizar nomes
  if (drinks['blue-lagoon']) {
    drinks['blue-lagoon'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Curaçau Blue', quantidade: '25', unidade: 'ml' },
      { insumo: 'Limão', quantidade: '1', unidade: 'un' },
      { insumo: 'Sprite / Soda', quantidade: '100', unidade: 'ml' },
    ];
  }

  // 2. Sex on the Beach: licor de pêssego vazio -> 25 ml, suco e grenadine
  if (drinks['sex-on-beach']) {
    drinks['sex-on-beach'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Licor de Pêssego', quantidade: '25', unidade: 'ml' },
      { insumo: 'Suco de Laranja', quantidade: '100', unidade: 'ml' },
      { insumo: 'Xarope Granadine', quantidade: '15', unidade: 'ml' },
    ];
  }

  // 3. Fitzgerald: Angostura sem quantidade -> 2 un (gotas), remover gelo vazio, adicionar xarope balanceador
  if (drinks['drink-1785880174358']) {
    drinks['drink-1785880174358'].receita = [
      { insumo: 'Gin', quantidade: '50', unidade: 'ml' },
      { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
      { insumo: 'Xarope de Açúcar', quantidade: '15', unidade: 'ml' },
      { insumo: 'Angostura', quantidade: '2', unidade: 'un' },
    ];
  }

  // 4. Pink Limonade: Limão 1.3 un -> 1 un
  if (drinks['drink-1780007268889']) {
    drinks['drink-1780007268889'].receita = [
      { insumo: 'Xarope Granadine', quantidade: '20', unidade: 'ml' },
      { insumo: 'Limão', quantidade: '1', unidade: 'un' },
      { insumo: 'Sprite', quantidade: '180', unidade: 'ml' },
    ];
  }

  // 5. Caipirinha de Maracujá: Poupa -> Polpa de Maracujá
  if (drinks['drink-1784650892108']) {
    drinks['drink-1784650892108'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Polpa de Maracujá', quantidade: '50', unidade: 'g' },
      { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
    ];
  }

  // 6. Cuba Libre: Run -> Rum
  if (drinks['cuba-libre']) {
    drinks['cuba-libre'].receita = [
      { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
      { insumo: 'Limão', quantidade: '1', unidade: 'un' },
      { insumo: 'Coca Cola', quantidade: '180', unidade: 'ml' },
    ];
  }

  // 7. Mojito: Run -> Rum, Hortelã em un, Água com Gás ajustada
  if (drinks['mojito']) {
    drinks['mojito'].receita = [
      { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
      { insumo: 'Limão', quantidade: '1', unidade: 'un' },
      { insumo: 'Hortelã', quantidade: '8', unidade: 'un' },
      { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
      { insumo: 'Agua com Gás', quantidade: '120', unidade: 'ml' },
    ];
  }

  // 8. Piña Colada (com e sem álcool): Rum sem espaço
  if (drinks['pina-colada']) {
    drinks['pina-colada'].receita = [
      { insumo: 'Rum', quantidade: '50', unidade: 'ml' },
      { insumo: 'Suco de Abacaxi', quantidade: '120', unidade: 'ml' },
      { insumo: 'Leite de Coco', quantidade: '50', unidade: 'ml' },
      { insumo: 'Leite Condensado', quantidade: '50', unidade: 'g' },
    ];
  }
  if (drinks['drink-1780007150182']) {
    drinks['drink-1780007150182'].receita = [
      { insumo: 'Suco de Abacaxi', quantidade: '150', unidade: 'ml' },
      { insumo: 'Leite de Coco', quantidade: '50', unidade: 'ml' },
      { insumo: 'Leite Condensado', quantidade: '50', unidade: 'g' },
    ];
  }

  // 9. Moscow Mule: padronizar Suco de Limão e adicionar Espuma de Gengibre
  if (drinks['moscow-mule']) {
    drinks['moscow-mule'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
      { insumo: 'Xarope de Gengibre', quantidade: '20', unidade: 'ml' },
      { insumo: 'Agua com Gás', quantidade: '100', unidade: 'ml' },
      { insumo: 'Espuma de Gengibre', quantidade: '60', unidade: 'ml' },
    ];
  }

  // 10. Aperol Spritz: padronizar com fatia de laranja
  if (drinks['aperol-spritz']) {
    drinks['aperol-spritz'].receita = [
      { insumo: 'Aperol', quantidade: '50', unidade: 'ml' },
      { insumo: 'Espumante', quantidade: '100', unidade: 'ml' },
      { insumo: 'Agua com Gás', quantidade: '50', unidade: 'ml' },
      { insumo: 'Laranja', quantidade: '1', unidade: 'un' },
    ];
  }

  // 11. Negroni: padronizar com fatia de laranja
  if (drinks['negroni']) {
    drinks['negroni'].receita = [
      { insumo: 'Gin', quantidade: '30', unidade: 'ml' },
      { insumo: 'Campari', quantidade: '30', unidade: 'ml' },
      { insumo: 'Vermute Rosso', quantidade: '30', unidade: 'ml' },
      { insumo: 'Laranja', quantidade: '1', unidade: 'un' },
    ];
  }

  // 12. Caipirinhas de Morango: padronizar Morango
  if (drinks['drink-1780007393298']) {
    drinks['drink-1780007393298'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Morango', quantidade: '80', unidade: 'g' },
      { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
    ];
  }
  if (drinks['drink-1780007529800']) {
    drinks['drink-1780007529800'].receita = [
      { insumo: 'Morango', quantidade: '80', unidade: 'g' },
      { insumo: 'Leite Condensado', quantidade: '50', unidade: 'g' },
      { insumo: 'Sprite', quantidade: '180', unidade: 'ml' },
    ];
  }

  // 13. Frozens: ADICIONAR RECEITAS TÉCNICAS COMPLETAS
  if (drinks['drink-1782306800562']) { // Frozen de morango
    drinks['drink-1782306800562'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Morango', quantidade: '100', unidade: 'g' },
      { insumo: 'Leite Condensado', quantidade: '40', unidade: 'g' },
      { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
    ];
  }

  if (drinks['drink-1782306801500']) { // Frozen Maracujá
    drinks['drink-1782306801500'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Polpa de Maracujá', quantidade: '60', unidade: 'g' },
      { insumo: 'Leite Condensado', quantidade: '40', unidade: 'g' },
      { insumo: 'Xarope de Açúcar', quantidade: '20', unidade: 'ml' },
    ];
  }

  if (drinks['drink-1782309988513']) { // Frozen Lagoa Azul
    drinks['drink-1782309988513'].receita = [
      { insumo: 'Vodka', quantidade: '50', unidade: 'ml' },
      { insumo: 'Curaçau Blue', quantidade: '25', unidade: 'ml' },
      { insumo: 'Suco de Limão', quantidade: '20', unidade: 'ml' },
      { insumo: 'Sprite', quantidade: '80', unidade: 'ml' },
    ];
  }

  console.log('📤 Enviando correções completas para o Firebase...');
  const putRes = await fetch(`${DB_URL}/config/drinksMenu.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drinks),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`Erro ao salvar no Firebase: ${err}`);
  }

  console.log('✅ SUCESSO: Todos os drinks e fichas foram corrigidos e salvos no Firebase!');
}

fixAllDrinks().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
