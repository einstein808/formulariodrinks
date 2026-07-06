import PerguntasClient from './PerguntasClient';

export const metadata = {
  title: 'Dúvidas Frequentes | Bartender e Barman em Juiz de Fora',
  description: 'Tire suas dúvidas sobre montagem de bar, contratação de bartenders, insumos, bebidas e atendimento para o seu casamento ou festa em Juiz de Fora.',
  alternates: {
    canonical: 'https://laboratorio.gabryelamaro.com/perguntas',
  },
  openGraph: {
    title: 'Dúvidas Frequentes | Bartender e Barman em Juiz de Fora',
    description: 'Respostas para dúvidas comuns sobre o funcionamento do bar de drinks para casamentos e formaturas.',
    url: 'https://laboratorio.gabryelamaro.com/perguntas',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
        alt: 'Central de Ajuda Laboratório de Drinks',
      }
    ],
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O que está incluso nos pacotes completos de bar?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Nossos pacotes completos incluem bartenders qualificados, insumos premium (frutas da estação frescas, xaropes artesanais, destilados nacionais e importados de acordo com a categoria contratada), gelo especial para drinks, copos adequados (acrílico premium ou vidro opcional) e toda a estrutura física de bar iluminada."
      }
    },
    {
      "@type": "Question",
      "name": "Vocês trabalham apenas com a mão de obra (sem bebidas)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim! Oferecemos a opção de contratação apenas da Mão de Obra. Nesse formato, fornecemos toda a nossa equipe de bartenders, os utensílios de bar profissionais e uma lista de compras detalhada com as quantidades de bebidas e insumos que você precisará adquirir."
      }
    },
    {
      "@type": "Question",
      "name": "Quantos bartenders são enviados para o meu evento?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Nós calculamos o tamanho da equipe com base no número total de convidados para garantir um serviço ágil e sem filas. A regra padrão que seguimos é de aproximadamente 1 bartender para cada 40 a 50 convidados."
      }
    },
    {
      "@type": "Question",
      "name": "Qual é a duração padrão do serviço e posso estender?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A duração padrão do nosso serviço é de 5 horas de festa. Caso necessite de mais tempo, é possível contratar horas adicionais antecipadamente no contrato ou solicitar uma extensão de tempo diretamente com o coordenador do bar no dia do evento."
      }
    },
    {
      "@type": "Question",
      "name": "Com quanta antecedência a equipe chega no local para montagem?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Nossa equipe chega de 1h30 a 2 horas antes do horário programado para o início do bar. Esse tempo garante que toda a estrutura física, cortes de frutas, gelo e utensílios estejam organizados para abrirmos pontualmente."
      }
    },
    {
      "@type": "Question",
      "name": "Vocês fornecem copos de vidro ou acrílico?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Trabalhamos com ambas as opções. Nos pacotes convencionais, oferecemos copos de acrílico premium personalizados (resistentes e elegantes). Como opcional, você pode contratar copos e taças de vidro específicas para cada drink (taças de gin, canecas de cobre para Moscow Mule, etc.)."
      }
    },
    {
      "@type": "Question",
      "name": "Como funciona a escolha dos drinks do cardápio?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Após o fechamento do contrato, o cliente tem acesso ao nosso painel exclusivo onde poderá visualizar e selecionar os drinks do seu evento de acordo com a categoria contratada (Standard, Premium, Frozen, etc.)."
      }
    },
    {
      "@type": "Question",
      "name": "Quais são as formas de pagamento aceitas?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Facilitamos o pagamento por meio de PIX, transferência bancária direta ou parcelamento no cartão de crédito em até 12x (com taxas da operadora). O valor total precisa estar quitado até a semana do evento."
      }
    }
  ]
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PerguntasClient />
    </>
  );
}
