'use client';
import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.error('SW registration failed:', err));
      }
    } else {
      // Unregister service worker in development to avoid caching chunks
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log('Service Worker unregistered successfully in dev mode');
                window.location.reload(); // Reload to apply changes immediately
              }
            });
          }
        });
      }
    }
  }, []);

  return null;
}
