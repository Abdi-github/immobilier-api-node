/**
 * Translation Service
 *
 * Provides translation functionality using multiple backends:
 * - LibreTranslate (free, self-hosted, unlimited)
 * - DeepL (paid, high quality, character limits)
 *
 * The service automatically falls back between providers based on configuration
 * and availability.
 */

import { logger } from '../logger/index.js';
import config from '../../config/index.js';

// Types
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';
export type TranslationProvider = 'deepl' | 'libretranslate' | 'auto';

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  provider: TranslationProvider;
}

export interface TranslationOptions {
  sourceLang?: SupportedLanguage | 'auto';
  targetLang: SupportedLanguage;
  format?: 'text' | 'html';
}

interface LibreTranslateResponse {
  translatedText: string;
  detectedLanguage?: {
    confidence: number;
    language: string;
  };
}

interface DeepLTranslation {
  detected_source_language: string;
  text: string;
}

interface DeepLResponse {
  translations: DeepLTranslation[];
}

/**
 * Translation Service Class
 */
class TranslationService {
  private libreTranslateUrl: string;
  private deepLApiKey: string | undefined;
  private defaultProvider: TranslationProvider;

  constructor() {
    this.libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';
    this.deepLApiKey = process.env.DEEPL_API_KEY;
    this.defaultProvider =
      (process.env.TRANSLATION_PROVIDER as TranslationProvider) || 'libretranslate';

    logger.info(`Translation service initialized with provider: ${this.defaultProvider}`);
    logger.debug(`LibreTranslate URL: ${this.libreTranslateUrl}`);
    logger.debug(`DeepL API Key: ${this.deepLApiKey ? '***configured***' : 'not configured'}`);
  }

  /**
   * Check if LibreTranslate is available
   */
  async isLibreTranslateAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.libreTranslateUrl}/languages`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      logger.debug('LibreTranslate not available:', error);
      return false;
    }
  }

  /**
   * Check if DeepL is available
   */
  isDeepLAvailable(): boolean {
    return Boolean(this.deepLApiKey);
  }

  /**
   * Translate text using LibreTranslate
   */
  async translateWithLibreTranslate(
    text: string,
    options: TranslationOptions
  ): Promise<TranslationResult> {
    const { sourceLang = 'auto', targetLang, format = 'text' } = options;

    try {
      const response = await fetch(`${this.libreTranslateUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LibreTranslate error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as LibreTranslateResponse;

      return {
        translatedText: result.translatedText,
        detectedSourceLanguage: result.detectedLanguage?.language,
        provider: 'libretranslate',
      };
    } catch (error) {
      logger.error('LibreTranslate translation failed:', error);
      throw error;
    }
  }

  /**
   * Translate text using DeepL API
   */
  async translateWithDeepL(text: string, options: TranslationOptions): Promise<TranslationResult> {
    if (!this.deepLApiKey) {
      throw new Error('DeepL API key not configured');
    }

    const { sourceLang, targetLang } = options;

    try {
      // DeepL language codes (some need mapping)
      const deepLTargetLang = targetLang.toUpperCase();

      const params = new URLSearchParams({
        auth_key: this.deepLApiKey,
        text: text,
        target_lang: deepLTargetLang,
      });

      if (sourceLang && sourceLang !== 'auto') {
        params.append('source_lang', sourceLang.toUpperCase());
      }

      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepL error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as DeepLResponse;

      if (!result.translations || result.translations.length === 0) {
        throw new Error('DeepL returned no translations');
      }

      return {
        translatedText: result.translations[0].text,
        detectedSourceLanguage: result.translations[0].detected_source_language?.toLowerCase(),
        provider: 'deepl',
      };
    } catch (error) {
      logger.error('DeepL translation failed:', error);
      throw error;
    }
  }

  /**
   * Translate text using the configured provider (with fallback)
   */
  async translate(text: string, options: TranslationOptions): Promise<TranslationResult> {
    // Skip translation if source and target are the same
    if (
      options.sourceLang &&
      options.sourceLang !== 'auto' &&
      options.sourceLang === options.targetLang
    ) {
      return {
        translatedText: text,
        detectedSourceLanguage: options.sourceLang,
        provider: this.defaultProvider,
      };
    }

    // Empty text check
    if (!text || text.trim().length === 0) {
      return {
        translatedText: '',
        provider: this.defaultProvider,
      };
    }

    const provider = this.defaultProvider;

    try {
      switch (provider) {
        case 'deepl':
          if (this.isDeepLAvailable()) {
            return await this.translateWithDeepL(text, options);
          }
          // Fallback to LibreTranslate
          logger.warn('DeepL not available, falling back to LibreTranslate');
          return await this.translateWithLibreTranslate(text, options);

        case 'libretranslate':
          return await this.translateWithLibreTranslate(text, options);

        case 'auto':
        default:
          // Try DeepL first, then LibreTranslate
          if (this.isDeepLAvailable()) {
            try {
              return await this.translateWithDeepL(text, options);
            } catch (error) {
              logger.warn('DeepL failed, falling back to LibreTranslate:', error);
            }
          }
          return await this.translateWithLibreTranslate(text, options);
      }
    } catch (error) {
      logger.error('All translation providers failed:', error);
      throw error;
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(texts: string[], options: TranslationOptions): Promise<TranslationResult[]> {
    // Process in sequence to avoid rate limiting
    const results: TranslationResult[] = [];

    for (const text of texts) {
      try {
        const result = await this.translate(text, options);
        results.push(result);
      } catch (error) {
        // On error, push a placeholder result
        logger.error(`Batch translation failed for text: ${text.substring(0, 50)}...`, error);
        results.push({
          translatedText: `[Translation failed] ${text}`,
          provider: this.defaultProvider,
        });
      }
    }

    return results;
  }

  /**
   * Get list of supported languages from LibreTranslate
   */
  async getLibreTranslateLanguages(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await fetch(`${this.libreTranslateUrl}/languages`);
      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.status}`);
      }
      return (await response.json()) as Array<{ code: string; name: string }>;
    } catch (error) {
      logger.error('Failed to get LibreTranslate languages:', error);
      throw error;
    }
  }

  /**
   * Detect language of text using LibreTranslate
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    try {
      const response = await fetch(`${this.libreTranslateUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: text }),
      });

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.status}`);
      }

      const result = (await response.json()) as Array<{ language: string; confidence: number }>;

      if (!result || result.length === 0) {
        throw new Error('No language detected');
      }

      return result[0];
    } catch (error) {
      logger.error('Language detection failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const translationService = new TranslationService();

// Export class for testing
export { TranslationService };
