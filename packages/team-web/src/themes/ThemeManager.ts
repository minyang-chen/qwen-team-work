/**
 * Theme system for team-web
 * Adapted from CLI's theme manager
 */

export interface Theme {
  name: string;
  type: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
}

export const themes: Record<string, Theme> = {
  'qwen-light': {
    name: 'Qwen Light',
    type: 'light',
    colors: {
      primary: '#1976d2',
      secondary: '#424242',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#212121',
      textSecondary: '#757575',
      border: '#e0e0e0',
      accent: '#ff4081',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
    },
  },
  'qwen-dark': {
    name: 'Qwen Dark',
    type: 'dark',
    colors: {
      primary: '#2196f3',
      secondary: '#90a4ae',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0bec5',
      border: '#333333',
      accent: '#ff4081',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
    },
  },
  'github-light': {
    name: 'GitHub Light',
    type: 'light',
    colors: {
      primary: '#0969da',
      secondary: '#656d76',
      background: '#ffffff',
      surface: '#f6f8fa',
      text: '#24292f',
      textSecondary: '#656d76',
      border: '#d0d7de',
      accent: '#8250df',
      success: '#1a7f37',
      warning: '#9a6700',
      error: '#cf222e',
    },
  },
  'github-dark': {
    name: 'GitHub Dark',
    type: 'dark',
    colors: {
      primary: '#58a6ff',
      secondary: '#8b949e',
      background: '#0d1117',
      surface: '#161b22',
      text: '#f0f6fc',
      textSecondary: '#8b949e',
      border: '#30363d',
      accent: '#a5a5ff',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
    },
  },
};

export class ThemeManager {
  private currentTheme: string = 'qwen-light';
  private listeners: ((theme: Theme) => void)[] = [];

  getTheme(name?: string): Theme {
    const themeName = name || this.currentTheme;
    return themes[themeName] || themes['qwen-light'];
  }

  setTheme(name: string): void {
    if (themes[name]) {
      this.currentTheme = name;
      this.notifyListeners();
      this.applyTheme(themes[name]);
    }
  }

  getCurrentTheme(): string {
    return this.currentTheme;
  }

  getAvailableThemes(): string[] {
    return Object.keys(themes);
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const theme = this.getTheme();
    this.listeners.forEach(listener => listener(theme));
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    root.setAttribute('data-theme', theme.type);
  }
}

export const themeManager = new ThemeManager();
