import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const THEMES = [
  { id: 'default', name: 'Original', color: '#000000', isDefault: true },
  { id: 'sobria', name: 'Sobria', color: '#2D3436' },
  { id: 'tech-neon', name: 'Tech / Neon', color: '#0984E3' },
  { id: 'tierra-nature', name: 'Tierra / Nature', color: '#2D4F1E' },
  { id: 'energetica', name: 'Energética', color: '#FF7675' },
  { id: 'nocturna-elegante', name: 'Nocturna', color: '#192A56' },
  { id: 'kiwi-night', name: 'Kiwi Night', color: '#89E900' },
  { id: 'persian-ghost', name: 'Persian Ghost', color: '#27187E' },
  { id: 'imperial-night', name: 'Imperial Night', color: '#FB3640' },
  { id: 'cyprus-sand', name: 'Cyprus Sand', color: '#004643' },
  { id: 'plum-milk', name: 'Plum Milk', color: '#381932' },
  { id: 'kamarr', name: 'Kamarr', color: '#193A56' },
  { id: 'mari-mari', name: 'Mari Mari', color: '#B03030' },
  { id: 'papelitos', name: 'Papelitos', color: '#A3D8E0' },
  { id: 'obahia', name: 'O\'bahia', color: '#1C4966' },
  { id: 'ara-yevi', name: 'Ara Yevi', color: '#D3AC5D' }
];

export function useAppTheme() {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<string>('default');

  useEffect(() => {
    if (!user) return;
    const savedTheme = localStorage.getItem(`app_theme_${user.id}`);
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      setCurrentTheme('default');
    }
  }, [user]);

  const setTheme = (themeId: string) => {
    if (!user) return;
    if (themeId === 'default') {
      localStorage.removeItem(`app_theme_${user.id}`);
      document.documentElement.removeAttribute('data-theme');
    } else {
      localStorage.setItem(`app_theme_${user.id}`, themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    }
    setCurrentTheme(themeId);
  };

  return { currentTheme, setTheme, themes: THEMES };
}
