"use client";
import { useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

function adjustColor(hex, amount) {
  const clamp = (n) => Math.min(255, Math.max(0, n));
  const num = parseInt(hex.replace('#', ''), 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function ThemeCustomizer() {
  useEffect(() => {
    const generalRef = ref(db, 'config/general');
    const unsubscribe = onValue(generalRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const mode = data.themeMode || 'dark';
        document.documentElement.setAttribute('data-theme', mode);
        if (data.primaryColor && /^#[0-9A-F]{6}$/i.test(data.primaryColor)) {
          const primary = data.primaryColor;
          const lighter = adjustColor(primary, 30);
          const darker = adjustColor(primary, -30);
          document.documentElement.style.setProperty('--primary', primary);
          document.documentElement.style.setProperty('--primary-light', lighter);
          document.documentElement.style.setProperty('--primary-dark', darker);
          document.documentElement.style.setProperty('--text-accent', primary);
          document.documentElement.style.setProperty('--primary-glow', `${primary}40`);
          document.documentElement.style.setProperty('--border-color', mode === 'light' ? 'rgba(0,0,0,0.08)' : `${primary}1f`);
          document.documentElement.style.setProperty('--border-focus', mode === 'light' ? 'rgba(0,0,0,0.3)' : `${primary}99`);
          document.documentElement.style.setProperty('--shadow-glow', `0 0 40px ${primary}26`);
        }
      }
    });
    return () => unsubscribe();
  }, []);
  return null;
}
