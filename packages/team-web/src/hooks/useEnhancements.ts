/**
 * React hooks for theme and i18n integration
 */

import { useState, useEffect } from 'react';
import { themeManager, type Theme } from '../themes/ThemeManager';
import { i18n, type SupportedLanguage } from '@qwen-team/shared';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(themeManager.getTheme());
  const [currentThemeName, setCurrentThemeName] = useState<string>(
    themeManager.getCurrentTheme()
  );

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setTheme(newTheme);
      setCurrentThemeName(themeManager.getCurrentTheme());
    });

    return unsubscribe;
  }, []);

  const changeTheme = (themeName: string) => {
    themeManager.setTheme(themeName);
  };

  const availableThemes = themeManager.getAvailableThemes();

  return {
    theme,
    currentTheme: currentThemeName,
    availableThemes,
    changeTheme,
  };
}

export function useTranslation() {
  const [language, setLanguage] = useState<SupportedLanguage>(
    i18n.getCurrentLanguage()
  );

  useEffect(() => {
    const unsubscribe = i18n.subscribe((newLanguage) => {
      setLanguage(newLanguage);
    });

    return unsubscribe;
  }, []);

  const changeLanguage = (newLanguage: SupportedLanguage) => {
    i18n.setLanguage(newLanguage);
  };

  const t = (key: string, params?: Record<string, string>) => {
    return i18n.translate(key, params);
  };

  const supportedLanguages = i18n.getSupportedLanguages();

  return {
    language,
    supportedLanguages,
    changeLanguage,
    t,
  };
}
