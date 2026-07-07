const BASE_URL = 'https://laboratorio.gabryelamaro.com';

export default async function sitemap() {
  // Static pages with their priorities
  const staticPages = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/orcamento`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/galeria`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/avaliacoes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/perguntas`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Dynamic event type pages
  const eventTypes = [
    'casamento',
    'aniversario',
    'corporativo',
    'formatura',
    'confraternizacao',
    'cha-bar',
    'debutante',
  ];

  const eventPages = eventTypes.map((type) => ({
    url: `${BASE_URL}/eventos/${type}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticPages, ...eventPages];
}
