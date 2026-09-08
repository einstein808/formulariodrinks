import HomeClient from './HomeClient';

export const metadata = {
  title: 'Laboratório de Drinks - Bar de Qualidade para sua Festa em Juiz de Fora',
  description: 'Um bar de qualidade para sua festa sem gastar uma fortuna. Bar móvel sob medida para mini weddings, aniversários e eventos em Juiz de Fora e região. Drinks bem preparados e avaliação 5.0 no Google.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com',
  },
  openGraph: {
    title: 'Laboratório de Drinks — Bar para Eventos em Juiz de Fora',
    description: 'Drinks bem preparados, atendimento profissional e orçamento transparente para sua festa. Bar móvel para mini weddings e celebrações em Juiz de Fora e região.',
    url: 'https://laboratorio.gabryelamaro.com',
    type: 'website',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Laboratório de Drinks — Um bar de qualidade para sua festa em Juiz de Fora',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laboratório de Drinks — Bar para Eventos em Juiz de Fora',
    description: 'Drinks bem preparados e orçamento transparente para sua festa em JF e região.',
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
          <li>Bar para Mini Weddings — O formato ideal para casamentos de 30 a 120 convidados</li>
          <li>Bar para Aniversários e Debutantes — Coquetéis refrescantes e agilidade na pista</li>
          <li>Bar para Confraternizações e Empresas — Pontualidade, equipe discreta e postura executiva</li>
          <li>Mão de Obra Especializada — Barmen com utensílios para quem já comprou as bebidas</li>
        </ul>
        <h2>Por que escolher o Laboratório de Drinks?</h2>
        <ul>
          <li>Avaliação 5.0 no Google — Nota máxima concedida por clientes reais</li>
          <li>Drinks de verdade com frutas frescas e receitas balanceadas</li>
          <li>Pacotes modulares que respeitam o orçamento da sua celebração</li>
          <li>Bar móvel compacto e elegante que valoriza o ambiente</li>
          <li>Orçamento 100% transparente, sem taxas ocultas</li>
        </ul>
        <h2>Solicite seu Orçamento Online</h2>
        <p>
          Faça uma simulação gratuita em menos de 1 minuto e encontre o pacote ideal para seu evento 
          em Juiz de Fora, Matias Barbosa, Simão Pereira e região.
        </p>
      </div>
      <HomeClient />
    </>
  );
}
