/**
 * lib/utils.js — Funções utilitárias centralizadas para todo o projeto
 */

/**
 * Converte um objeto do Firebase ({ id1: {...}, id2: {...} }) em array ordenado por order ou timestamp.
 * @param {Object|null|undefined} obj 
 * @returns {Array}
 */
export function firebaseObjToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([id, val]) => (typeof val === 'object' && val !== null ? { id, ...val } : { id, val }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Converte um array de objetos [{ id, ...rest }] em objeto indexado por id para salvar no Firebase.
 * @param {Array} arr 
 * @returns {Object}
 */
export function arrayToFirebaseObj(arr) {
  if (!Array.isArray(arr)) return {};
  const obj = {};
  arr.forEach(item => {
    if (!item) return;
    const { id, ...rest } = item;
    if (id) {
      obj[id] = rest;
    }
  });
  return obj;
}

/**
 * Formata número de telefone brasileiro (DDD) 99999-9999 ou (DDD) 9999-9999.
 * @param {string} value 
 * @returns {string}
 */
export function formatPhone(value) {
  if (!value) return '';
  let v = String(value).replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 7) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

/**
 * Limpa e formata número de telefone para envio no WhatsApp (DDI 55 + DDD + Número).
 * @param {string} phone 
 * @returns {string}
 */
export function cleanPhoneForWhatsApp(phone) {
  if (!phone) return '';
  let number = String(phone).replace(/\D/g, '');
  if (number.length === 10 || number.length === 11) {
    number = '55' + number;
  }
  return number;
}

/**
 * Formata valores numéricos para moeda brasileira BRL (R$ 1.234,56).
 * @param {number|string} value 
 * @returns {string}
 */
export function formatCurrency(value) {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

/**
 * Transforma texto em slug amigável (sem acentos, minúsculo, hífens).
 * @param {string} text 
 * @returns {string}
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

/**
 * Calcula o valor total de um item de custo (quantidade * valorUnitario ou valor fixo).
 * @param {Object} c 
 * @returns {number}
 */
export function getCustoValor(c) {
  if (!c) return 0;
  const q = parseFloat(c.quantidade) || 0;
  const u = parseFloat(c.valorUnitario) || 0;
  if (q > 0 && u > 0) return q * u;
  return parseFloat(c.valor) || 0;
}

/**
 * Calcula recomendação padrão de barmen e ajudantes baseado no número de convidados.
 * @param {number|string} guestsCount 
 * @returns {{ barmans: number, ajudantes: number }}
 */
export function getRecommendation(guestsCount) {
  const qty = parseInt(guestsCount || 0, 10);
  if (qty <= 0) return { barmans: 1, ajudantes: 0 };
  if (qty <= 60) return { barmans: 1, ajudantes: 1 };
  if (qty <= 100) return { barmans: 2, ajudantes: 0 };
  
  const extras = qty - 100;
  const staffExtra = Math.ceil(extras / 40);
  const barmans = 2 + Math.floor(staffExtra / 2);
  const ajudantes = Math.ceil(staffExtra / 2);
  return { barmans, ajudantes };
}

/**
 * Detecta a categoria de custo baseado na descrição.
 * @param {string} desc 
 * @returns {string}
 */
export function detectCategoryByDescription(desc) {
  const normalized = (desc || '').toLowerCase().trim();
  if (
    normalized.includes('barman') || 
    normalized.includes('ajudante') || 
    normalized.includes('equipe') || 
    normalized.includes('garçom') || 
    normalized.includes('staff')
  ) {
    return 'equipe';
  }
  if (
    normalized.includes('transporte') || 
    normalized.includes('carreto') || 
    normalized.includes('logistica') || 
    normalized.includes('logística') || 
    normalized.includes('combustivel') || 
    normalized.includes('combustível') || 
    normalized.includes('viagem') || 
    normalized.includes('frete')
  ) {
    return 'logistica';
  }
  if (
    normalized.includes('copo') || 
    normalized.includes('canudo') || 
    normalized.includes('guardanapo') || 
    normalized.includes('descartavel') || 
    normalized.includes('descartáveis')
  ) {
    return 'descartaveis';
  }
  if (
    normalized.includes('gelo') || 
    normalized.includes('fruta') || 
    normalized.includes('bebida') || 
    normalized.includes('vodka') || 
    normalized.includes('gin') || 
    normalized.includes('insumo') || 
    normalized.includes('suco') || 
    normalized.includes('xarope') || 
    normalized.includes('gengibre') || 
    normalized.includes('limao') || 
    normalized.includes('limão')
  ) {
    return 'insumos';
  }
  return 'outros';
}

/**
 * Faz parse de datas criadoEm (compatível com números, timestamps ISO e strings numéricas).
 * @param {string|number} val 
 * @returns {Date|null}
 */
export function parseCriadoEm(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date(val);
  }
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) {
      return new Date(parseInt(val, 10));
    }
    return new Date(val);
  }
  return null;
}
