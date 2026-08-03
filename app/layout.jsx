import './globals.css';
import { Inter, Cinzel } from 'next/font/google';
import SwRegister from '../components/SwRegister';
import PwaInstallBanner from '../components/PwaInstallBanner';
import FloatingWhatsapp from '../components/FloatingWhatsapp';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

export const metadata = {
  metadataBase: new URL('https://laboratorio.gabryelamaro.com'),
  title: 'Laboratório de Drinks - Barman Juiz de Fora',
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
    title: 'Laboratório de Drinks - Barman Juiz de Fora',
    description: 'Serviço premium de barman para casamentos e festas em Juiz de Fora. Drinks exclusivos e experiência inesquecível.',
    url: 'https://laboratorio.gabryelamaro.com',
    siteName: 'Laboratório de Drinks',
    images: [
      {
        url: 'https://laboratorio.gabryelamaro.com/logo.webp',
        width: 800,
        height: 600,
        alt: 'Logo Laboratório de Drinks - Barman Juiz de Fora',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laboratório de Drinks - Barman Juiz de Fora',
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
    "telephone": "+5532998696519",
    "priceRange": "$$"
  };

  return (
    <html lang="pt-BR" className={`${inter.variable} ${cinzel.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* DNS Prefetch & Preconnect for Performance */}
        <link rel="preconnect" href="https://s3.gabryelamaro.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://s3.gabryelamaro.com" />
        <link rel="preconnect" href="https://formsbar-default-rtdb.firebaseio.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://formsbar-default-rtdb.firebaseio.com" />
        <link rel="preconnect" href="https://formsbar.firebaseapp.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://formsbar.firebaseapp.com" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://apis.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://apis.google.com" />

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
        <FloatingWhatsapp />
        <SwRegister />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
