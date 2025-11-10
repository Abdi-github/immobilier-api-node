import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as middleware from 'i18next-http-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize i18next for internationalization
 */
export const initializeI18n = async (): Promise<void> => {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      supportedLngs: ['en', 'fr', 'de', 'it'],
      preload: ['en', 'fr', 'de', 'it'],
      ns: ['common', 'errors', 'validation'],
      defaultNS: 'common',
      backend: {
        loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
      },
      detection: {
        order: ['querystring', 'cookie', 'session', 'header'],
        caches: ['cookie'],
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        lookupSession: 'lng',
        lookupHeader: 'accept-language',
      },
      interpolation: {
        escapeValue: false,
      },
    });
};

/**
 * i18next HTTP middleware
 */
export const i18nextMiddleware = middleware.handle(i18next);

export default i18next;
