import AvaliacoesClient from './AvaliacoesClient';

export const metadata = {
  title: 'Avaliações e Depoimentos | Barman em Juiz de Fora',
  description: 'Confira as avaliações de clientes e prints reais do Google Reviews do Laboratório de Drinks. O melhor serviço de bartender de Juiz de Fora e região.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com/avaliacoes',
  },
  openGraph: {
    title: 'Avaliações e Depoimentos | Barman em Juiz de Fora',
    description: 'Opinião de quem contratou o melhor serviço de bartender e coquetelaria de Juiz de Fora.',
    url: 'https://laboratorio.gabryelamaro.com/avaliacoes',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
        alt: 'Avaliações Laboratório de Drinks',
      }
    ],
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Laboratório de Drinks",
  "image": "https://laboratorio.gabryelamaro.com/logo.webp",
  "url": "https://laboratorio.gabryelamaro.com/avaliacoes",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Juiz de Fora",
    "addressRegion": "MG",
    "addressCountry": "BR"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "reviewCount": "24",
    "bestRating": "5",
    "worstRating": "5"
  }
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AvaliacoesClient />
    </>
  );
}
