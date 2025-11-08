/**
 * Email Template Engine
 *
 * Uses Handlebars for template rendering with multilingual support.
 */

import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { fileURLToPath } from 'url';

import { logger } from '../../shared/logger/index.js';
import { SupportedLanguage } from '../auth/auth.types.js';
import { EmailType } from './email.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email template structure
 */
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Compiled template cache
 */
const templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

/**
 * Subject templates by language and type
 */
const subjectTemplates: Record<SupportedLanguage, Record<EmailType, string>> = {
  en: {
    [EmailType.EMAIL_VERIFICATION]: 'Verify your email address - Immobilier.ch',
    [EmailType.WELCOME]: 'Welcome to Immobilier.ch!',
    [EmailType.PASSWORD_RESET]: 'Reset your password - Immobilier.ch',
    [EmailType.PASSWORD_CHANGED]: 'Your password has been changed - Immobilier.ch',
    [EmailType.PROPERTY_SUBMITTED]: 'Property submission received - {{propertyTitle}}',
    [EmailType.PROPERTY_APPROVED]: 'Great news! Your property has been approved',
    [EmailType.PROPERTY_REJECTED]: 'Your property submission requires changes',
    [EmailType.PROPERTY_PUBLISHED]: 'Your property is now live! - {{propertyTitle}}',
    [EmailType.PROPERTY_ARCHIVED]: 'Your property has been archived',
    [EmailType.NEW_LEAD]: 'New inquiry for your property - {{propertyTitle}}',
    [EmailType.LEAD_RESPONSE]: 'Response to your inquiry',
    [EmailType.NEWSLETTER]: '{{subject}}',
    [EmailType.ANNOUNCEMENT]: '{{subject}}',
    [EmailType.CUSTOM]: '{{subject}}',
  },
  fr: {
    [EmailType.EMAIL_VERIFICATION]: 'Confirmez votre adresse e-mail - Immobilier.ch',
    [EmailType.WELCOME]: 'Bienvenue sur Immobilier.ch !',
    [EmailType.PASSWORD_RESET]: 'Réinitialisez votre mot de passe - Immobilier.ch',
    [EmailType.PASSWORD_CHANGED]: 'Votre mot de passe a été modifié - Immobilier.ch',
    [EmailType.PROPERTY_SUBMITTED]: 'Soumission de propriété reçue - {{propertyTitle}}',
    [EmailType.PROPERTY_APPROVED]: 'Bonne nouvelle ! Votre propriété a été approuvée',
    [EmailType.PROPERTY_REJECTED]: 'Votre soumission de propriété nécessite des modifications',
    [EmailType.PROPERTY_PUBLISHED]: 'Votre propriété est maintenant en ligne ! - {{propertyTitle}}',
    [EmailType.PROPERTY_ARCHIVED]: 'Votre propriété a été archivée',
    [EmailType.NEW_LEAD]: 'Nouvelle demande pour votre propriété - {{propertyTitle}}',
    [EmailType.LEAD_RESPONSE]: 'Réponse à votre demande',
    [EmailType.NEWSLETTER]: '{{subject}}',
    [EmailType.ANNOUNCEMENT]: '{{subject}}',
    [EmailType.CUSTOM]: '{{subject}}',
  },
  de: {
    [EmailType.EMAIL_VERIFICATION]: 'Bestätigen Sie Ihre E-Mail-Adresse - Immobilier.ch',
    [EmailType.WELCOME]: 'Willkommen bei Immobilier.ch!',
    [EmailType.PASSWORD_RESET]: 'Passwort zurücksetzen - Immobilier.ch',
    [EmailType.PASSWORD_CHANGED]: 'Ihr Passwort wurde geändert - Immobilier.ch',
    [EmailType.PROPERTY_SUBMITTED]: 'Immobilieneinreichung erhalten - {{propertyTitle}}',
    [EmailType.PROPERTY_APPROVED]: 'Gute Nachrichten! Ihre Immobilie wurde genehmigt',
    [EmailType.PROPERTY_REJECTED]: 'Ihre Immobilieneinreichung erfordert Änderungen',
    [EmailType.PROPERTY_PUBLISHED]: 'Ihre Immobilie ist jetzt online! - {{propertyTitle}}',
    [EmailType.PROPERTY_ARCHIVED]: 'Ihre Immobilie wurde archiviert',
    [EmailType.NEW_LEAD]: 'Neue Anfrage für Ihre Immobilie - {{propertyTitle}}',
    [EmailType.LEAD_RESPONSE]: 'Antwort auf Ihre Anfrage',
    [EmailType.NEWSLETTER]: '{{subject}}',
    [EmailType.ANNOUNCEMENT]: '{{subject}}',
    [EmailType.CUSTOM]: '{{subject}}',
  },
  it: {
    [EmailType.EMAIL_VERIFICATION]: 'Conferma il tuo indirizzo email - Immobilier.ch',
    [EmailType.WELCOME]: 'Benvenuto su Immobilier.ch!',
    [EmailType.PASSWORD_RESET]: 'Reimposta la tua password - Immobilier.ch',
    [EmailType.PASSWORD_CHANGED]: 'La tua password è stata modificata - Immobilier.ch',
    [EmailType.PROPERTY_SUBMITTED]: 'Sottomissione proprietà ricevuta - {{propertyTitle}}',
    [EmailType.PROPERTY_APPROVED]: 'Ottime notizie! La tua proprietà è stata approvata',
    [EmailType.PROPERTY_REJECTED]: 'La tua sottomissione richiede modifiche',
    [EmailType.PROPERTY_PUBLISHED]: 'La tua proprietà è ora online! - {{propertyTitle}}',
    [EmailType.PROPERTY_ARCHIVED]: 'La tua proprietà è stata archiviata',
    [EmailType.NEW_LEAD]: 'Nuova richiesta per la tua proprietà - {{propertyTitle}}',
    [EmailType.LEAD_RESPONSE]: 'Risposta alla tua richiesta',
    [EmailType.NEWSLETTER]: '{{subject}}',
    [EmailType.ANNOUNCEMENT]: '{{subject}}',
    [EmailType.CUSTOM]: '{{subject}}',
  },
};

