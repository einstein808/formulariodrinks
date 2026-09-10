import HomeClient from './HomeClient';

export const metadata = {
  title: 'Laboratório de Drinks — Bar para festas de 30 a 150 convidados em Juiz de Fora',
  description: 'Bar profissional para festas de 30 a 150 convidados em Juiz de Fora e região. Coquetelaria de verdade, frutas frescas e atendimento ágil. Calcule seu orçamento em menos de 1 minuto.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com',
  },
  openGraph: {
    title: 'Coquetelaria de verdade para o seu evento, sem exageros no orçamento.',
    description: 'Bar profissional para festas de 30 a 150 convidados em Juiz de Fora e região. Drinks bem preparados, atendimento ágil e orçamento em menos de 1 minuto.',
    url: 'https://laboratorio.gabryelamaro.com',
    type: 'website',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/og-image.jpg',
        width: 1024,
        height: 768,
        alt: 'Laboratório de Drinks — Um bar de qualidade para sua festa em Juiz de Fora',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coquetelaria de verdade para o seu evento, sem exageros no orçamento.',
    description: 'Bar profissional para festas de 30 a 150 convidados em Juiz de Fora. Coquetelaria artesanal, frutas frescas e atendimento ágil. Orçamento em 1 minuto.',
    images: ['https://laboratorio.gabryelamaro.com/og-image.jpg'],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodService",
  "name": "Laboratório de Drinks",
  "image": "https://laboratorio.gabryelamaro.com/logo.webp",
  "description": "Bar móvel de coquetelaria para mini weddings, casamentos, aniversários e confraternizações em Juiz de Fora e região. Drinks com frutas frescas e atendimento profissional com orçamento transparente.",
  "url": "https://laboratorio.gabryelamaro.com",
  "telephone": "+5532998696519",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Juiz de Fora",
    "addressRegion": "MG",
    "addressCountry": "BR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -21.7642,
    "longitude": -43.3497
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "reviewCount": "24",
    "bestRating": "5",
    "worstRating": "5"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Serviços de Bar para Eventos",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Bar para Mini Weddings e Casamentos",
          "description": "Serviço de bar móvel elegante e sob medida para mini weddings e casamentos intimistas de 30 a 120 convidados."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Bar para Festas e Aniversários",
          "description": "Drinks clássicos e autorais preparados na hora para aniversários, comemorações e festas privadas."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Bar para Eventos Corporativos e Confraternizações",
          "description": "Estrutura de bar compacta e pontualidade executiva para empresas e confraternizações em Juiz de Fora."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Mão de Obra de Barmen Profissionais",
          "description": "Contratação exclusiva de barmen qualificados e kit de coquetelaria para quem já comprou as bebidas."
        }
      }
    ]
  },
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": -21.7642,
      "longitude": -43.3497
    },
    "geoRadius": "150000"
  },
  "sameAs": []
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* SEO: Static content visible to search engines and AI crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>Laboratório de Drinks - Bar de Qualidade para Festas e Mini Weddings em Juiz de Fora</h1>
        <p>
          O Laboratório de Drinks oferece serviço de bar móvel e coquetelaria sob medida para casamentos, 
          mini weddings, aniversários, confraternizações e eventos em Juiz de Fora e toda a Zona da Mata Mineira. 
          Nossa proposta é entregar drinks de qualidade e atendimento profissional sem cobrar preços abusivos, 
          adequando a operação ao tamanho exato do seu evento.
        </p>
        <h2>Nossos Formatos de Bar para Eventos</h2>
        <ul>
          <li>Bar para Mini Weddings e Casamentos — O formato ideal para celebrações de 30 a 120 convidados</li>
          <li>Bar para Aniversários e Festas Privadas — Coquetéis refrescantes e agilidade na pista para 30 a 150 convidados</li>
          <li>Bar para Confraternizações e Eventos — Estrutura compacta, drinks refinados e zero dor de cabeça com compras</li>
          <li>Mão de Obra Especializada — Para quem já comprou as bebidas e quer deixar o bar por nossa conta</li>
        </ul>
        <h2>Por que escolher o Laboratório de Drinks?</h2>
        <ul>
          <li>Avaliação 5.0 no Google Reviews — Nota máxima concedida por clientes reais</li>
          <li>Drinks de verdade preparados na hora com frutas frescas e xaropes artesanais</li>
          <li>Carta com coquetéis consagrados: Caipirinha, Fitzgerald, Moscow Mule, Piña Colada e Mojito</li>
          <li>Especialistas em eventos de 30 a 150 convidados</li>
          <li>Seu orçamento em menos de 1 minuto, sem compromisso e sem taxas escondidas</li>
        </ul>
        <h2>Calcule seu Orçamento Online</h2>
        <p>
          Informe os detalhes da sua festa e descubra quais pacotes se encaixam no seu evento em menos de 1 minuto.
        </p>
      </div>
      <HomeClient />
    </>
  );
}
