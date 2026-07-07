import HomeClient from './HomeClient';

export const metadata = {
  title: 'Barman em Juiz de Fora | Laboratório de Drinks para Casamentos e Festas',
  description: 'Serviço premium de bartender e coquetelaria para casamentos, formaturas e festas em Juiz de Fora e região. Drinks exclusivos, bar móvel completo e experiência inesquecível. Avaliação 5.0 no Google.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com',
  },
  openGraph: {
    title: 'Barman em Juiz de Fora | Laboratório de Drinks',
    description: 'Serviço premium de barman e coquetelaria para casamentos, formaturas e festas em Juiz de Fora. Drinks exclusivos e experiência inesquecível.',
    url: 'https://laboratorio.gabryelamaro.com',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
        width: 800,
        height: 600,
        alt: 'Logo Laboratório de Drinks - Barman em Juiz de Fora',
      }
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodService",
  "name": "Laboratório de Drinks",
  "image": "https://laboratorio.gabryelamaro.com/logo.webp",
  "description": "Serviço premium de bartender e coquetelaria para casamentos, formaturas e festas em Juiz de Fora e região. Drinks exclusivos, bar móvel completo e equipe profissional.",
  "url": "https://laboratorio.gabryelamaro.com",
  "telephone": "+5532999999999",
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
          "name": "Bar para Casamentos",
          "description": "Serviço completo de bar e coquetelaria para casamentos com drinks exclusivos e atendimento premium."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Bar para Formaturas",
          "description": "Bar móvel com drinks modernos e shots criativos para formaturas."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Bar para Festas e Aniversários",
          "description": "Drinks personalizados e bar temático para aniversários e festas particulares."
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Bar para Eventos Corporativos",
          "description": "Estrutura de bar executivo para confraternizações, congressos e lançamentos de produto."
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
        <h1>Barman em Juiz de Fora — Laboratório de Drinks</h1>
        <p>
          O Laboratório de Drinks oferece serviço premium de bartender e coquetelaria para casamentos, 
          formaturas, aniversários, festas corporativas e eventos em Juiz de Fora e toda a região da 
          Zona da Mata Mineira. Nossa equipe profissional de barmen leva até o seu evento um bar móvel 
          completo com drinks exclusivos, coquetéis clássicos e criações autorais.
        </p>
        <h2>Nossos Serviços de Bar para Eventos</h2>
        <ul>
          <li>Bar para Casamentos — Carta de drinks sob medida com atendimento premium</li>
          <li>Bar para Formaturas — Drinks modernos, shots criativos e alta rotatividade</li>
          <li>Bar para Aniversários — Coquetéis personalizados para todas as idades</li>
          <li>Bar para Eventos Corporativos — Estrutura executiva para confraternizações</li>
          <li>Bar para Chá Bar e Debutante — Experiências temáticas e interativas</li>
          <li>Frozen Experience — Drinks congelados com toque tropical</li>
        </ul>
        <h2>Por que escolher o Laboratório de Drinks?</h2>
        <ul>
          <li>Avaliação 5.0 no Google — Nota máxima de todos os clientes</li>
          <li>Equipe profissional de barmen uniformizados e treinados</li>
          <li>Cardápio de drinks exclusivos com insumos premium</li>
          <li>Bar móvel completo com toda a estrutura necessária</li>
          <li>Atendimento em Juiz de Fora, Zona da Mata e cidades vizinhas</li>
        </ul>
        <h2>Drinks Exclusivos</h2>
        <p>
          Nosso cardápio conta com mais de 15 drinks exclusivos, incluindo opções alcoólicas, 
          sem álcool e sofisticadas. Cada drink é preparado com ingredientes premium na hora, 
          garantindo frescor e qualidade incomparáveis.
        </p>
        <h2>Depoimentos de Clientes</h2>
        <p>
          Nossos clientes nos avaliam com nota 5.0 no Google. Confira os depoimentos reais 
          de quem já contratou nosso serviço de bar para casamentos e festas em Juiz de Fora.
        </p>
        <h2>Solicite seu Orçamento</h2>
        <p>
          Entre em contato e receba um orçamento personalizado para seu evento. 
          Atendemos casamentos, formaturas, aniversários, confraternizações e eventos corporativos 
          em Juiz de Fora e região.
        </p>
      </div>
      <HomeClient />
    </>
  );
}
