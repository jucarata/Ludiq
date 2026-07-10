import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";

export type Locale = "en" | "es";

export const LOCALES: Locale[] = ["en", "es"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "ludiq.locale";

export const messagesByLocale: Record<Locale, Messages> = {
  en,
  es,
};

export type TranslationValues = Record<
  string,
  string | number | boolean | null | undefined
>;

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type MessageKey = NestedKeyOf<Messages>;

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function interpolate(
  template: string,
  values?: TranslationValues,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? match : String(value);
  });
}

export function translate(
  locale: Locale,
  key: MessageKey,
  values?: TranslationValues,
): string {
  const raw =
    getByPath(messagesByLocale[locale], key) ??
    getByPath(messagesByLocale[DEFAULT_LOCALE], key);

  if (typeof raw !== "string") {
    return key;
  }

  return interpolate(raw, values);
}

export function translatePlural(
  locale: Locale,
  baseKey: string,
  count: number,
  values?: TranslationValues,
): string {
  const suffix = count === 1 ? "one" : "other";
  return translate(
    locale,
    `${baseKey}_${suffix}` as MessageKey,
    { count, ...values },
  );
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}

export function localeToHtmlLang(locale: Locale): string {
  return locale;
}

/** UI labels for the settings dropdown (stable option values). */
export type LanguageOption = "ENGLISH" | "ESPAÑOL";

export function localeToLanguageOption(locale: Locale): LanguageOption {
  return locale === "es" ? "ESPAÑOL" : "ENGLISH";
}

export function languageOptionToLocale(option: LanguageOption): Locale {
  return option === "ESPAÑOL" ? "es" : "en";
}

export function getPlayerColorLabel(
  locale: Locale,
  color: "red" | "green" | "yellow" | "blue",
): string {
  return translate(locale, `colors.${color}`);
}
