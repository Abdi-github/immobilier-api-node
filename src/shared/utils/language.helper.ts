import { Request } from 'express';

import config, { SupportedLanguage } from '../../config/index.js';

/**
 * Resolve the language from the request
 * Priority: query param > cookie > session > accept-language header > default
 */
export const resolveLanguage = (req: Request): SupportedLanguage => {
  const supportedLanguages = config.i18n.supportedLanguages;
  const defaultLanguage = config.i18n.defaultLanguage;

  // 1. Query parameter
  const queryLang = req.query.lang as string;
  if (queryLang && supportedLanguages.includes(queryLang as SupportedLanguage)) {
    return queryLang as SupportedLanguage;
  }

  // 2. Cookie
  const cookieLang = req.cookies?.lang as string;
  if (cookieLang && supportedLanguages.includes(cookieLang as SupportedLanguage)) {
    return cookieLang as SupportedLanguage;
  }

  // 3. Session (if available)
  const sessionLang = (req as any).session?.lang as string;
  if (sessionLang && supportedLanguages.includes(sessionLang as SupportedLanguage)) {
    return sessionLang as SupportedLanguage;
  }

  // 4. Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    // Parse the Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, priority] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(),
          priority: priority ? parseFloat(priority) : 1,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    for (const lang of languages) {
      if (supportedLanguages.includes(lang.code as SupportedLanguage)) {
        return lang.code as SupportedLanguage;
      }
    }
  }

  // 5. Default language
  return defaultLanguage;
};

/**
 * Get localized field from an object with translations
 */
export const getLocalizedField = <T extends Record<SupportedLanguage, string>>(
  translations: T | undefined,
  language: SupportedLanguage,
  fallbackLanguage: SupportedLanguage = 'en'
): string => {
  if (!translations) {
    return '';
  }

  return translations[language] || translations[fallbackLanguage] || '';
};

/**
 * Validate if a language is supported
 */
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
  return config.i18n.supportedLanguages.includes(lang as SupportedLanguage);
};

export default { resolveLanguage, getLocalizedField, isValidLanguage };
