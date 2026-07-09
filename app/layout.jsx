import './globals.css';
import { Inter, Cinzel } from 'next/font/google';
import SwRegister from '../components/SwRegister';
import PwaInstallBanner from '../components/PwaInstallBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

export const metadata = {
  metadataBase: new URL('https://laboratorio.gabryelamaro.com'),
  title: 'Barman Juiz de Fora | Laboratório de Drinks para Casamentos e Festas',
  description: 'Serviço premium de bartender e coquetelaria para casamentos e festas em Juiz de Fora e região. Drinks exclusivos e experiência inesquecível.',
  keywords: ['barman juiz de fora', 'bartender juiz de fora', 'drinks para casamento jf', 'bar para festas jf', 'laboratório de drinks', 'coquetelaria juiz de fora', 'barman para eventos'],
  authors: [{ name: 'Laboratório de Drinks' }],
  creator: 'Laboratório de Drinks',
  primaryColor: '#cba153',
  publisher: 'Laboratório de Drinks',
  manifest: '/manifest.json',
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
    url: 'https://laboratorio.gabryelamaro.com',
    siteName: 'Laboratório de Drinks',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
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
    images: ['https://laboratorio.gabryelamaro.com/logo.webp'],
  },
};

export default function RootLayout({ children }) {
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Laboratório de Drinks",
    "image": "https://laboratorio.gabryelamaro.com/logo.webp",
    "description": "Serviço premium de bartender e coquetelaria para casamentos e festas em Juiz de Fora e região.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Juiz de Fora",
      "addressRegion": "MG",
      "addressCountry": "BR"
    },
    "url": "https://laboratorio.gabryelamaro.com",
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
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#CBA153" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LabDrinks" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <SwRegister />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
