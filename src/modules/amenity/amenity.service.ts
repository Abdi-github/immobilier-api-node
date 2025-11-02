import { NotFoundError } from '../../shared/errors/AppError.js';
import { IMultilingualText, SupportedLanguage } from '../location/canton.model.js';

import { AmenityGroup } from './amenity.model.js';
import { amenityRepository } from './amenity.repository.js';
import {
  AmenityQueryDto,
  AmenityCreateDto,
  AmenityUpdateDto,
  AmenityResponseDto,
  AmenityListResponseDto,
} from './amenity.types.js';

/**
 * Amenity Service
 * Business logic for Amenity operations
 */
export class AmenityService {
  // ==================== HELPER METHODS ====================

  /**
   * Extract localized name based on language
   */
  private getLocalizedName(
    name: string | IMultilingualText,
    lang?: SupportedLanguage
  ): string | IMultilingualText {
    if (!lang) {
      return name;
    }

    if (typeof name === 'string') {
      return name;
    }

    // Return the name in the requested language, fallback to english, then any available
    return name[lang] || name.en || name.fr || name.de || name.it || '';
  }

  /**
   * Transform amenity to response DTO
   */
  private transformAmenityToResponse(
    amenity: {
      _id: { toString: () => string };
      name: IMultilingualText;
      group: AmenityGroup;
      icon?: string;
      sort_order: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    lang?: SupportedLanguage
  ): AmenityResponseDto {
    return {
      id: amenity._id.toString(),
      name: this.getLocalizedName(amenity.name, lang),
      group: amenity.group,
      icon: amenity.icon,
      sort_order: amenity.sort_order,
      is_active: amenity.is_active,
      created_at: amenity.created_at,
      updated_at: amenity.updated_at,
    };
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get all amenities with filtering, sorting, and pagination
   */
  async getAll(query: AmenityQueryDto): Promise<AmenityListResponseDto> {
    const { amenities, pagination } = await amenityRepository.findAll(query);

    return {
      data: amenities.map((amenity) => this.transformAmenityToResponse(amenity, query.lang)),
      pagination,
    };
  }

  /**
   * Get amenity by ID
   */
  async getById(id: string, lang?: SupportedLanguage): Promise<AmenityResponseDto> {
    const amenity = await amenityRepository.findById(id);

    if (!amenity) {
      throw NotFoundError('Amenity not found');
    }

    return this.transformAmenityToResponse(amenity, lang);
  }

  /**
   * Get amenities by group
   */
  async getByGroup(group: AmenityGroup, lang?: SupportedLanguage): Promise<AmenityResponseDto[]> {
    const amenities = await amenityRepository.findByGroup(group);

    return amenities.map((amenity) => this.transformAmenityToResponse(amenity, lang));
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Create a new amenity (Admin only)
   */
  async create(data: AmenityCreateDto): Promise<AmenityResponseDto> {
    const amenity = await amenityRepository.create(data);

    return this.transformAmenityToResponse(amenity);
  }

  /**
   * Update an amenity (Admin only)
   */
  async update(id: string, data: AmenityUpdateDto): Promise<AmenityResponseDto> {
    // Check if amenity exists
    const exists = await amenityRepository.exists(id);
    if (!exists) {
      throw NotFoundError('Amenity not found');
    }

    const updated = await amenityRepository.update(id, data);

    if (!updated) {
      throw NotFoundError('Amenity not found');
    }

    return this.transformAmenityToResponse(updated);
  }

  /**
   * Delete an amenity (Admin only)
   */
  async delete(id: string): Promise<void> {
    // Check if amenity exists
    const exists = await amenityRepository.exists(id);
    if (!exists) {
      throw NotFoundError('Amenity not found');
    }

    // TODO: Check if amenity is being used by any properties
    // This should be added when the Property module is implemented

    const deleted = await amenityRepository.delete(id);
    if (!deleted) {
      throw NotFoundError('Amenity not found');
    }
  }
}

// Export singleton instance
export const amenityService = new AmenityService();
