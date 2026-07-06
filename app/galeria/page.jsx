import GaleriaClient from './GaleriaClient';

export const metadata = {
  title: 'Fotos de Eventos | Barman e Bartender em Juiz de Fora',
  description: 'Confira a galeria de fotos e vídeos dos eventos realizados pelo Laboratório de Drinks. Coquetelaria premium para casamentos, formaturas e festas em JF.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com/galeria',
  },
  openGraph: {
    title: 'Fotos de Eventos | Barman e Bartender em Juiz de Fora',
    description: 'Galeria de casamentos e festas com coquetelaria premium pelo Laboratório de Drinks em Juiz de Fora.',
    url: 'https://laboratorio.gabryelamaro.com/galeria',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
        alt: 'Galeria Laboratório de Drinks',
      }
    ],
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  "name": "Galeria de Eventos - Laboratório de Drinks",
  "description": "Portfólio de casamentos e formaturas com serviço de bar premium em Juiz de Fora.",
  "url": "https://laboratorio.gabryelamaro.com/galeria",
  "provider": {
    "@type": "Organization",
    "name": "Laboratório de Drinks",
    "logo": "https://laboratorio.gabryelamaro.com/logo.webp"
  }
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GaleriaClient />
    </>
  );
}
