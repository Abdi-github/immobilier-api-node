import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import { calculatePaginationMeta, PaginationMeta } from '../../shared/utils/response.helper.js';
import { translationService } from '../../shared/services/translation.service.js';
import { Property } from '../property/property.model.js';
import { SupportedLanguage } from '../location/index.js';

import {
  PropertyTranslationRepository,
  propertyTranslationRepository,
} from './property-translation.repository.js';
import {
  PropertyTranslationQueryDto,
  PropertyTranslationCreateDto,
  PropertyTranslationUpdateDto,
  PropertyTranslationResponseDto,
  PropertyTranslationFilterOptions,
  PropertyTranslationPaginationOptions,
  TranslationStatusSummary,
  BulkTranslateRequestDto,
} from './property-translation.types.js';

/**
 * Property Translation Service
 * Business logic for property translation operations
 */
export class PropertyTranslationService {
  constructor(private repository: PropertyTranslationRepository) {}

  /**
   * Parse query DTO into filter and pagination options
   */
  private parseQueryDto(query: PropertyTranslationQueryDto): {
    filters: PropertyTranslationFilterOptions;
    pagination: PropertyTranslationPaginationOptions;
  } {
    const filters: PropertyTranslationFilterOptions = {};
    const pagination: PropertyTranslationPaginationOptions = {
      page: query.page || 1,
      limit: query.limit || 10,
      sort: query.sort,
      order: query.order,
    };

    if (query.property_id) filters.property_id = query.property_id;
    if (query.language) filters.language = query.language;
    if (query.source) filters.source = query.source;
    if (query.approval_status) filters.approval_status = query.approval_status;
    if (query.approved_by) filters.approved_by = query.approved_by;
    if (query.search) filters.search = query.search;

    return { filters, pagination };
  }

  /**
   * Find all translations with filtering and pagination
   */
  async findAll(query: PropertyTranslationQueryDto): Promise<{
    data: PropertyTranslationResponseDto[];
    meta: PaginationMeta;
  }> {
    const { filters, pagination } = this.parseQueryDto(query);
    const result = await this.repository.findAll(filters, pagination);

    return {
      data: result.translations,
      meta: calculatePaginationMeta(result.page, result.limit, result.total),
    };
  }

  /**
   * Find translation by ID
   */
  async findById(id: string): Promise<PropertyTranslationResponseDto> {
    const translation = await this.repository.findById(id);

    if (!translation) {
      throw NotFoundError('Translation not found');
    }

    return translation;
  }

  /**
   * Find translation by property ID and language
   */
  async findByPropertyAndLanguage(
    propertyId: string,
    language: SupportedLanguage
  ): Promise<PropertyTranslationResponseDto> {
    const translation = await this.repository.findByPropertyAndLanguage(propertyId, language);

    if (!translation) {
      throw NotFoundError(`Translation not found for language: ${language}`);
    }

    return translation;
  }

  /**
   * Find all translations for a property
   */
  async findByPropertyId(propertyId: string): Promise<PropertyTranslationResponseDto[]> {
    // Verify property exists
    const property = await Property.findById(propertyId).exec();
    if (!property) {
      throw NotFoundError('Property not found');
    }

    return this.repository.findByPropertyId(propertyId);
  }

  /**
   * Find approved translation for public display
   */
  async findApprovedByPropertyAndLanguage(
    propertyId: string,
    language: SupportedLanguage
  ): Promise<PropertyTranslationResponseDto | null> {
    const translation = await this.repository.findByPropertyAndLanguage(propertyId, language);

    if (!translation || translation.approval_status !== 'APPROVED') {
      return null;
    }

    return translation;
  }

  /**
   * Find all pending translations
   */
  async findPending(query: PropertyTranslationQueryDto): Promise<{
    data: PropertyTranslationResponseDto[];
    meta: PaginationMeta;
  }> {
    const { pagination } = this.parseQueryDto(query);
    const result = await this.repository.findPending(pagination);

    return {
      data: result.translations,
      meta: calculatePaginationMeta(result.page, result.limit, result.total),
    };
  }