/**
 * Register Handlebars helpers
 */
const registerHelpers = (): void => {
  // Date formatting helper
  Handlebars.registerHelper('formatDate', (date: string | Date, format: string) => {
    const d = new Date(date);
    if (format === 'short') {
      return d.toLocaleDateString();
    }
    if (format === 'long') {
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return d.toISOString();
  });

  // Conditional helper
  Handlebars.registerHelper(
    'ifEquals',
    function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    }
  );

  // Current year helper
  Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

  // Uppercase helper
  Handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());

  // Capitalize helper
  Handlebars.registerHelper('capitalize', (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Currency formatting helper
  Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'CHF') => {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  });

  // Number formatting helper
  Handlebars.registerHelper('formatNumber', (num: number) => {
    if (num === null || num === undefined) return '';
    return new Intl.NumberFormat('de-CH').format(num);
  });
};

// Register helpers on module load
registerHelpers();

/**
 * Map EmailType to template file names
 */
const emailTypeToFileName: Record<EmailType, string> = {
  [EmailType.EMAIL_VERIFICATION]: 'verification',
  [EmailType.WELCOME]: 'welcome',
  [EmailType.PASSWORD_RESET]: 'password-reset',
  [EmailType.PASSWORD_CHANGED]: 'password-changed',
  [EmailType.PROPERTY_SUBMITTED]: 'property-submitted',
  [EmailType.PROPERTY_APPROVED]: 'property-approved',
  [EmailType.PROPERTY_REJECTED]: 'property-rejected',
  [EmailType.PROPERTY_PUBLISHED]: 'property-published',
  [EmailType.PROPERTY_ARCHIVED]: 'property-archived',
  [EmailType.NEW_LEAD]: 'new-lead',
  [EmailType.LEAD_RESPONSE]: 'lead-response',
  [EmailType.NEWSLETTER]: 'newsletter',
  [EmailType.ANNOUNCEMENT]: 'announcement',
  [EmailType.CUSTOM]: 'custom',
};

/**
 * Get template path
 */
const getTemplatePath = (
  type: EmailType,
  language: SupportedLanguage,
  format: 'html' | 'text'
): string => {
  const templateDir = path.join(__dirname, 'templates', language);
  const fileName = emailTypeToFileName[type] || type;
  return path.join(templateDir, `${fileName}.${format}.hbs`);
};

