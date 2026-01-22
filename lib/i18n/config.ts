export type SupportedLanguage = 'en' | 'es' | 'fr' | 'ja';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export interface I18nConfig {
  defaultLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  languages: Record<SupportedLanguage, LanguageConfig>;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'fr', 'ja'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
  },
};

export const i18nConfig: I18nConfig = {
  defaultLanguage: DEFAULT_LANGUAGE,
  supportedLanguages: SUPPORTED_LANGUAGES,
  languages: LANGUAGES,
};

export type TranslationKey = string;

export interface Translation {
  [key: string]: string | Translation;
}

export type Translations = Record<SupportedLanguage, Translation>;
