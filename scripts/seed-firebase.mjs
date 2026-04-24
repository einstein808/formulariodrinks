/**
 * Seed Firebase Realtime Database with initial config data.
 *
 * Usage:
 *   node scripts/seed-firebase.mjs
 *
 * Prerequisites:
 *   Temporarily set Firebase rules to allow writes on /config:
 *   "config": { ".read": true, ".write": true }
 *
 *   After seeding, change ".write" back to false.
 */

const DB_URL = 'https://formsbar-default-rtdb.firebaseio.com'

const config = {
  pacotes: {
    'mao-de-obra': {
      order: 0,
      name: 'Mão de Obra',
      emoji: '🍹',
      price: 'R$ 350',
      priceLabel: 'valor base',
      popular: false,
      features: [
        'Barman profissional',
        '5 horas de festa',
        'Deslocamento incluso',
        'Acessórios e espuma de gengibre',
        'Ajudante opcional (+R$150)',
      ],
    },
    standard: {
      order: 1,
      name: 'Standard',
      emoji: '🍸',
      price: 'R$ 30',
      priceLabel: 'por pessoa',
      popular: false,
      features: [
        '5 opções de drinks',
        'Drinks sem álcool',
        'Todos os ingredientes inclusos',
        'Bancada de bar',
        '1 Barman + 1 Ajudante',
        'Deslocamento incluso',
      ],
    },
    'standard-frozen': {
      order: 2,
      name: 'Standard + Frozen',
      emoji: '❄️',
      price: 'R$ 42',
      priceLabel: 'por pessoa',
      popular: true,
      features: [
        'Tudo do Standard',
        'Frozen Experience incluso',
        'Drinks sem álcool',
        'Todos os ingredientes inclusos',
        'Bancada de bar',
        '1 Barman + 1 Ajudante',
        'Deslocamento incluso',
      ],
    },
    premium: {
      order: 3,
      name: 'Premium',
      emoji: '🍸✨',
      price: 'R$ 40',
      priceLabel: 'por pessoa',
      popular: false,
      features: [
        '6 drinks personalizados',
        'Drink de boas-vindas + shots',
        'Tábua de shots inclusa',
        'Tags e copos personalizados',
        'Garrafinhas exclusivas',
        '1 Barman + 1 Ajudante uniformizados',
        'Deslocamento incluso',
      ],
    },
  },

  tiposEvento: {
    casamento: { order: 0, label: 'Casamento', icon: '💍' },
    aniversario: { order: 1, label: 'Aniversário', icon: '🎂' },
    corporativo: { order: 2, label: 'Corporativo', icon: '🏢' },
    formatura: { order: 3, label: 'Formatura', icon: '🎓' },
    confraternizacao: { order: 4, label: 'Confraternização', icon: '🎉' },
    'cha-bar': { order: 5, label: 'Chá Bar', icon: '🍸' },
    debutante: { order: 6, label: 'Debutante', icon: '👑' },
    outro: { order: 7, label: 'Outro', icon: '✨' },
  },

  tiposDrinks: {
    classicos: { order: 0, label: 'Clássicos', icon: '🍸' },
    tropicais: { order: 1, label: 'Tropicais', icon: '🌴' },
    autorais: { order: 2, label: 'Autorais', icon: '🎨' },
    'sem-alcool': { order: 3, label: 'Sem Álcool', icon: '🧃' },
    shots: { order: 4, label: 'Shots', icon: '🥃' },
    gin: { order: 5, label: 'Gin', icon: '🫒' },
  },

  drinksMenu: {
    caipirinha: { order: 0, name: 'Caipirinha', emoji: '🍋', image: '/drinks/caipirinha.jpg' },
    mojito: { order: 1, name: 'Mojito', emoji: '🌿', image: '/drinks/mojito.jpg' },
    margarita: { order: 2, name: 'Margarita', emoji: '🍊', image: '/drinks/margarita.jpg' },
    'pina-colada': { order: 3, name: 'Piña Colada', emoji: '🥥', image: '/drinks/pina-colada.jpg' },
    'moscow-mule': { order: 4, name: 'Moscow Mule', emoji: '🫚', image: '/drinks/moscow-mule.jpg' },
    negroni: { order: 5, name: 'Negroni', emoji: '🍷', image: '/drinks/negroni.jpg' },
    'aperol-spritz': { order: 6, name: 'Aperol Spritz', emoji: '🧡', image: '/drinks/aperol-spritz.jpg' },
    cosmopolitan: { order: 7, name: 'Cosmopolitan', emoji: '🍹', image: '/drinks/cosmopolitan.jpg' },
    'gin-tonica': { order: 8, name: 'Gin Tônica', emoji: '🫒', image: '/drinks/gin-tonica.jpg' },
    'whisky-sour': { order: 9, name: 'Whisky Sour', emoji: '🥃', image: '/drinks/whisky-sour.jpg' },
    'sex-on-beach': { order: 10, name: 'Sex on the Beach', emoji: '🏖️', image: '/drinks/sex-on-beach.jpg' },
    'blue-lagoon': { order: 11, name: 'Blue Lagoon', emoji: '💙', image: '/drinks/blue-lagoon.jpg' },
    'long-island': { order: 12, name: 'Long Island', emoji: '🏝️', image: '/drinks/long-island.jpg' },
    'cuba-libre': { order: 13, name: 'Cuba Libre', emoji: '🇨🇺', image: '/drinks/cuba-libre.jpg' },
    daiquiri: { order: 14, name: 'Daiquiri', emoji: '🍓', image: '/drinks/daiquiri.jpg' },
    'espresso-martini': { order: 15, name: 'Espresso Martini', emoji: '☕', image: '/drinks/espresso-martini.jpg' },
    sangria: { order: 16, name: 'Sangria', emoji: '🍇', image: '/drinks/sangria.jpg' },
    'mai-tai': { order: 17, name: 'Mai Tai', emoji: '🌺', image: '/drinks/mai-tai.jpg' },
    'tequila-sunrise': { order: 18, name: 'Tequila Sunrise', emoji: '🌅', image: '/drinks/tequila-sunrise.jpg' },
    'old-fashioned': { order: 19, name: 'Old Fashioned', emoji: '🎩', image: '/drinks/old-fashioned.jpg' },
  },

  cidades: [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília',
    'Curitiba', 'Porto Alegre', 'Salvador', 'Recife',
    'Fortaleza', 'Goiânia', 'Campinas', 'Manaus', 'Outra',
  ],

  maxDrinks: 5,
}

async function seed() {
  console.log('🔥 Seeding Firebase config...')

  const res = await fetch(`${DB_URL}/config.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('❌ Falha ao enviar:', err)
    process.exit(1)
  }

  console.log('✅ Config salva com sucesso!')
  console.log('')
  console.log('📋 Agora atualize as regras do Firebase para:')
  console.log(JSON.stringify({
    rules: {
      leads: { '.read': false, '.write': 'auth != null' },
      config: { '.read': true, '.write': false },
    },
  }, null, 2))
}

seed()
