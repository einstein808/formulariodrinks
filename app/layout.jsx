import './globals.css';
import { Inter, Cinzel } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

export const metadata = {
  metadataBase: new URL('https://barmanjf.gabryelamaro.com'),
  title: 'Barman Juiz de Fora | Laboratório de Drinks para Casamentos e Festas',
  description: 'Serviço premium de bartender e coquetelaria para casamentos e festas em Juiz de Fora e região. Drinks exclusivos e experiência inesquecível.',
  keywords: ['barman juiz de fora', 'bartender juiz de fora', 'drinks para casamento jf', 'bar para festas jf', 'laboratório de drinks', 'coquetelaria juiz de fora', 'barman para eventos'],
  authors: [{ name: 'Laboratório de Drinks' }],
  creator: 'Laboratório de Drinks',
  publisher: 'Laboratório de Drinks',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Barman em Juiz de Fora | Laboratório de Drinks',
    description: 'Serviço premium de barman para casamentos e festas em Juiz de Fora. Drinks exclusivos e experiência inesquecível.',
    url: 'https://barmanjf.gabryelamaro.com',
    siteName: 'Laboratório de Drinks',
    images: [
      {
        url: 'https://barmanjf.gabryelamaro.com/logo.webp',
        width: 800,
        height: 600,
        alt: 'Logo Laboratório de Drinks - Barman em Juiz de Fora',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barman em Juiz de Fora | Laboratório de Drinks',
    description: 'Serviço premium de barman para casamentos e festas em Juiz de Fora.',
    images: ['https://barmanjf.gabryelamaro.com/logo.webp'],
  },
};

export default function RootLayout({ children }) {
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Laboratório de Drinks",
    "image": "https://barmanjf.gabryelamaro.com/logo.webp",
    "description": "Serviço premium de bartender e coquetelaria para casamentos e festas em Juiz de Fora e região.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Juiz de Fora",
      "addressRegion": "MG",
      "addressCountry": "BR"
    },
    "url": "https://barmanjf.gabryelamaro.com",
    "telephone": "+5532999999999",
    "priceRange": "$$"
  };

  return (
    <html lang="pt-BR" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
