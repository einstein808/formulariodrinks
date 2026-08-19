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
export const DEFAULT_MAO_DE_OBRA_TIERS = [
  { minGuests: 30, maxGuests: 50, fixedPrice: 520, extraHourPrice: 110 },
  { minGuests: 51, maxGuests: 80, fixedPrice: 700, extraHourPrice: 140 },
  { minGuests: 81, maxGuests: 120, fixedPrice: 1050, extraHourPrice: 180 },
  { minGuests: 121, maxGuests: 200, fixedPrice: 1500, extraHourPrice: 250 }
];

export function calculatePackagePrice(pacote, guestCount, duration, options = {}) {
  const { upsellFrozen = false, abGroup = 'A' } = options;
  
  // Determinar preço base (A/B testing)
  const isGroupB = abGroup === 'B';
  const rawPrice = (isGroupB && pacote?.priceB && pacote.priceB.trim() !== '') 
    ? pacote.priceB 
    : (pacote?.price || '');
  
  const numericPrice = parseFloat(rawPrice.replace(/[^\d,.]/g, '').replace(',', '.')) || 0;
  
  // Identificar se é pacote de mão de obra
  const nameLower = (pacote?.name || '').toLowerCase();
  const idLower = (pacote?.id || '').toLowerCase();
  const isMaoDeObra = nameLower.includes('obra') || idLower.includes('obra');
  
  const pricingMode = pacote?.pricingMode || (isMaoDeObra ? 'tier' : 'person');
  
  // Mão de Obra é SEMPRE por faixas de preço fixo (30-50: R$520, 51-80: R$700, 81-120: R$1050, 121-200: R$1500)
  const effectiveTiers = (pacote?.priceTiers && Array.isArray(pacote.priceTiers) && pacote.priceTiers.length > 0)
    ? pacote.priceTiers
    : (isMaoDeObra ? DEFAULT_MAO_DE_OBRA_TIERS : null);

  const hasTiers = effectiveTiers && effectiveTiers.length > 0;
  const isTier = hasTiers && (isGroupB || pricingMode === 'tier' || isMaoDeObra);
  
  // Detectar se é por pessoa (somente se não for tier, não for mão de obra e pricingMode for 'person')
  const label = (pacote?.priceLabel || '').toLowerCase();
  const isPerPerson = !isTier && !isMaoDeObra && (pricingMode === 'person') && (label.includes('pessoa') || label.includes('convidado') || label.includes('pax') || label.includes('/convidado'));
  
  // Horas adicionais (limite contratual fixo em 5 horas)
  const hoursLimit = parseInt(pacote?.hoursLimit || 5, 10);
  const totalHours = parseInt(duration || 5, 10);
  const additionalHours = Math.max(0, totalHours - hoursLimit);
  
  let basePrice = 0;
  let extraHourTotal = 0;
  let frozenTotal = 0;
  let tierLabel = '';
  let tier = null;
  const convidados = Math.max(guestCount || 40, 40);
  
  if (isTier) {
    // === MODO FAIXA (Grupo B ou Mão de Obra por faixas em A/B) ===
    tier = findTier(effectiveTiers, convidados);
    
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
        frozenTotal = parseFloat(pacote.frozenTierPrice) || 250;
      }
    }
  } else if (isPerPerson) {
    // === MODO POR PESSOA (Grupo A linear) ===
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
    // === MODO FIXO (Mão de Obra valor fixo em A e B, etc.) ===
    basePrice = numericPrice;
    const extraHourRate = parseFloat(pacote?.extraHourPrice) || 70;
    extraHourTotal = additionalHours * extraHourRate;
    
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
    isPerPerson,
    isTier,
    isMaoDeObra,
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
