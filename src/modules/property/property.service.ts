import { PropertyRepository, propertyRepository } from './property.repository.js';
import type { PropertyStatus } from './property.model.js';
import {
  PropertyQueryDto,
  PropertyCreateDto,
  PropertyUpdateDto,
  PropertyResponseDto,
  PropertyListResponseDto,
  PropertyCursorListResponseDto,
  PropertyWithPopulated,
  PropertyStatisticsDto,
  PropertyImageCreateDto,
  PropertyImageUpdateDto,
  PropertyImageResponseDto,
  PropertyImageUploadDto,
  PropertyImageUploadResultDto,
  BatchImageUploadResultDto,
  SupportedLanguage,
  IMultilingualText,
  PROPERTY_SORT_FIELDS,
  PropertySortField,
} from './property.types.js';
import { AppError } from '../../shared/errors/AppError.js';
import { cloudinaryService, ImageUploadOptions } from '../../shared/services/cloudinary.service.js';
import { logger } from '../../shared/logger/index.js';
import {
  PropertyTranslationRepository,
  propertyTranslationRepository,
} from '../property-translation/index.js';
import { User } from '../user/user.model.js';
import {
  sendPropertyApproved,
  sendPropertyRejected,
  sendPropertyPublished,
} from '../email/index.js';

/**
 * Translation data to be added to property response
 */
interface PropertyTranslationData {
  title: string;
  description: string;
  source: 'original' | 'deepl' | 'libretranslate' | 'human';
  quality_score?: number;
}

/**
 * Property Service
 * Handles business logic for property operations
 */
export class PropertyService {
  constructor(
    private repository: PropertyRepository,
    private translationRepository: PropertyTranslationRepository
  ) {}

  /**
   * Validate and return sort field
   */
  private validateSortField(field: string | undefined): PropertySortField {
    if (!field) return 'created_at';
    if (PROPERTY_SORT_FIELDS.includes(field as PropertySortField)) {
      return field as PropertySortField;
    }
    return 'created_at';
  }

  /**
   * Extract localized text from multilingual field
   */
  private getLocalizedText(
    text: IMultilingualText | string | undefined,
    lang?: SupportedLanguage
  ): IMultilingualText | string | undefined {
    if (!text) return undefined;
    if (typeof text === 'string') return text;
    if (lang && text[lang]) return text[lang];
    return text;
  }

  /**
   * Get translation for a property in the requested language
   * Falls back to source language if requested language not available
   * Only returns APPROVED translations (or original if source language)
   */
  private async getTranslationForProperty(
    propertyId: string,
    requestedLang: SupportedLanguage,
    sourceLanguage: SupportedLanguage,
    includeAllStatuses = false
  ): Promise<PropertyTranslationData | undefined> {
    try {
      // Try to get translation in requested language
      const translation = await this.translationRepository.findByPropertyAndLanguage(
        propertyId,
        requestedLang
      );

      if (translation) {
        // For non-original translations, only return if approved (unless includeAllStatuses)
        const isSourceLanguage = requestedLang === sourceLanguage;
        if (isSourceLanguage || translation.approval_status === 'APPROVED' || includeAllStatuses) {
          return {
            title: translation.title,
            description: translation.description,
            source: translation.source,
            quality_score: translation.quality_score,
          };
        }
      }

      // Fallback to source language if different from requested
      if (requestedLang !== sourceLanguage) {
        const sourceTranslation = await this.translationRepository.findByPropertyAndLanguage(
          propertyId,
          sourceLanguage
        );

        if (sourceTranslation) {
          return {
            title: sourceTranslation.title,
            description: sourceTranslation.description,
            source: sourceTranslation.source,
            quality_score: sourceTranslation.quality_score,
          };
        }
      }

      return undefined;
    } catch (error) {
      logger.warn(`Failed to fetch translation for property ${propertyId}: ${error}`);
      return undefined;
    }
  }

  /**
   * Get translations for multiple properties (batch operation for list views)
   * Returns a map of propertyId -> translation data
   */
  private async getTranslationsForProperties(
    properties: PropertyWithPopulated[],
    requestedLang: SupportedLanguage,
    includeAllStatuses = false
  ): Promise<Map<string, PropertyTranslationData>> {
    const translationMap = new Map<string, PropertyTranslationData>();

    try {
      // Get all translations for these properties in parallel
      const translationPromises = properties.map(async (property) => {
        const propertyId = property._id.toString();
        const translation = await this.getTranslationForProperty(
          propertyId,
          requestedLang,
          property.source_language,
          includeAllStatuses
        );
        return { propertyId, translation };
      });

      const results = await Promise.all(translationPromises);

      for (const { propertyId, translation } of results) {
        if (translation) {
          translationMap.set(propertyId, translation);
        }
      }
    } catch (error) {
      logger.warn(`Failed to batch fetch translations: ${error}`);
    }

    return translationMap;
  }