  /**
   * Get translation status summary for a property
   */
  async getTranslationStatus(propertyId: string): Promise<TranslationStatusSummary> {
    // Get property source language
    const property = await Property.findById(propertyId).exec();
    if (!property) {
      throw NotFoundError('Property not found');
    }

    const translations = await this.repository.findByPropertyId(propertyId);
    const missingLanguages = await this.repository.getMissingLanguages(propertyId);

    const allApproved =
      translations.length > 0 &&
      translations.every((t) => t.approval_status === 'APPROVED') &&
      missingLanguages.length === 0;

    return {
      property_id: propertyId,
      source_language: property.source_language,
      translations: translations.map((t) => ({
        language: t.language,
        status: t.approval_status,
        source: t.source,
      })),
      missing_languages: missingLanguages,
      all_approved: allApproved,
    };
  }

  /**
   * Create a new translation
   */
  async create(data: PropertyTranslationCreateDto): Promise<PropertyTranslationResponseDto> {
    // Verify property exists
    const property = await Property.findById(data.property_id).exec();
    if (!property) {
      throw NotFoundError('Property not found');
    }

    // Check if translation already exists
    const exists = await this.repository.exists(data.property_id, data.language);
    if (exists) {
      throw ConflictError(`Translation already exists for language: ${data.language}`);
    }

    const translation = await this.repository.create(data);

    logger.info(
      `Translation created for property ${data.property_id} in language ${data.language}`
    );

    return translation;
  }

  /**
   * Create original translation from property (source language)
   */
  async createOriginalTranslation(
    propertyId: string,
    title: string,
    description: string
  ): Promise<PropertyTranslationResponseDto> {
    const property = await Property.findById(propertyId).exec();
    if (!property) {
      throw NotFoundError('Property not found');
    }

    // Check if original translation already exists
    const exists = await this.repository.exists(propertyId, property.source_language);
    if (exists) {
      throw ConflictError('Original translation already exists');
    }

    return this.repository.create({
      property_id: propertyId,
      language: property.source_language,
      title,
      description,
      source: 'original',
      quality_score: 100,
    });
  }

  /**
   * Request translations for missing languages using translation service
   * Uses LibreTranslate (free, unlimited) or DeepL based on configuration
   */
  async requestTranslations(
    data: BulkTranslateRequestDto
  ): Promise<PropertyTranslationResponseDto[]> {
    const property = await Property.findById(data.property_id).exec();
    if (!property) {
      throw NotFoundError('Property not found');
    }

    // Get the source translation
    const sourceTranslation = await this.repository.findByPropertyAndLanguage(
      data.property_id,
      property.source_language
    );

    if (!sourceTranslation) {
      throw BadRequestError(
        'Source language translation must exist before requesting translations'
      );
    }

    // Determine target languages
    const allLanguages: SupportedLanguage[] = ['en', 'fr', 'de', 'it'];
    const targetLanguages =
      data.target_languages || allLanguages.filter((lang) => lang !== property.source_language);

    // Check which translations are missing
    const missingLanguages = await this.repository.getMissingLanguages(data.property_id);
    const languagesToTranslate = targetLanguages.filter((lang) => missingLanguages.includes(lang));

    if (languagesToTranslate.length === 0) {
      return [];
    }

    // Check if translation service is available
    const isTranslationAvailable =
      (await translationService.isLibreTranslateAvailable()) ||
      translationService.isDeepLAvailable();

    const translationsToCreate: PropertyTranslationCreateDto[] = [];

    for (const targetLang of languagesToTranslate) {
      let translatedTitle: string;
      let translatedDescription: string;
      let source: 'deepl' | 'libretranslate' | 'original' = 'libretranslate';
      let qualityScore: number | undefined;

      if (isTranslationAvailable) {
        try {
          // Translate title
          const titleResult = await translationService.translate(sourceTranslation.title, {
            sourceLang: property.source_language,
            targetLang,
          });
          translatedTitle = titleResult.translatedText;

          // Translate description
          const descResult = await translationService.translate(sourceTranslation.description, {
            sourceLang: property.source_language,
            targetLang,
          });
          translatedDescription = descResult.translatedText;

          // Set source based on provider used
          source = titleResult.provider === 'deepl' ? 'deepl' : 'libretranslate';
          qualityScore = source === 'deepl' ? 95 : 85;

          logger.info(
            `Translated property ${data.property_id} from ${property.source_language} to ${targetLang} using ${source}`
          );
        } catch (error) {
          // On translation failure, create placeholder
          logger.error(`Translation failed for ${data.property_id} to ${targetLang}:`, error);
          translatedTitle = `[${targetLang.toUpperCase()}] ${sourceTranslation.title}`;
          translatedDescription = `[Translation to ${targetLang} pending]\n\n${sourceTranslation.description}`;
          qualityScore = 0;
        }
      } else {
        // No translation service available, create placeholders
        logger.warn(`No translation service available. Creating placeholder for ${targetLang}`);
        translatedTitle = `[${targetLang.toUpperCase()}] ${sourceTranslation.title}`;
        translatedDescription = `[Translation to ${targetLang} pending]\n\n${sourceTranslation.description}`;
        qualityScore = 0;
      }

      translationsToCreate.push({
        property_id: data.property_id,
        language: targetLang,
        title: translatedTitle,
        description: translatedDescription,
        source,
        quality_score: qualityScore,
      });
    }

    const translations = await this.repository.createMany(translationsToCreate);

    logger.info(
      `Translation requests completed for property ${data.property_id}: ${languagesToTranslate.join(', ')}`
    );

    return translations;
  }

