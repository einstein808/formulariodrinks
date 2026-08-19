'use client';
import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              // Verifica periodicamente se há nova versão
              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                  installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      console.log('Nova versão do PWA disponível e pronta para uso.');
                    }
                  };
                }
              };
            })
            .catch((err) => console.error('SW registration failed:', err));
        });
      }
    } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Unregister in development to prevent chunk caching issues during hot reload
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return null;
}