/**
 * Load and compile a template
 */
const loadTemplate = (
  type: EmailType,
  language: SupportedLanguage,
  format: 'html' | 'text'
): HandlebarsTemplateDelegate | null => {
  const cacheKey = `${language}:${type}:${format}`;

  // Check cache first
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  const templatePath = getTemplatePath(type, language, format);

  try {
    // Try language-specific template first
    if (fs.existsSync(templatePath)) {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const compiled = Handlebars.compile(templateContent);
      templateCache.set(cacheKey, compiled);
      return compiled;
    }

    // Fallback to English template
    if (language !== 'en') {
      const fallbackPath = getTemplatePath(type, 'en', format);
      if (fs.existsSync(fallbackPath)) {
        logger.warn(`Template not found for ${language}:${type}:${format}, using English fallback`);
        const templateContent = fs.readFileSync(fallbackPath, 'utf-8');
        const compiled = Handlebars.compile(templateContent);
        templateCache.set(cacheKey, compiled);
        return compiled;
      }
    }

    logger.error(`Template not found: ${templatePath}`);
    return null;
  } catch (error) {
    logger.error(`Error loading template: ${templatePath}`, { error });
    return null;
  }
};

/**
 * Load base layout template
 */
const loadLayout = (language: SupportedLanguage): HandlebarsTemplateDelegate | null => {
  const cacheKey = `${language}:layout`;

  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  const layoutPath = path.join(__dirname, 'templates', language, '_layout.html.hbs');
  const fallbackPath = path.join(__dirname, 'templates', 'en', '_layout.html.hbs');

  try {
    const layoutFile = fs.existsSync(layoutPath) ? layoutPath : fallbackPath;
    if (fs.existsSync(layoutFile)) {
      const layoutContent = fs.readFileSync(layoutFile, 'utf-8');
      const compiled = Handlebars.compile(layoutContent);
      templateCache.set(cacheKey, compiled);
      return compiled;
    }
    return null;
  } catch (error) {
    logger.error('Error loading layout template', { error });
    return null;
  }
};

/**
 * Render email template
 */
export const renderTemplate = (
  type: EmailType,
  language: SupportedLanguage,
  data: Record<string, unknown>
): EmailTemplate | null => {
  try {
    // Get subject template
    const subjectTemplate = subjectTemplates[language]?.[type] || subjectTemplates.en[type];
    const subjectCompiled = Handlebars.compile(subjectTemplate);
    const subject = subjectCompiled(data);

    // Load and render HTML template
    const htmlTemplate = loadTemplate(type, language, 'html');
    if (!htmlTemplate) {
      logger.error(`HTML template not found for ${type} in ${language}`);
      return null;
    }

    // Render the content
    const contentHtml = htmlTemplate(data);

    // Wrap in layout
    const layout = loadLayout(language);
    let html = contentHtml;
    if (layout) {
      html = layout({ ...data, content: contentHtml });
    }

    // Load and render text template (optional)
    const textTemplate = loadTemplate(type, language, 'text');
    const text = textTemplate ? textTemplate(data) : stripHtml(html);

    return { subject, html, text };
  } catch (error) {
    logger.error(`Error rendering template ${type} for ${language}`, { error });
    return null;
  }
};

/**
 * Strip HTML tags for plain text version
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Clear template cache (useful for development)
 */
export const clearTemplateCache = (): void => {
  templateCache.clear();
  logger.info('Email template cache cleared');
};

/**
 * Preload all templates (for production startup)
 */
export const preloadTemplates = async (): Promise<void> => {
  const languages: SupportedLanguage[] = ['en', 'fr', 'de', 'it'];
  const types = Object.values(EmailType);
  const formats: Array<'html' | 'text'> = ['html', 'text'];

  let loaded = 0;
  let failed = 0;

  for (const lang of languages) {
    for (const type of types) {
      for (const format of formats) {
        const template = loadTemplate(type, lang, format);
        if (template) {
          loaded++;
        } else {
          failed++;
        }
      }
    }
    // Also load layout
    loadLayout(lang);
  }

  logger.info(`Email templates preloaded: ${loaded} loaded, ${failed} not found`);
};

export default {
  renderTemplate,
  clearTemplateCache,
  preloadTemplates,
};