  /**
   * Transform property with populated data to response DTO
   */
  private toResponseDto(
    property: PropertyWithPopulated,
    lang?: SupportedLanguage,
    images?: PropertyImageResponseDto[],
    translationData?: PropertyTranslationData
  ): PropertyResponseDto {
    const dto: PropertyResponseDto = {
      id: property._id.toString(),
      external_id: property.external_id,
      external_url: property.external_url,
      source_language: property.source_language,
      transaction_type: property.transaction_type,
      price: property.price,
      currency: property.currency,
      additional_costs: property.additional_costs,
      rooms: property.rooms,
      surface: property.surface,
      address: property.address,
      postal_code: property.postal_code,
      proximity: property.proximity,
      status: property.status,
      published_at: property.published_at,
      reviewed_by: property.reviewed_by,
      reviewed_at: property.reviewed_at,
      rejection_reason: property.rejection_reason,
      created_at: property.created_at,
      updated_at: property.updated_at,

      // IDs (always include for reference)
      category_id:
        property.category_id?._id?.toString() ||
        (typeof property.category_id === 'string' ? property.category_id : ''),
      agency_id:
        property.agency_id?._id?.toString() ||
        (typeof property.agency_id === 'string' ? property.agency_id : undefined),
      owner_id: property.owner_id,
      city_id:
        property.city_id?._id?.toString() ||
        (typeof property.city_id === 'string' ? property.city_id : ''),
      canton_id:
        property.canton_id?._id?.toString() ||
        (typeof property.canton_id === 'string' ? property.canton_id : ''),
      amenities:
        property.amenities?.map(
          (a) => a._id?.toString() || (typeof a === 'string' ? a : String(a))
        ) || [],
    };

    // Add populated category
    if (
      property.category_id &&
      typeof property.category_id === 'object' &&
      property.category_id._id
    ) {
      dto.category = {
        id: property.category_id._id.toString(),
        name: this.getLocalizedText(property.category_id.name, lang) as IMultilingualText | string,
        section: property.category_id.section,
      };
    }

    // Add populated agency
    if (property.agency_id && typeof property.agency_id === 'object' && property.agency_id._id) {
      dto.agency = {
        id: property.agency_id._id.toString(),
        name: property.agency_id.name,
        slug: property.agency_id.slug,
      };
    }

    // Add populated city
    if (property.city_id && typeof property.city_id === 'object' && property.city_id._id) {
      dto.city = {
        id: property.city_id._id.toString(),
        name: this.getLocalizedText(property.city_id.name, lang) as IMultilingualText | string,
      };
    }

    // Add populated canton
    if (property.canton_id && typeof property.canton_id === 'object' && property.canton_id._id) {
      dto.canton = {
        id: property.canton_id._id.toString(),
        name: this.getLocalizedText(property.canton_id.name, lang) as IMultilingualText | string,
        code: property.canton_id.code,
      };
    }

    // Add populated amenities
    if (property.amenities && property.amenities.length > 0) {
      dto.amenity_list = property.amenities
        .filter((a) => a && typeof a === 'object' && a._id)
        .map((a) => ({
          id: a._id.toString(),
          name: this.getLocalizedText(a.name, lang) as IMultilingualText | string,
          icon: a.icon,
        }));
    }

    // Add images if provided
    if (images) {
      dto.images = images;
    }

    // Add translation if provided
    if (translationData) {
      // Set convenience fields at root level
      dto.title = translationData.title;
      dto.description = translationData.description;

      // Also include translation metadata
      dto.translation = {
        title: translationData.title,
        description: translationData.description,
        source: translationData.source,
        quality_score: translationData.quality_score,
      };
    }

    return dto;
  }

  /**
   * Transform image to response DTO
   */
  private toImageResponseDto(image: {
    _id: string | { toString: () => string };
    url: string;
    secure_url?: string;
    thumbnail_url?: string;
    thumbnail_secure_url?: string;
    alt_text?: string;
    caption?: string;
    sort_order: number;
    is_primary: boolean;
    public_id?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
    source?: 'cloudinary' | 'external' | 'local';
    original_filename?: string;
  }): PropertyImageResponseDto {
    return {
      id: typeof image._id === 'string' ? image._id : image._id.toString(),
      url: image.url,
      secure_url: image.secure_url,
      thumbnail_url: image.thumbnail_url,
      thumbnail_secure_url: image.thumbnail_secure_url,
      alt_text: image.alt_text,
      caption: image.caption,
      sort_order: image.sort_order,
      is_primary: image.is_primary,
      public_id: image.public_id,
      width: image.width,
      height: image.height,
      format: image.format,
      bytes: image.bytes,
      source: image.source,
      original_filename: image.original_filename,
    };
  }

