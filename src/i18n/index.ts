import en from './en.js';
import zhTW from './zh-TW.js';

export type I18nKeys = keyof typeof en;
export type I18nStrings = Record<I18nKeys, string>;

const locales: Record<string, I18nStrings> = {
  en,
  'zh-TW': zhTW,
};

export function getI18n(lang: string): I18nStrings {
  return locales[lang] ?? en;
}
