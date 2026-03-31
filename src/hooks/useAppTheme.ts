import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const THEMES = [
  { id: 'default', name: 'Original', color: '#000000', isDefault: true, category: 'general' },
  { id: 'sobria', name: 'Sobria', color: '#2D3436', category: 'general' },
  { id: 'tech-neon', name: 'Tech / Neon', color: '#0984E3', category: 'general' },
  { id: 'tierra-nature', name: 'Tierra / Nature', color: '#2D4F1E', category: 'general' },
  { id: 'energetica', name: 'Energética', color: '#FF7675', category: 'general' },
  { id: 'nocturna-elegante', name: 'Nocturna', color: '#192A56', category: 'general' },
  { id: 'kiwi-night', name: 'Kiwi Night', color: '#89E900', category: 'general' },
  { id: 'persian-ghost', name: 'Persian Ghost', color: '#27187E', category: 'general' },
  { id: 'imperial-night', name: 'Imperial Night', color: '#FB3640', category: 'general' },
  { id: 'cyprus-sand', name: 'Cyprus Sand', color: '#004643', category: 'general' },
  { id: 'plum-milk', name: 'Plum Milk', color: '#381932', category: 'general' },
  { id: 'kamarr', name: 'Kamarr', color: '#193A56', category: 'tematica' },
  { id: 'mari-mari', name: 'Mari Mari', color: '#B03030', category: 'tematica' },
  { id: 'papelitos', name: 'Papelitos', color: '#A3D8E0', category: 'tematica' },
  { id: 'obahia', name: 'O\'bahia', color: '#003366', category: 'tematica' },
  { id: 'ara-yevi', name: 'Ara Yevi', color: '#D3AC5D', category: 'tematica' }
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
