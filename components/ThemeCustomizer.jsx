"use client";
import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

export default function ThemeCustomizer() {
  useEffect(() => {
    const generalRef = ref(db, 'config/general');
    const unsubscribe = onValue(generalRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.primaryColor && /^#[0-9A-F]{6}$/i.test(data.primaryColor)) {
          const primary = data.primaryColor;
          
          // Apply custom primary color variables dynamically
          document.documentElement.style.setProperty('--primary', primary);
          document.documentElement.style.setProperty('--primary-light', primary);
          document.documentElement.style.setProperty('--primary-dark', primary);
          document.documentElement.style.setProperty('--text-accent', primary);
          document.documentElement.style.setProperty('--primary-glow', `${primary}40`); // 25% alpha
          document.documentElement.style.setProperty('--border-color', `${primary}1f`); // 12% alpha
          document.documentElement.style.setProperty('--border-focus', `${primary}99`); // 60% alpha
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return null;
}