  /**
   * Update a translation
   */
  async update(
    id: string,
    data: PropertyTranslationUpdateDto
  ): Promise<PropertyTranslationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('Translation not found');
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw NotFoundError('Translation not found');
    }

    logger.info(`Translation ${id} updated`);

    return updated;
  }

  /**
   * Approve a translation
   */
  async approve(id: string, approvedBy: string): Promise<PropertyTranslationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('Translation not found');
    }

    if (existing.approval_status === 'APPROVED') {
      throw BadRequestError('Translation is already approved');
    }

    const approved = await this.repository.approve(id, approvedBy);
    if (!approved) {
      throw NotFoundError('Translation not found');
    }

    logger.info(`Translation ${id} approved by ${approvedBy}`);

    return approved;
  }

  /**
   * Approve multiple translations
   */
  async bulkApprove(ids: string[], approvedBy: string): Promise<PropertyTranslationResponseDto[]> {
    const results: PropertyTranslationResponseDto[] = [];

    for (const id of ids) {
      try {
        const approved = await this.approve(id, approvedBy);
        results.push(approved);
      } catch (error) {
        logger.warn(`Failed to approve translation ${id}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Reject a translation
   */
  async reject(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<PropertyTranslationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('Translation not found');
    }

    if (existing.approval_status === 'REJECTED') {
      throw BadRequestError('Translation is already rejected');
    }

    const rejected = await this.repository.reject(id, rejectedBy, reason);
    if (!rejected) {
      throw NotFoundError('Translation not found');
    }

    logger.info(`Translation ${id} rejected by ${rejectedBy}: ${reason}`);

    return rejected;
  }

  /**
   * Reset translation to pending status
   */
  async resetToPending(id: string): Promise<PropertyTranslationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('Translation not found');
    }

    if (existing.approval_status === 'PENDING') {
      throw BadRequestError('Translation is already pending');
    }

    const reset = await this.repository.resetToPending(id);
    if (!reset) {
      throw NotFoundError('Translation not found');
    }

    logger.info(`Translation ${id} reset to pending`);

    return reset;
  }

  /**
   * Delete a translation
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('Translation not found');
    }

    // Don't allow deleting the original translation if it's the only one
    if (existing.source === 'original') {
      const allTranslations = await this.repository.findByPropertyId(existing.property_id);
      if (allTranslations.length === 1) {
        throw BadRequestError('Cannot delete the only translation for a property');
      }
    }

    await this.repository.delete(id);

    logger.info(`Translation ${id} deleted`);
  }

  /**
   * Delete all translations for a property
   */
  async deleteByPropertyId(propertyId: string): Promise<number> {
    const count = await this.repository.deleteByPropertyId(propertyId);

    logger.info(`Deleted ${count} translations for property ${propertyId}`);

    return count;
  }

  /**
   * Get translation statistics
   */
  async getStatistics(): Promise<{
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    const [byStatus, bySource] = await Promise.all([
      this.repository.countByStatus(),
      this.repository.countBySource(),
    ]);

    return { byStatus, bySource };
  }
}

// Export singleton instance
export const propertyTranslationService = new PropertyTranslationService(
  propertyTranslationRepository
);