  /**
   * Get all properties with filtering and offset pagination
   */
  async findAll(query: PropertyQueryDto): Promise<PropertyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'published_at');
    const order = query.order ?? 'desc';
    const lang = query.lang || 'en';
    const includeUnpublished = query.include_unpublished ?? false;

    const filters = {
      canton_id: query.canton_id,
      city_id: query.city_id,
      postal_code: query.postal_code,
      category_id: query.category_id,
      section: query.section,
      transaction_type: query.transaction_type,
      status: query.status,
      agency_id: query.agency_id,
      price_min: query.price_min,
      price_max: query.price_max,
      rooms_min: query.rooms_min,
      rooms_max: query.rooms_max,
      surface_min: query.surface_min,
      surface_max: query.surface_max,
      amenities: query.amenities,
      search: query.search,
    };

    const { properties, total } = await this.repository.findAll(
      filters,
      { page, limit, sort, order },
      includeUnpublished
    );

    const totalPages = Math.ceil(total / limit);

    // Batch fetch translations for all properties (public: only approved)
    const translationMap = await this.getTranslationsForProperties(
      properties,
      lang,
      includeUnpublished // Admin can see pending translations
    );

    // Batch fetch images for all properties
    const propertyIds = properties.map((p) => p._id.toString());
    const imageMap = await this.repository.getImagesForProperties(propertyIds);

    return {
      data: properties.map((prop) => {
        const translation = translationMap.get(prop._id.toString());
        const images = imageMap.get(prop._id.toString()) || [];
        const imagesDtos = images.map((img) => this.toImageResponseDto(img));
        return this.toResponseDto(prop, lang, imagesDtos, translation);
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get all properties with cursor-based pagination
   */
  async findAllWithCursor(query: PropertyQueryDto): Promise<PropertyCursorListResponseDto> {
    const limit = query.limit ?? 20;
    const lang = query.lang || 'en';
    const includeUnpublished = query.include_unpublished ?? false;

    const filters = {
      canton_id: query.canton_id,
      city_id: query.city_id,
      postal_code: query.postal_code,
      category_id: query.category_id,
      section: query.section,
      transaction_type: query.transaction_type,
      status: query.status,
      agency_id: query.agency_id,
      price_min: query.price_min,
      price_max: query.price_max,
      rooms_min: query.rooms_min,
      rooms_max: query.rooms_max,
      surface_min: query.surface_min,
      surface_max: query.surface_max,
      amenities: query.amenities,
      search: query.search,
    };

    const result = await this.repository.findAllWithCursor(
      filters,
      {
        limit,
        cursor: query.cursor,
        direction: query.cursor_direction ?? 'next',
      },
      includeUnpublished
    );

    // Batch fetch translations for all properties
    const translationMap = await this.getTranslationsForProperties(
      result.properties,
      lang,
      includeUnpublished
    );

    // Batch fetch images for all properties
    const propertyIds = result.properties.map((p) => p._id.toString());
    const imageMap = await this.repository.getImagesForProperties(propertyIds);

    return {
      data: result.properties.map((prop) => {
        const translation = translationMap.get(prop._id.toString());
        const images = imageMap.get(prop._id.toString()) || [];
        const imagesDtos = images.map((img) => this.toImageResponseDto(img));
        return this.toResponseDto(prop, lang, imagesDtos, translation);
      }),
      meta: {
        total: result.total,
        limit,
        has_next: result.hasNext,
        has_prev: result.hasPrev,
        next_cursor: result.nextCursor,
        prev_cursor: result.prevCursor,
      },
    };
  }

  /**
   * Get a single property by ID (public - only published)
   */
  async findById(
    id: string,
    lang?: SupportedLanguage,
    includeImages = false
  ): Promise<PropertyResponseDto> {
    const property = await this.repository.findById(id);

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Public access only returns PUBLISHED properties
    if (property.status !== 'PUBLISHED') {
      throw new AppError('Property not found', 404);
    }

    let images: PropertyImageResponseDto[] | undefined;
    if (includeImages) {
      const propertyImages = await this.repository.getImages(id);
      images = propertyImages.map((img) => this.toImageResponseDto(img));
    }

    // Fetch translation for the property (public: only approved)
    const requestedLang = lang || property.source_language;
    const translation = await this.getTranslationForProperty(
      id,
      requestedLang,
      property.source_language,
      false // Only approved translations for public
    );

    return this.toResponseDto(property, lang, images, translation);
  }

  /**
   * Get a single property by ID (admin - any status)
   */
  async adminFindById(
    id: string,
    lang?: SupportedLanguage,
    includeImages = false
  ): Promise<PropertyResponseDto> {
    const property = await this.repository.findById(id);

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    let images: PropertyImageResponseDto[] | undefined;
    if (includeImages) {
      const propertyImages = await this.repository.getImages(id);
      images = propertyImages.map((img) => this.toImageResponseDto(img));
    }

    // Fetch translation for the property (admin: include all statuses)
    const requestedLang = lang || property.source_language;
    const translation = await this.getTranslationForProperty(
      id,
      requestedLang,
      property.source_language,
      true // Include pending/rejected translations for admin
    );

    return this.toResponseDto(property, lang, images, translation);
  }

  /**
   * Get a single property by external ID
   */
  async findByExternalId(
    externalId: string,
    lang?: SupportedLanguage
  ): Promise<PropertyResponseDto> {
    const property = await this.repository.findByExternalId(externalId);

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Fetch translation for the property (public: only approved)
    const requestedLang = lang || property.source_language;
    const translation = await this.getTranslationForProperty(
      property._id.toString(),
      requestedLang,
      property.source_language,
      false // Only approved translations for public
    );

    return this.toResponseDto(property, lang, undefined, translation);
  }

  /**
   * Get properties by canton
   */
  async findByCanton(cantonId: string, query: PropertyQueryDto): Promise<PropertyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'published_at');
    const order = query.order ?? 'desc';
    const lang = query.lang || 'en';
    const includeUnpublished = query.include_unpublished ?? false;

    const { properties, total } = await this.repository.findByCanton(
      cantonId,
      { page, limit, sort, order },
      includeUnpublished
    );

    const totalPages = Math.ceil(total / limit);

    // Batch fetch translations for all properties
    const translationMap = await this.getTranslationsForProperties(
      properties,
      lang,
      includeUnpublished
    );

    return {
      data: properties.map((prop) => {
        const translation = translationMap.get(prop._id.toString());
        return this.toResponseDto(prop, lang, undefined, translation);
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get properties by city
   */
  async findByCity(cityId: string, query: PropertyQueryDto): Promise<PropertyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'published_at');
    const order = query.order ?? 'desc';
    const lang = query.lang || 'en';
    const includeUnpublished = query.include_unpublished ?? false;

    const { properties, total } = await this.repository.findByCity(
      cityId,
      { page, limit, sort, order },
      includeUnpublished
    );

    const totalPages = Math.ceil(total / limit);

    // Batch fetch translations for all properties
    const translationMap = await this.getTranslationsForProperties(
      properties,
      lang,
      includeUnpublished
    );

    return {
      data: properties.map((prop) => {
        const translation = translationMap.get(prop._id.toString());
        return this.toResponseDto(prop, lang, undefined, translation);
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get properties by agency
   */
  async findByAgency(agencyId: string, query: PropertyQueryDto): Promise<PropertyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'published_at');
    const order = query.order ?? 'desc';
    const lang = query.lang || 'en';
    const includeUnpublished = query.include_unpublished ?? false;

    const { properties, total } = await this.repository.findByAgency(
      agencyId,
      { page, limit, sort, order },
      includeUnpublished
    );

    const totalPages = Math.ceil(total / limit);

    // Batch fetch translations for all properties
    const translationMap = await this.getTranslationsForProperties(
      properties,
      lang,
      includeUnpublished
    );

    return {
      data: properties.map((prop) => {
        const translation = translationMap.get(prop._id.toString());
        return this.toResponseDto(prop, lang, undefined, translation);
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get properties by category
   */
  async findByCategory(
    categoryId: string,
    query: PropertyQueryDto
  ): Promise<PropertyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'published_at');
    const order = query.order ?? 'desc';
    const lang = query.lang || 'en';
    const includeUnpublished = query.include_unpublished ?? false;

    const { properties, total } = await this.repository.findByCategory(
      categoryId,
      { page, limit, sort, order },
      includeUnpublished
    );

    const totalPages = Math.ceil(total / limit);

    // Batch fetch translations for all properties
    const translationMap = await this.getTranslationsForProperties(
      properties,
      lang,
      includeUnpublished
    );

    return {
      data: properties.map((prop) => {
        const translation = translationMap.get(prop._id.toString());
        return this.toResponseDto(prop, lang, undefined, translation);
      }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Generate a unique external ID (7-digit numeric string like seed data)
   */
  private async generateExternalId(): Promise<string> {
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      // Generate a 7-digit number (1000000 to 9999999)
      const id = Math.floor(1000000 + Math.random() * 9000000).toString();
      const exists = await this.repository.externalIdExists(id);
      if (!exists) {
        return id;
      }
    }
    // Fallback: use timestamp-based ID
    return Date.now().toString().slice(-7);
  }

  /**
   * Create a new property
   */
  async create(data: PropertyCreateDto): Promise<PropertyResponseDto> {
    // Auto-generate external_id if not provided
    if (!data.external_id) {
      data.external_id = await this.generateExternalId();
    } else {
      // Check for duplicate external_id if provided
      const externalIdExists = await this.repository.externalIdExists(data.external_id);
      if (externalIdExists) {
        throw new AppError('A property with this external ID already exists', 409);
      }
    }

    // Set default status if not provided
    if (!data.status) {
      data.status = 'DRAFT';
    }

    const property = await this.repository.create(data);

    // Fetch with populated data
    const populated = await this.repository.findById(property._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Update an existing property
   */
  async update(id: string, data: PropertyUpdateDto): Promise<PropertyResponseDto> {
    // Check if property exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    // Check for duplicate external_id if updating
    if (data.external_id && data.external_id !== existing.external_id) {
      const externalIdExists = await this.repository.externalIdExists(data.external_id, id);
      if (externalIdExists) {
        throw new AppError('A property with this external ID already exists', 409);
      }
    }

    // Re-approval logic: if a PUBLISHED property receives a substantive edit,
    // automatically revert its status to PENDING_APPROVAL so an admin can review.
    const substantiveFields = [
      'price',
      'additional_costs',
      'rooms',
      'surface',
      'address',
      'category_id',
      'city_id',
      'canton_id',
      'postal_code',
      'transaction_type',
      'amenities',
    ] as const;
    const hasSubstantiveChange = substantiveFields.some(
      (field) => data[field as keyof PropertyUpdateDto] !== undefined
    );

    if (existing.status === 'PUBLISHED' && hasSubstantiveChange) {
      (data as Record<string, unknown>).status = 'PENDING_APPROVAL';
      logger.info(`Property ${id} status reverted to PENDING_APPROVAL after substantive edit`);
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update property', 500);
    }

    // Fetch with populated data
    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Delete a property
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    // Delete all images first
    await this.repository.deleteAllImages(id);

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete property', 500);
    }
  }

  /**
   * Submit property for approval
   */
  async submitForApproval(id: string): Promise<PropertyResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft properties can be submitted for approval', 400);
    }

    const updated = await this.repository.updateStatus(id, 'PENDING_APPROVAL');
    if (!updated) {
      throw new AppError('Failed to submit property for approval', 500);
    }

    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Approve a property
   */
  async approve(id: string, reviewedBy: string): Promise<PropertyResponseDto> {
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.status !== 'PENDING_APPROVAL') {
      throw new AppError('Only pending properties can be approved', 400);
    }

    const updated = await this.repository.approve(id, reviewedBy);
    if (!updated) {
      throw new AppError('Failed to approve property', 500);
    }

    // Send email notification to property owner/agent (non-blocking)
    this.sendPropertyStatusEmail(existing, 'APPROVED').catch((err) => {
      logger.error('Failed to send property approval email', { propertyId: id, error: err });
    });

    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Reject a property
   */
  async reject(id: string, reviewedBy: string, reason: string): Promise<PropertyResponseDto> {
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.status !== 'PENDING_APPROVAL') {
      throw new AppError('Only pending properties can be rejected', 400);
    }

    const updated = await this.repository.reject(id, reviewedBy, reason);
    if (!updated) {
      throw new AppError('Failed to reject property', 500);
    }

    // Send email notification to property owner/agent (non-blocking)
    this.sendPropertyStatusEmail(existing, 'REJECTED', reason).catch((err) => {
      logger.error('Failed to send property rejection email', { propertyId: id, error: err });
    });

    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Publish an approved property
   */
  async publish(id: string): Promise<PropertyResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.status !== 'APPROVED') {
      throw new AppError('Only approved properties can be published', 400);
    }

    const updated = await this.repository.publish(id);
    if (!updated) {
      throw new AppError('Failed to publish property', 500);
    }

    // Send email notification to property owner/agent (non-blocking)
    this.sendPropertyStatusEmail(existing, 'PUBLISHED').catch((err) => {
      logger.error('Failed to send property published email', { propertyId: id, error: err });
    });

    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Archive a property
   */
  async archive(id: string): Promise<PropertyResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    if (existing.status === 'ARCHIVED') {
      throw new AppError('Property is already archived', 400);
    }

    const updated = await this.repository.archive(id);
    if (!updated) {
      throw new AppError('Failed to archive property', 500);
    }

    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Update property status (admin)
   */
  async updateStatus(
    id: string,
    status: PropertyStatus,
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<PropertyResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Property not found', 404);
    }

    // Validate status transitions
    const validTransitions: Record<PropertyStatus, PropertyStatus[]> = {
      DRAFT: ['PENDING_APPROVAL', 'ARCHIVED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'DRAFT'],
      APPROVED: ['PUBLISHED', 'ARCHIVED'],
      REJECTED: ['DRAFT', 'ARCHIVED'],
      PUBLISHED: ['ARCHIVED'],
      ARCHIVED: ['DRAFT'],
    };

    if (!validTransitions[existing.status].includes(status)) {
      throw new AppError(`Invalid status transition from ${existing.status} to ${status}`, 400);
    }

    // Rejection requires a reason
    if (status === 'REJECTED' && !rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const updated = await this.repository.updateStatus(id, status, reviewedBy, rejectionReason);
    if (!updated) {
      throw new AppError('Failed to update property status', 500);
    }

    // Send email notification to property owner/agent (non-blocking)
    this.sendPropertyStatusEmail(existing, status, rejectionReason).catch((err) => {
      logger.error('Failed to send property status email', { propertyId: id, status, error: err });
    });

    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Send email notification for property status change
   */
  private async sendPropertyStatusEmail(
    property: PropertyWithPopulated,
    newStatus: PropertyStatus,
    rejectionReason?: string
  ): Promise<void> {
    // Determine the recipient (owner or agent from agency)
    let recipient: { email: string; first_name: string; preferred_language: string } | null = null;

    if (property.owner_id) {
      const owner = await User.findById(property.owner_id)
        .select('email first_name preferred_language')
        .lean();
      if (owner) {
        recipient = {
          email: owner.email,
          first_name: owner.first_name,
          preferred_language: owner.preferred_language || 'en',
        };
      }
    } else if (property.agency_id) {
      // Find agency admin to notify
      const agencyAdmin = await User.findOne({
        agency_id: property.agency_id,
        user_type: { $in: ['agency_admin', 'agent'] },
        status: 'active',
      })
        .select('email first_name preferred_language')
        .lean();

      if (agencyAdmin) {
        recipient = {
          email: agencyAdmin.email,
          first_name: agencyAdmin.first_name,
          preferred_language: agencyAdmin.preferred_language || 'en',
        };
      }
    }

    if (!recipient) {
      logger.warn('No recipient found for property status email', {
        propertyId: property._id.toString(),
        status: newStatus,
      });
      return;
    }

    // Get property title from translation
    const translation = await this.translationRepository.findByPropertyAndLanguage(
      property._id.toString(),
      property.source_language
    );
    const propertyTitle = translation?.title || `Property ${property.external_id}`;

    const lang = recipient.preferred_language as SupportedLanguage;

    switch (newStatus) {
      case 'APPROVED':
        await sendPropertyApproved(
          recipient.email,
          recipient.first_name,
          propertyTitle,
          property.address,
          property.price,
          property.transaction_type === 'rent',
          property._id.toString(),
          lang
        );
        break;

      case 'REJECTED':
        await sendPropertyRejected(
          recipient.email,
          recipient.first_name,
          propertyTitle,
          property.address,
          property._id.toString(),
          rejectionReason || 'No reason provided',
          lang
        );
        break;

      case 'PUBLISHED':
        await sendPropertyPublished(
          recipient.email,
          recipient.first_name,
          propertyTitle,
          property.address,
          property.price,
          property.transaction_type === 'rent',
          property._id.toString(),
          lang
        );
        break;

      // No email for other status transitions
      default:
        break;
    }
  }

  /**
   * Get property statistics
   */
  async getStatistics(scope?: {
    agency_id?: string;
    owner_id?: string;
  }): Promise<PropertyStatisticsDto> {
    const [total, byStatus, byTransactionType, byCanton, averagePrices] = await Promise.all([
      this.repository.count(
        scope?.agency_id
          ? { agency_id: scope.agency_id }
          : scope?.owner_id
            ? { owner_id: scope.owner_id }
            : undefined,
        true // Include all statuses for statistics
      ),
      this.repository.countByStatus(scope),
      this.repository.countByTransactionType(scope),
      this.repository.countByCanton(scope),
      this.repository.calculateAveragePrices(scope),
    ]);

    return {
      total,
      by_status: byStatus as Record<PropertyStatus, number>,
      by_transaction_type: byTransactionType as Record<'rent' | 'buy', number>,
      by_canton: byCanton,
      average_price: averagePrices,
    };
  }

  // ==========================================
  // Property Image Methods
  // ==========================================

  /**
   * Get all images for a property
   */
  async getImages(propertyId: string): Promise<PropertyImageResponseDto[]> {
    const images = await this.repository.getImages(propertyId);
    return images.map((img) => this.toImageResponseDto(img));
  }

  /**
   * Add image to property
   */
  async addImage(data: PropertyImageCreateDto): Promise<PropertyImageResponseDto> {
    // Verify property exists
    const property = await this.repository.findById(data.property_id);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const image = await this.repository.addImage(data);
    return this.toImageResponseDto(image);
  }

  /**
   * Update property image
   */
  async updateImage(
    imageId: string,
    data: PropertyImageUpdateDto
  ): Promise<PropertyImageResponseDto> {
    const image = await this.repository.updateImage(imageId, data);
    if (!image) {
      throw new AppError('Image not found', 404);
    }
    return this.toImageResponseDto(image);
  }

  /**
   * Delete property image (with Cloudinary cleanup)
   */
  async deleteImage(imageId: string): Promise<void> {
    // Get the image first to check for Cloudinary public_id
    const image = await this.repository.findImageById(imageId);
    if (!image) {
      throw new AppError('Image not found', 404, 'BIZ_IMAGE_NOT_FOUND');
    }

    // Delete from Cloudinary if it has a public_id
    if (image.public_id && cloudinaryService.isReady()) {
      try {
        await cloudinaryService.delete(image.public_id);
        logger.info('Deleted image from Cloudinary', { public_id: image.public_id });
      } catch (error) {
        logger.error('Failed to delete image from Cloudinary', {
          public_id: image.public_id,
          error,
        });
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    const deleted = await this.repository.deleteImage(imageId);
    if (!deleted) {
      throw new AppError('Failed to delete image', 500, 'BIZ_IMAGE_DELETE_FAILED');
    }
  }

  /**
   * Reorder property images
   */
  async reorderImages(
    propertyId: string,
    imageOrders: Array<{ id: string; sort_order: number }>
  ): Promise<void> {
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    await this.repository.reorderImages(propertyId, imageOrders);
  }

  // ==========================================
  // Cloudinary Image Upload Methods
  // ==========================================

  /**
   * Upload single image from buffer and save to database
   */
  async uploadImage(
    propertyId: string,
    buffer: Buffer,
    filename: string,
    options: PropertyImageUploadDto
  ): Promise<PropertyImageUploadResultDto> {
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404, 'BIZ_PROPERTY_NOT_FOUND');
    }

    // Check Cloudinary configuration
    if (!cloudinaryService.isReady()) {
      throw new AppError(
        'Image upload service is not configured',
        503,
        'EXT_CLOUDINARY_NOT_CONFIGURED'
      );
    }

    // Upload to Cloudinary with thumbnail generation
    const uploadOptions: ImageUploadOptions = {
      folder: `immobilier/properties/${propertyId}`,
      tags: ['property', propertyId],
    };

    const uploadResult = await cloudinaryService.uploadWithThumbnail(buffer, uploadOptions);

    // Save to database
    const imageData: PropertyImageCreateDto = {
      property_id: propertyId,
      url: uploadResult.original.url,
      secure_url: uploadResult.original.secure_url,
      thumbnail_url: uploadResult.thumbnail?.url,
      thumbnail_secure_url: uploadResult.thumbnail?.secure_url,
      public_id: uploadResult.original.public_id,
      version: uploadResult.original.version,
      signature: uploadResult.original.signature,
      width: uploadResult.original.width,
      height: uploadResult.original.height,
      format: uploadResult.original.format,
      bytes: uploadResult.original.bytes,
      resource_type: uploadResult.original.resource_type,
      alt_text: options.alt_text,
      caption: options.caption,
      sort_order: options.sort_order,
      is_primary: options.is_primary,
      source: 'cloudinary',
      original_filename: filename,
    };

    const savedImage = await this.repository.addImage(imageData);

    logger.info('Property image uploaded and saved', {
      property_id: propertyId,
      image_id: savedImage._id.toString(),
      public_id: uploadResult.original.public_id,
    });

    return {
      id: savedImage._id.toString(),
      property_id: propertyId,
      url: savedImage.url,
      secure_url: savedImage.secure_url || uploadResult.original.secure_url,
      thumbnail_url: savedImage.thumbnail_url,
      thumbnail_secure_url: savedImage.thumbnail_secure_url,
      public_id: uploadResult.original.public_id,
      width: uploadResult.original.width,
      height: uploadResult.original.height,
      format: uploadResult.original.format,
      bytes: uploadResult.original.bytes,
      alt_text: savedImage.alt_text,
      caption: savedImage.caption,
      sort_order: savedImage.sort_order,
      is_primary: savedImage.is_primary,
      source: 'cloudinary',
      original_filename: filename,
      created_at: savedImage.created_at,
    };
  }

  /**
   * Upload multiple images from buffers
   */
  async uploadImages(
    propertyId: string,
    files: Array<{ buffer: Buffer; filename: string }>,
    options: Omit<PropertyImageUploadDto, 'property_id'>
  ): Promise<BatchImageUploadResultDto> {
    
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404, 'BIZ_PROPERTY_NOT_FOUND');
    }

    // Check Cloudinary configuration
    if (!cloudinaryService.isReady()) {
      throw new AppError(
        'Image upload service is not configured',
        503,
        'EXT_CLOUDINARY_NOT_CONFIGURED'
      );
    }

    const result: BatchImageUploadResultDto = {
      successful: [],
      failed: [],
    };

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadResult = await this.uploadImage(propertyId, file.buffer, file.filename, {
          ...options,
          property_id: propertyId,
          is_primary: i === 0 && options.is_primary, // Only first image can be primary
          sort_order: options.sort_order !== undefined ? options.sort_order + i : undefined,
        });
        result.successful.push(uploadResult);
      } catch (error) {
        result.failed.push({
          filename: file.filename,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('Failed to upload image', { filename: file.filename, error });
      }
    }

    logger.info('Batch image upload completed', {
      property_id: propertyId,
      successful: result.successful.length,
      failed: result.failed.length,
    });

    return result;
  }

  /**
   * Upload image from URL (external image migration)
   */
  async uploadImageFromUrl(
    propertyId: string,
    imageUrl: string,
    options: Omit<PropertyImageUploadDto, 'property_id'>
  ): Promise<PropertyImageUploadResultDto> {
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404, 'BIZ_PROPERTY_NOT_FOUND');
    }

    // Check Cloudinary configuration
    if (!cloudinaryService.isReady()) {
      throw new AppError(
        'Image upload service is not configured',
        503,
        'EXT_CLOUDINARY_NOT_CONFIGURED'
      );
    }

    // Upload to Cloudinary from URL
    const uploadOptions: ImageUploadOptions = {
      folder: `immobilier/properties/${propertyId}`,
      tags: ['property', propertyId, 'migrated'],
      eager: [
        {
          width: 400,
          height: 300,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
      ],
      eager_async: false,
    };

    const uploadResult = await cloudinaryService.uploadFromUrl(imageUrl, uploadOptions);
    const thumbnail = uploadResult.eager?.[0];

    // Save to database
    const imageData: PropertyImageCreateDto = {
      property_id: propertyId,
      url: uploadResult.url,
      secure_url: uploadResult.secure_url,
      thumbnail_url: thumbnail?.url,
      thumbnail_secure_url: thumbnail?.secure_url,
      public_id: uploadResult.public_id,
      version: uploadResult.version,
      signature: uploadResult.signature,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      resource_type: uploadResult.resource_type,
      alt_text: options.alt_text,
      caption: options.caption,
      sort_order: options.sort_order,
      is_primary: options.is_primary,
      source: 'cloudinary',
      external_url: imageUrl,
      original_filename: uploadResult.original_filename,
    };

    const savedImage = await this.repository.addImage(imageData);

    logger.info('Property image uploaded from URL and saved', {
      property_id: propertyId,
      image_id: savedImage._id.toString(),
      public_id: uploadResult.public_id,
      original_url: imageUrl,
    });

    return {
      id: savedImage._id.toString(),
      property_id: propertyId,
      url: savedImage.url,
      secure_url: savedImage.secure_url || uploadResult.secure_url,
      thumbnail_url: savedImage.thumbnail_url,
      thumbnail_secure_url: savedImage.thumbnail_secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      alt_text: savedImage.alt_text,
      caption: savedImage.caption,
      sort_order: savedImage.sort_order,
      is_primary: savedImage.is_primary,
      source: 'cloudinary',
      original_filename: uploadResult.original_filename,
      created_at: savedImage.created_at,
    };
  }

  /**
   * Delete all images for a property (with Cloudinary cleanup)
   */
  async deleteAllImages(propertyId: string): Promise<{ deleted: number }> {
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404, 'BIZ_PROPERTY_NOT_FOUND');
    }

    // Get all Cloudinary images for the property
    const cloudinaryImages = await this.repository.getCloudinaryImages(propertyId);

    // Delete from Cloudinary
    if (cloudinaryImages.length > 0 && cloudinaryService.isReady()) {
      const publicIds = cloudinaryImages
        .filter((img) => img.public_id)
        .map((img) => img.public_id!);

      if (publicIds.length > 0) {
        try {
          await cloudinaryService.deleteBatch(publicIds);
          logger.info('Deleted property images from Cloudinary', {
            property_id: propertyId,
            count: publicIds.length,
          });
        } catch (error) {
          logger.error('Failed to delete images from Cloudinary', {
            property_id: propertyId,
            error,
          });
          // Continue with database deletion
        }
      }
    }

    // Delete all from database
    const deletedCount = await this.repository.deleteAllImages(propertyId);

    logger.info('Deleted all property images', {
      property_id: propertyId,
      deleted_count: deletedCount,
    });

    return { deleted: deletedCount };
  }

  /**
   * Generate signed upload URL for direct client uploads
   */
  generateUploadUrl(propertyId: string): {
    uploadUrl: string;
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  } {
    if (!cloudinaryService.isReady()) {
      throw new AppError(
        'Image upload service is not configured',
        503,
        'EXT_CLOUDINARY_NOT_CONFIGURED'
      );
    }

    return cloudinaryService.generateSignedUploadUrl({
      folder: `immobilier/properties/${propertyId}`,
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    });
  }

  /**
   * Add image from external URL (no Cloudinary upload, just reference)
   */
  async addExternalImage(
    propertyId: string,
    imageUrl: string,
    options: Omit<PropertyImageUploadDto, 'property_id'>
  ): Promise<PropertyImageResponseDto> {
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404, 'BIZ_PROPERTY_NOT_FOUND');
    }

    // Save to database as external reference
    const imageData: PropertyImageCreateDto = {
      property_id: propertyId,
      url: imageUrl,
      secure_url: imageUrl.replace('http://', 'https://'),
      alt_text: options.alt_text,
      caption: options.caption,
      sort_order: options.sort_order,
      is_primary: options.is_primary,
      source: 'external',
      external_url: imageUrl,
    };

    const savedImage = await this.repository.addImage(imageData);

    logger.info('External image reference added', {
      property_id: propertyId,
      image_id: savedImage._id.toString(),
      external_url: imageUrl,
    });

    return this.toImageResponseDto(savedImage);
  }

  /**
   * Get image count for a property
   */
  async getImageCount(propertyId: string): Promise<number> {
    return this.repository.getImageCount(propertyId);
  }

  /**
   * Set primary image for a property
   */
  async setPrimaryImage(propertyId: string, imageId: string): Promise<PropertyImageResponseDto> {
    // Verify property exists
    const property = await this.repository.findById(propertyId);
    if (!property) {
      throw new AppError('Property not found', 404, 'BIZ_PROPERTY_NOT_FOUND');
    }

    // Verify image belongs to property
    const image = await this.repository.findImageById(imageId);
    if (!image || image.property_id.toString() !== propertyId) {
      throw new AppError('Image not found for this property', 404, 'BIZ_IMAGE_NOT_FOUND');
    }

    // Update image as primary (repository handles unsetting others)
    const updatedImage = await this.repository.updateImage(imageId, { is_primary: true });
    if (!updatedImage) {
      throw new AppError('Failed to set primary image', 500, 'BIZ_IMAGE_UPDATE_FAILED');
    }

    return this.toImageResponseDto(updatedImage);
  }
}

// Export singleton instance
export const propertyService = new PropertyService(
  propertyRepository,
  propertyTranslationRepository
);
