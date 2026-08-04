/**
 * pricingUtils.js — Utilidade centralizada de cálculo de preço
 * 
 * Suporta dois modos de precificação:
 *   - "person": preço por convidado (modelo atual)
 *   - "tier": preço fixo por faixa de convidados (novo modelo)
 * 
 * Quando um pacote não define pricingMode, assume "person" (retrocompatível).
 */

/**
 * Encontra a faixa de preço correta para o número de convidados.
 * @param {Array} priceTiers - Array de { minGuests, maxGuests, fixedPrice, extraHourPrice }
 * @param {number} guestCount - Número de convidados
 * @returns {object|null} A faixa correspondente ou null se não encontrar
 */
export function findTier(priceTiers, guestCount) {
  if (!priceTiers || !Array.isArray(priceTiers) || priceTiers.length === 0) return null;
  
  // Ordenar por minGuests
  const sorted = [...priceTiers].sort((a, b) => (a.minGuests || 0) - (b.minGuests || 0));
  
  // Procurar faixa exata
  for (const tier of sorted) {
    if (guestCount >= (tier.minGuests || 0) && guestCount <= (tier.maxGuests || Infinity)) {
      return tier;
    }
  }
  
  // Se estiver acima de todas as faixas, usar a última (mais alta)
  if (guestCount > (sorted[sorted.length - 1].maxGuests || 0)) {
    return sorted[sorted.length - 1];
  }
  
  // Se estiver abaixo de todas as faixas, usar a primeira (mais baixa)
  return sorted[0];
}

/**
 * Calcula o preço de um pacote dado o número de convidados e duração.
 * 
 * @param {object} pacote - O pacote do Firebase (com pricingMode, priceTiers, price, etc.)
 * @param {number} guestCount - Número de convidados
 * @param {number} duration - Duração total do evento em horas
 * @param {object} options - Opções adicionais
 * @param {boolean} options.upsellFrozen - Se o upsell Frozen está ativo
 * @param {string} options.abGroup - Grupo A/B do lead ("A" ou "B")
 * @returns {object} { finalPrice, tierLabel, basePrice, extraHourTotal, frozenTotal, isPerPerson, isTier, tier }
 */
export function calculatePackagePrice(pacote, guestCount, duration, options = {}) {
  const { upsellFrozen = false, abGroup = 'A' } = options;
  
  // Determinar preço base (A/B testing)
  const isGroupB = abGroup === 'B';
  const rawPrice = (isGroupB && pacote?.priceB && pacote.priceB.trim() !== '') 
    ? pacote.priceB 
    : (pacote?.price || '');
  
  const numericPrice = parseFloat(rawPrice.replace(/[^\d,.]/g, '').replace(',', '.')) || 0;
  
  // Detectar modo de precificação com A/B testing:
  // Grupo A: Preço por convidado (linear)
  // Grupo B: Preço por faixas (fixo)
  const pricingMode = pacote?.pricingMode || 'person';
  
  // Se o pacote tem faixas, usamos faixas se pricingMode === 'tier' ou se abGroup === 'B'
  // Se abGroup === 'A', mantemos o modo por pessoa (linear)
  const isTier = (isGroupB || pricingMode === 'tier') && abGroup !== 'A' && pacote?.priceTiers && pacote.priceTiers.length > 0;
  
  // Detectar se é por pessoa (modelo legacy)
  const label = (pacote?.priceLabel || '').toLowerCase();
  const isPerPerson = label.includes('pessoa') || label.includes('convidado') || label.includes('pax') || label.includes('/convidado');
  
  // Horas adicionais (limite contratual fixo em 5 horas)
  const hoursLimit = 5;
  const totalHours = parseInt(duration || 5, 10);
  const additionalHours = Math.max(0, totalHours - hoursLimit);
  
  let basePrice = 0;
  let extraHourTotal = 0;
  let frozenTotal = 0;
  let tierLabel = '';
  let tier = null;
  const convidados = Math.max(guestCount || 40, 40);
  
  if (isTier) {
    // === MODO FAIXA (Grupo B) ===
    tier = findTier(pacote.priceTiers, convidados);
    
    if (tier) {
      basePrice = parseFloat(tier.fixedPrice) || 0;
      tierLabel = (tier.minGuests <= 30 && tier.maxGuests === 50) 
        ? `Até ${tier.maxGuests} convidados` 
        : `${tier.minGuests}–${tier.maxGuests} convidados`;
      
      // Hora extra fixa por faixa
      const tierExtraHourRate = parseFloat(tier.extraHourPrice) || 0;
      extraHourTotal = additionalHours * tierExtraHourRate;
      
      // Frozen upsell fixo por faixa
      if (upsellFrozen) {
        frozenTotal = parseFloat(pacote.frozenTierPrice) || 0;
      }
    }
  } else if (isPerPerson) {
    // === MODO POR PESSOA (legado) ===
    let pricePerGuest = numericPrice;
    const extraHourRate = (pacote?.name || '').toLowerCase().includes('premium') ? 7 : 5;
    
    extraHourTotal = additionalHours * extraHourRate * convidados;
    basePrice = pricePerGuest * convidados;
    
    // Frozen upsell por pessoa
    if (upsellFrozen) {
      const packageId = pacote?.id || (pacote?.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "");
      if (packageId !== 'standard-frozen') {
        frozenTotal = 10 * convidados;
      }
    }
  } else {
    // === MODO FIXO (Mão de Obra, etc.) ===
    basePrice = numericPrice;
    
    if (upsellFrozen) {
      frozenTotal = 250;
    }
  }
  
  const finalPrice = basePrice + extraHourTotal + frozenTotal;
  
  return {
    finalPrice,
    basePrice,
    extraHourTotal,
    frozenTotal,
    tierLabel,
    tier,
    isPerPerson: !isTier && isPerPerson,
    isTier,
    additionalHours,
  };
}

/**
 * Retorna o preço mínimo entre todas as faixas (para exibição "A partir de R$ X").
 * @param {object} pacote - O pacote com priceTiers
 * @returns {number} O menor fixedPrice entre as faixas
 */
export function getMinTierPrice(pacote) {
  if (!pacote?.priceTiers || pacote.priceTiers.length === 0) return 0;
  return Math.min(...pacote.priceTiers.map(t => parseFloat(t.fixedPrice) || 0));
}
