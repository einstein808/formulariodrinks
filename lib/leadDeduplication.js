const STATUS_PRIORITY = {
  realizado: 5,
  fechado: 4,
  negociacao: 3,
  novo: 2,
  perdido: 1,
};

export function normalizeLeadPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits;
}

export function getLeadEventIdentity(lead) {
  const phone = normalizeLeadPhone(lead?.telefone || lead?.whatsapp);
  const date = String(lead?.dataEvento || '').slice(0, 10);
  if (phone.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return `${phone}|${date}`;
}

export function isMergedLead(lead) {
  return Boolean(lead?.mergedInto);
}

export function findLeadDuplicateGroups(leads = []) {
  const byIdentity = new Map();
  leads.forEach(lead => {
    if (lead?.mergedInto) return;
    const identity = getLeadEventIdentity(lead);
    if (!identity) return;
    const group = byIdentity.get(identity) || [];
    group.push(lead);
    byIdentity.set(identity, group);
  });
  return [...byIdentity.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([identity, group]) => ({ identity, leads: group }));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeValue(primaryValue, secondaryValue) {
  if (primaryValue === undefined || primaryValue === null || primaryValue === '') return secondaryValue;
  if (secondaryValue === undefined || secondaryValue === null || secondaryValue === '') return primaryValue;

  if (Array.isArray(primaryValue) && Array.isArray(secondaryValue)) {
    return primaryValue.length ? primaryValue : secondaryValue;
  }

  if (isPlainObject(primaryValue) && isPlainObject(secondaryValue)) {
    const merged = { ...secondaryValue, ...primaryValue };
    Object.keys(secondaryValue).forEach(key => {
      merged[key] = mergeValue(primaryValue[key], secondaryValue[key]);
    });
    return merged;
  }

  return primaryValue;
}

function leadPriority(lead) {
  const fields = ['nome', 'sobrenome', 'telefone', 'email', 'dataEvento', 'horarioEvento', 'cidade', 'tipoEvento', 'pacote', 'convidados'];
  const completeness = fields.reduce((total, key) => total + (lead?.[key] ? 1 : 0), 0);
  return (STATUS_PRIORITY[lead?.status] || 0) * 100 + completeness;
}

export function choosePrimaryLead(leads = []) {
  return [...leads].sort((a, b) => {
    const priorityDiff = leadPriority(b) - leadPriority(a);
    if (priorityDiff) return priorityDiff;
    return new Date(a.criadoEm || 0).getTime() - new Date(b.criadoEm || 0).getTime();
  })[0] || null;
}

export function mergeLeadData(primary, secondary) {
  const merged = mergeValue(primary || {}, secondary || {});
  delete merged.id;
  delete merged.mergedInto;
  delete merged.mergedAt;
  return merged;
}
