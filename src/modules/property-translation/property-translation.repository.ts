import mongoose from 'mongoose';
import {
  PropertyTranslation,
  IPropertyTranslation,
  TranslationApprovalStatus,
} from './property-translation.model.js';
import {
  PropertyTranslationFilterOptions,
  PropertyTranslationPaginationOptions,
  PropertyTranslationFindResult,
  PropertyTranslationCreateDto,
  PropertyTranslationUpdateDto,
  PropertyTranslationResponseDto,
} from './property-translation.types.js';
import { SupportedLanguage } from '../location/index.js';

/**
 * Property Translation Repository
 * Handles all database operations for property translations
 */
export class PropertyTranslationRepository {
  /**
   * Build query object from filters
   */
  private buildQuery(filters: PropertyTranslationFilterOptions): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.property_id) {
      query.property_id = new mongoose.Types.ObjectId(filters.property_id);
    }

    if (filters.language) {
      query.language = filters.language;
    }

    if (filters.source) {
      query.source = filters.source;
    }

    if (filters.approval_status) {
      query.approval_status = filters.approval_status;
    }

    if (filters.approved_by) {
      query.approved_by = new mongoose.Types.ObjectId(filters.approved_by);
    }

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return query;
  }

  /**
   * Build sort object
   */
  private buildSort(sort?: string, order?: 'asc' | 'desc'): Record<string, 1 | -1> {
    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? 1 : -1;

    const validSortFields = [
      'created_at',
      'updated_at',
      'language',
      'source',
      'approval_status',
      'quality_score',
    ];

    if (!validSortFields.includes(sortField)) {
      return { created_at: -1 };
    }

    return { [sortField]: sortOrder };
  }

  /**
   * Transform document to response DTO
   */
  private toResponseDto(doc: IPropertyTranslation): PropertyTranslationResponseDto {
    const response: PropertyTranslationResponseDto = {
      id: doc._id.toString(),
      property_id: doc.property_id.toString(),
      language: doc.language,
      title: doc.title,
      description: doc.description,
      source: doc.source,
      quality_score: doc.quality_score,
      approval_status: doc.approval_status,
      approved_by: doc.approved_by?.toString(),
      approved_at: doc.approved_at,
      rejection_reason: doc.rejection_reason,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };

    // Handle populated property
    const populatedDoc = doc as unknown as {
      property_id?: {
        _id: mongoose.Types.ObjectId;
        external_id: string;
        source_language: SupportedLanguage;
      };
      approved_by?: {
        _id: mongoose.Types.ObjectId;
        first_name: string;
        last_name: string;
      };
    };

    if (
      populatedDoc.property_id &&
      typeof populatedDoc.property_id === 'object' &&
      'external_id' in populatedDoc.property_id
    ) {
      response.property = {
        id: populatedDoc.property_id._id.toString(),
        external_id: populatedDoc.property_id.external_id,
        source_language: populatedDoc.property_id.source_language,
      };
      response.property_id = populatedDoc.property_id._id.toString();
    }

    if (
      populatedDoc.approved_by &&
      typeof populatedDoc.approved_by === 'object' &&
      'first_name' in populatedDoc.approved_by
    ) {
      response.approver = {
        id: populatedDoc.approved_by._id.toString(),
        first_name: populatedDoc.approved_by.first_name,
        last_name: populatedDoc.approved_by.last_name,
      };
      response.approved_by = populatedDoc.approved_by._id.toString();
    }

    return response;
  }

  /**
   * Find all translations with pagination and filtering
   */
  async findAll(
    filters: PropertyTranslationFilterOptions,
    pagination: PropertyTranslationPaginationOptions
  ): Promise<PropertyTranslationFindResult> {
    const query = this.buildQuery(filters);
    const sort = this.buildSort(pagination.sort, pagination.order);
    const skip = (pagination.page - 1) * pagination.limit;

    const [translations, total] = await Promise.all([
      PropertyTranslation.find(query)
        .populate('property_id', 'external_id source_language')
        .populate('approved_by', 'first_name last_name')
        .sort(sort)
        .skip(skip)
        .limit(pagination.limit)
        .exec(),
      PropertyTranslation.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      translations: translations.map((t) => this.toResponseDto(t)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
    };
  }

  /**
   * Find translation by ID
   */
  async findById(id: string): Promise<PropertyTranslationResponseDto | null> {
    const translation = await PropertyTranslation.findById(id)
      .populate('property_id', 'external_id source_language')
      .populate('approved_by', 'first_name last_name')
      .exec();

    return translation ? this.toResponseDto(translation) : null;
  }

  /**
   * Find translation by property ID and language
   */
  async findByPropertyAndLanguage(
    propertyId: string,
    language: SupportedLanguage
  ): Promise<PropertyTranslationResponseDto | null> {
    const translation = await PropertyTranslation.findOne({
      property_id: new mongoose.Types.ObjectId(propertyId),
      language,
    })
      .populate('property_id', 'external_id source_language')
      .populate('approved_by', 'first_name last_name')
      .exec();

    return translation ? this.toResponseDto(translation) : null;
  }

  /**
   * Find all translations for a property
   */
  async findByPropertyId(propertyId: string): Promise<PropertyTranslationResponseDto[]> {
    const translations = await PropertyTranslation.find({
      property_id: new mongoose.Types.ObjectId(propertyId),
    })
      .populate('property_id', 'external_id source_language')
      .populate('approved_by', 'first_name last_name')
      .sort({ language: 1 })
      .exec();

    return translations.map((t) => this.toResponseDto(t));
  }

  /**
   * Find approved translations for a property
   */
  async findApprovedByPropertyId(propertyId: string): Promise<PropertyTranslationResponseDto[]> {
    const translations = await PropertyTranslation.find({
      property_id: new mongoose.Types.ObjectId(propertyId),
      approval_status: 'APPROVED',
    })
      .sort({ language: 1 })
      .exec();

    return translations.map((t) => this.toResponseDto(t));
  }

  /**
   * Find pending translations
   */
  async findPending(
    pagination: PropertyTranslationPaginationOptions
  ): Promise<PropertyTranslationFindResult> {
    return this.findAll({ approval_status: 'PENDING' }, pagination);
  }

  /**
   * Create a new translation
   */
  async create(data: PropertyTranslationCreateDto): Promise<PropertyTranslationResponseDto> {
    const translation = new PropertyTranslation({
      property_id: new mongoose.Types.ObjectId(data.property_id),
      language: data.language,
      title: data.title,
      description: data.description,
      source: data.source || 'original',
      quality_score: data.quality_score,
      approval_status: data.source === 'original' ? 'APPROVED' : 'PENDING',
      approved_at: data.source === 'original' ? new Date() : undefined,
    });

    const saved = await translation.save();

    // Populate for response
    const populated = await PropertyTranslation.findById(saved._id)
      .populate('property_id', 'external_id source_language')
      .exec();

    return this.toResponseDto(populated!);
  }

  /**
   * Create multiple translations (bulk)
   */
  async createMany(
    data: PropertyTranslationCreateDto[]
  ): Promise<PropertyTranslationResponseDto[]> {
    const translations = data.map((item) => ({
      property_id: new mongoose.Types.ObjectId(item.property_id),
      language: item.language,
      title: item.title,
      description: item.description,
      source: item.source || 'deepl',
      quality_score: item.quality_score,
      approval_status: 'PENDING' as const,
    }));

    const inserted = await PropertyTranslation.insertMany(translations);
    return inserted.map((t) => this.toResponseDto(t));
  }

  /**
   * Update a translation
   */
  async update(
    id: string,
    data: PropertyTranslationUpdateDto
  ): Promise<PropertyTranslationResponseDto | null> {
    const translation = await PropertyTranslation.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.source && { source: data.source }),
          ...(data.quality_score !== undefined && { quality_score: data.quality_score }),
        },
      },
      { new: true, runValidators: true }
    )
      .populate('property_id', 'external_id source_language')
      .populate('approved_by', 'first_name last_name')
      .exec();

    return translation ? this.toResponseDto(translation) : null;
  }

  /**
   * Approve a translation
   */
  async approve(id: string, approvedBy: string): Promise<PropertyTranslationResponseDto | null> {
    const translation = await PropertyTranslation.findByIdAndUpdate(
      id,
      {
        $set: {
          approval_status: 'APPROVED' as TranslationApprovalStatus,
          approved_by: new mongoose.Types.ObjectId(approvedBy),
          approved_at: new Date(),
          rejection_reason: undefined,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('property_id', 'external_id source_language')
      .populate('approved_by', 'first_name last_name')
      .exec();

    return translation ? this.toResponseDto(translation) : null;
  }

  /**
   * Reject a translation
   */
  async reject(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<PropertyTranslationResponseDto | null> {
    const translation = await PropertyTranslation.findByIdAndUpdate(
      id,
      {
        $set: {
          approval_status: 'REJECTED' as TranslationApprovalStatus,
          approved_by: new mongoose.Types.ObjectId(rejectedBy),
          approved_at: new Date(),
          rejection_reason: reason,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('property_id', 'external_id source_language')
      .populate('approved_by', 'first_name last_name')
      .exec();

    return translation ? this.toResponseDto(translation) : null;
  }

  /**
   * Reset translation to pending status
   */
  async resetToPending(id: string): Promise<PropertyTranslationResponseDto | null> {
    const translation = await PropertyTranslation.findByIdAndUpdate(
      id,
      {
        $set: {
          approval_status: 'PENDING' as TranslationApprovalStatus,
        },
        $unset: {
          approved_by: 1,
          approved_at: 1,
          rejection_reason: 1,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('property_id', 'external_id source_language')
      .exec();

    return translation ? this.toResponseDto(translation) : null;
  }

  /**
   * Delete a translation
   */
  async delete(id: string): Promise<boolean> {
    const result = await PropertyTranslation.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Delete all translations for a property
   */
  async deleteByPropertyId(propertyId: string): Promise<number> {
    const result = await PropertyTranslation.deleteMany({
      property_id: new mongoose.Types.ObjectId(propertyId),
    }).exec();
    return result.deletedCount;
  }

  /**
   * Check if translation exists for property and language
   */
  async exists(propertyId: string, language: SupportedLanguage): Promise<boolean> {
    const count = await PropertyTranslation.countDocuments({
      property_id: new mongoose.Types.ObjectId(propertyId),
      language,
    }).exec();
    return count > 0;
  }

  /**
   * Get missing languages for a property
   */
  async getMissingLanguages(propertyId: string): Promise<SupportedLanguage[]> {
    const allLanguages: SupportedLanguage[] = ['en', 'fr', 'de', 'it'];

    const existingTranslations = await PropertyTranslation.find({
      property_id: new mongoose.Types.ObjectId(propertyId),
    })
      .select('language')
      .exec();

    const existingLanguages = existingTranslations.map((t) => t.language);
    return allLanguages.filter((lang) => !existingLanguages.includes(lang));
  }

  /**
   * Count translations by status
   */
  async countByStatus(): Promise<Record<TranslationApprovalStatus, number>> {
    const result = await PropertyTranslation.aggregate([
      {
        $group: {
          _id: '$approval_status',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const counts: Record<TranslationApprovalStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    result.forEach((item) => {
      counts[item._id as TranslationApprovalStatus] = item.count;
    });

    return counts;
  }

  /**
   * Count translations by source
   */
  async countBySource(): Promise<Record<string, number>> {
    const result = await PropertyTranslation.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const counts: Record<string, number> = {};
    result.forEach((item) => {
      counts[item._id] = item.count;
    });

    return counts;
  }
}

// Export singleton instance
export const propertyTranslationRepository = new PropertyTranslationRepository();
