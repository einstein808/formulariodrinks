import OrcamentoClient from './OrcamentoClient';

export const metadata = {
  title: 'Orçamento de Barman para Festas | Laboratório de Drinks - Juiz de Fora',
  description: 'Solicite um orçamento online para bartender e bar móvel em Juiz de Fora. Pacotes para casamentos, formaturas, aniversários e eventos corporativos. Resposta rápida via WhatsApp.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com/orcamento',
  },
  openGraph: {
    title: 'Orçamento de Barman para Festas | Laboratório de Drinks',
    description: 'Solicite um orçamento online para serviço de bar e coquetelaria em Juiz de Fora. Pacotes personalizados para seu evento.',
    url: 'https://laboratorio.gabryelamaro.com/orcamento',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
        alt: 'Orçamento Laboratório de Drinks - Barman em Juiz de Fora',
      }
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Serviço de Barman e Coquetelaria para Eventos",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Laboratório de Drinks",
    "image": "https://laboratorio.gabryelamaro.com/logo.webp",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Juiz de Fora",
      "addressRegion": "MG",
      "addressCountry": "BR"
    },
    "telephone": "+5532999999999",
    "priceRange": "$$"
  },
  "description": "Solicite um orçamento personalizado para serviço de bar e bartender para casamentos, formaturas, aniversários e eventos corporativos em Juiz de Fora e região.",
  "url": "https://laboratorio.gabryelamaro.com/orcamento",
  "areaServed": {
    "@type": "City",
    "name": "Juiz de Fora"
  },
  "serviceType": "Bartender e Coquetelaria para Eventos",
  "potentialAction": {
    "@type": "OrderAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://laboratorio.gabryelamaro.com/orcamento",
      "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
    },
    "name": "Solicitar Orçamento"
  }
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
        <h1>Orçamento de Barman para Eventos em Juiz de Fora</h1>
        <p>
          Solicite agora um orçamento personalizado para o serviço de bartender e coquetelaria 
          do Laboratório de Drinks. Atendemos casamentos, formaturas, aniversários, confraternizações 
          e eventos corporativos em Juiz de Fora e toda a Zona da Mata Mineira.
        </p>
        <h2>Como funciona o orçamento?</h2>
        <ol>
          <li>Escolha o pacote ideal para seu evento (Standard, Premium, Open Bar)</li>
          <li>Informe os detalhes do evento: data, local, número de convidados</li>
          <li>Selecione os drinks do nosso cardápio exclusivo</li>
          <li>Adicione experiências extras como Frozen, copos de vidro e alquimia</li>
          <li>Receba o orçamento completo diretamente no seu WhatsApp</li>
        </ol>
        <h2>Nossos Pacotes</h2>
        <p>
          Oferecemos pacotes flexíveis para diferentes tamanhos e estilos de evento. 
          Cada pacote inclui equipe profissional de barmen, estrutura de bar completa, 
          insumos premium e cardápio de drinks exclusivos. Consulte valores por convidado 
          ou valor fixo conforme o pacote escolhido.
        </p>
        <h2>Área de Atendimento</h2>
        <p>
          Juiz de Fora, Zona da Mata Mineira e cidades da região como Lima Duarte, 
          Santos Dumont, Barbacena, São João del-Rei, Viçosa, Muriaé e mais.
        </p>
      </div>
      <OrcamentoClient />
    </>
  );
}
