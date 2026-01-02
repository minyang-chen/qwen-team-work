/**
 * Internationalization system for team packages
 * Adapted from CLI's i18n system
 */

export type SupportedLanguage = 'en' | 'zh' | 'ja' | 'fr' | 'de' | 'es';

export interface TranslationDict {
  [key: string]: string | string[];
}

const translations: Record<SupportedLanguage, TranslationDict> = {
  en: {
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'team.create': 'Create Team',
    'team.join': 'Join Team',
    'team.members': 'Team Members',
    'chat.send': 'Send Message',
    'chat.typing': 'Typing...',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
  },
  zh: {
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'auth.login': '登录',
    'auth.logout': '登出',
    'auth.username': '用户名',
    'auth.password': '密码',
    'team.create': '创建团队',
    'team.join': '加入团队',
    'team.members': '团队成员',
    'chat.send': '发送消息',
    'chat.typing': '正在输入...',
    'settings.theme': '主题',
    'settings.language': '语言',
  },
  ja: {
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.cancel': 'キャンセル',
    'common.save': '保存',
    'common.delete': '削除',
    'auth.login': 'ログイン',
    'auth.logout': 'ログアウト',
    'auth.username': 'ユーザー名',
    'auth.password': 'パスワード',
    'team.create': 'チーム作成',
    'team.join': 'チーム参加',
    'team.members': 'チームメンバー',
    'chat.send': 'メッセージ送信',
    'chat.typing': '入力中...',
    'settings.theme': 'テーマ',
    'settings.language': '言語',
  },
  fr: {
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.save': 'Sauvegarder',
    'common.delete': 'Supprimer',
    'auth.login': 'Connexion',
    'auth.logout': 'Déconnexion',
    'auth.username': "Nom d'utilisateur",
    'auth.password': 'Mot de passe',
    'team.create': 'Créer une équipe',
    'team.join': 'Rejoindre une équipe',
    'team.members': "Membres de l'équipe",
    'chat.send': 'Envoyer un message',
    'chat.typing': 'En train de taper...',
    'settings.theme': 'Thème',
    'settings.language': 'Langue',
  },
  de: {
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'auth.login': 'Anmelden',
    'auth.logout': 'Abmelden',
    'auth.username': 'Benutzername',
    'auth.password': 'Passwort',
    'team.create': 'Team erstellen',
    'team.join': 'Team beitreten',
    'team.members': 'Team-Mitglieder',
    'chat.send': 'Nachricht senden',
    'chat.typing': 'Tippt...',
    'settings.theme': 'Design',
    'settings.language': 'Sprache',
  },
  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'auth.login': 'Iniciar sesión',
    'auth.logout': 'Cerrar sesión',
    'auth.username': 'Nombre de usuario',
    'auth.password': 'Contraseña',
    'team.create': 'Crear equipo',
    'team.join': 'Unirse al equipo',
    'team.members': 'Miembros del equipo',
    'chat.send': 'Enviar mensaje',
    'chat.typing': 'Escribiendo...',
    'settings.theme': 'Tema',
    'settings.language': 'Idioma',
  },
};

export class I18nManager {
  private currentLanguage: SupportedLanguage = 'en';
  private listeners: ((language: SupportedLanguage) => void)[] = [];

  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    this.notifyListeners();
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(translations) as SupportedLanguage[];
  }

  translate(key: string, params?: Record<string, string>): string {
    const translation = translations[this.currentLanguage]?.[key] || 
                       translations.en[key] || 
                       key;

    if (typeof translation !== 'string') {
      return key;
    }

    if (!params) {
      return translation;
    }

    // Simple parameter substitution
    return Object.entries(params).reduce(
      (text, [param, value]) => text.replace(`{{${param}}}`, value),
      translation
    );
  }

  subscribe(listener: (language: SupportedLanguage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentLanguage));
  }
}

export const i18n = new I18nManager();

// Convenience function
export const t = (key: string, params?: Record<string, string>): string => {
  return i18n.translate(key, params);
};
