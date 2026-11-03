import { en, type MessageKey } from './en';
import { ptBR } from './pt-BR';

export type Locale = 'en' | 'pt-BR';

export const SOURCE_LOCALE: Locale = 'en';
export const LOCALES: readonly Locale[] = ['en', 'pt-BR'];

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  'pt-BR': ptBR,
};

export function translate(
  locale: Locale,
  key: MessageKey,
  values?: Readonly<Record<string, string | number>>,
): string {
  const template = messages[locale][key] ?? en[key] ?? key;
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${name}}`,
  );
}

export function resolveLocale(
  navigatorLanguage: string | undefined,
  stored: string | null | undefined,
): Locale {
  if (stored === 'en' || stored === 'pt-BR') {
    return stored;
  }
  const language = (navigatorLanguage ?? '').toLowerCase();
  if (language.startsWith('pt')) {
    return 'pt-BR';
  }
  return 'en';
}

export interface LocaleKeyDiff {
  missing: string[];
  extra: string[];
}

export function validateLocaleKeys(
  candidate: Readonly<Record<string, string>>,
  source: Readonly<Record<string, string>> = en,
): LocaleKeyDiff {
  const sourceKeys = Object.keys(source);
  const candidateKeys = Object.keys(candidate);
  return {
    missing: sourceKeys.filter((key) => !(key in candidate)),
    extra: candidateKeys.filter((key) => !(key in source)),
  };
}

export type { MessageKey };
