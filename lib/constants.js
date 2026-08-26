/**
 * lib/constants.js — Constantes e valores padrão compartilhados
 */

export const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: '#00E5FF' },
  { id: 'negociacao', title: 'Em Negociação', color: '#FFD54F' },
  { id: 'fechado', title: 'Fechado (Ganho)', color: '#4CAF50' },
  { id: 'realizado', title: 'Realizados', color: '#9E9E9E' },
  { id: 'perdido', title: 'Perdido', color: '#F44336' }
];

export const CUSTOS_CATEGORIAS_DEFAULT = [
  { id: 'insumos', label: 'Insumos / Bebidas', color: '#00E5FF', emoji: '🧃', order: 0 },
  { id: 'equipe', label: 'Mão de Obra / Equipe', color: '#FFD54F', emoji: '👥', order: 1 },
  { id: 'logistica', label: 'Logística / Transporte', color: '#FF8A65', emoji: '🚚', order: 2 },
  { id: 'descartaveis', label: 'Descartáveis / Copos', color: '#EF5350', emoji: '🥤', order: 3 },
  { id: 'outros', label: 'Outros / Diversos', color: '#a8b8aa', emoji: '✨', order: 4 }
];

export const EVENT_TYPE_COLORS = {
  'Casamento': '#E91E63',
  'Aniversário': '#FFD54F',
  'Formatura': '#4CAF50',
  'Corporativo': '#2196F3',
  'Confraternização': '#FF9800',
  'Chá Bar': '#CE93D8',
  'Debutante': '#F48FB1',
  'Outro': '#a8b8aa'
};

export const EVENT_TYPE_EMOJIS = {
  'Casamento': '💍',
  'Aniversário': '🎂',
  'Formatura': '🎓',
  'Corporativo': '🏢',
  'Confraternização': '🎉',
  'Chá Bar': '🍸',
  'Debutante': '👑',
  'Outro': '✨'
};

export const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];
