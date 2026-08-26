'use client';
import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        let refreshing = false;

        // Ao detectar que um novo Service Worker assumiu o controle, atualiza suavemente
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              // Força verificação imediata de nova versão no servidor
              registration.update();

              // Verifica atualizações quando o app ganha foco
              document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                  registration.update();
                }
              });

              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                  installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      console.log('Nova versão do PWA instalada e ativando...');
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

