import { AgencyRepository, agencyRepository } from './agency.repository.js';
import {
  AgencyQueryDto,
  AgencyCreateDto,
  AgencyUpdateDto,
  AgencyResponseDto,
  AgencyListResponseDto,
  AgencyWithLocation,
  SupportedLanguage,
  AGENCY_SORT_FIELDS,
  AgencySortField,
} from './agency.types.js';
import { IMultilingualText } from '../location/index.js';
import { AppError } from '../../shared/errors/AppError.js';

/**
 * Agency Service
 * Handles business logic for agency operations
 */
export class AgencyService {
  constructor(private repository: AgencyRepository) {}

  /**
   * Get all agencies with filtering and pagination
   */
  async findAll(query: AgencyQueryDto): Promise<AgencyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'name');
    const order = query.order ?? 'asc';
    const lang = query.lang;
    const includeInactive = query.include_inactive ?? false;

    const filters = {
      canton_id: query.canton_id,
      city_id: query.city_id,
      status: query.status,
      is_verified: query.is_verified,
      search: query.search,
    };

    const { agencies, total } = await this.repository.findAll(
      filters,
      { page, limit, sort, order },
      includeInactive
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: agencies.map((agency) => this.toResponseDto(agency, lang)),
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
   * Get a single agency by ID
   */
  async findById(id: string, lang?: SupportedLanguage): Promise<AgencyResponseDto> {
    const agency = await this.repository.findById(id);

    if (!agency) {
      throw new AppError('Agency not found', 404);
    }

    return this.toResponseDto(agency, lang);
  }

  /**
   * Get a single agency by slug
   */
  async findBySlug(slug: string, lang?: SupportedLanguage): Promise<AgencyResponseDto> {
    const agency = await this.repository.findBySlug(slug);

    if (!agency) {
      throw new AppError('Agency not found', 404);
    }

    return this.toResponseDto(agency, lang);
  }

  /**
   * Get agencies by canton
   */
  async findByCanton(cantonId: string, query: AgencyQueryDto): Promise<AgencyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'name');
    const order = query.order ?? 'asc';
    const lang = query.lang;

    const { agencies, total } = await this.repository.findByCanton(cantonId, {
      page,
      limit,
      sort,
      order,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: agencies.map((agency) => this.toResponseDto(agency, lang)),
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
   * Get agencies by city
   */
  async findByCity(cityId: string, query: AgencyQueryDto): Promise<AgencyListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = this.validateSortField(query.sort ?? 'name');
    const order = query.order ?? 'asc';
    const lang = query.lang;

    const { agencies, total } = await this.repository.findByCity(cityId, {
      page,
      limit,
      sort,
      order,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: agencies.map((agency) => this.toResponseDto(agency, lang)),
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
   * Create a new agency
   */
  async create(data: AgencyCreateDto): Promise<AgencyResponseDto> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = this.generateSlug(data.name);
    }

    // Check for duplicate slug
    const slugExists = await this.repository.slugExists(data.slug);
    if (slugExists) {
      throw new AppError('An agency with this slug already exists', 409);
    }

    const agency = await this.repository.create(data);

    // Fetch with populated data
    const populated = await this.repository.findById(agency._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Update an existing agency
   */
  async update(id: string, data: AgencyUpdateDto): Promise<AgencyResponseDto> {
    // Check if agency exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Agency not found', 404);
    }

    // Check for duplicate slug if updating slug
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.repository.slugExists(data.slug, id);
      if (slugExists) {
        throw new AppError('An agency with this slug already exists', 409);
      }
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update agency', 500);
    }

    // Fetch with populated data
    const populated = await this.repository.findById(updated._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Delete an agency
   */
  async delete(id: string): Promise<void> {
    // Check if agency exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new AppError('Agency not found', 404);
    }

    // TODO: Check if agency has properties before deletion
    // For now, just delete
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete agency', 500);
    }
  }

  /**
   * Verify an agency
   */
  async verify(id: string): Promise<AgencyResponseDto> {
    const agency = await this.repository.verify(id);
    if (!agency) {
      throw new AppError('Agency not found', 404);
    }

    const populated = await this.repository.findById(agency._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Unverify an agency
   */
  async unverify(id: string): Promise<AgencyResponseDto> {
    const agency = await this.repository.unverify(id);
    if (!agency) {
      throw new AppError('Agency not found', 404);
    }

    const populated = await this.repository.findById(agency._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Update agency status
   */
  async updateStatus(
    id: string,
    status: 'active' | 'pending' | 'suspended' | 'inactive'
  ): Promise<AgencyResponseDto> {
    const agency = await this.repository.updateStatus(id, status);
    if (!agency) {
      throw new AppError('Agency not found', 404);
    }

    const populated = await this.repository.findById(agency._id.toString());
    return this.toResponseDto(populated!);
  }

  /**
   * Get agency statistics
   */
  async getStatistics(): Promise<{
    total: number;
    by_status: Record<string, number>;
    verified: number;
    unverified: number;
  }> {
    const [total, byStatus, verified, unverified] = await Promise.all([
      this.repository.count(),
      this.repository.countByStatus(),
      this.repository.count({ is_verified: true }),
      this.repository.count({ is_verified: false }),
    ]);

    return {
      total,
      by_status: byStatus,
      verified,
      unverified,
    };
  }

  /**
   * Validate sort field
   */
  private validateSortField(field: string): AgencySortField {
    if (AGENCY_SORT_FIELDS.includes(field as AgencySortField)) {
      return field as AgencySortField;
    }
    return 'name';
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[àáâäã]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôöõ]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Localize multilingual text field
   */
  private localizeText(
    text: IMultilingualText | undefined,
    lang?: SupportedLanguage
  ): IMultilingualText | string | undefined {
    if (!text) return undefined;

    if (lang && text[lang]) {
      return text[lang];
    }

    return text;
  }

  /**
   * Convert agency to response DTO
   */
  private toResponseDto(agency: AgencyWithLocation, lang?: SupportedLanguage): AgencyResponseDto {
    return {
      id: agency._id.toString(),
      name: agency.name,
      slug: agency.slug,
      description: this.localizeText(agency.description, lang),
      logo_url: agency.logo_url,
      website: agency.website,
      email: agency.email,
      phone: agency.phone,
      contact_person: agency.contact_person,
      address: agency.address,
      city_id: agency.city_id?._id?.toString() ?? (agency.city_id as unknown as string),
      canton_id: agency.canton_id?._id?.toString() ?? (agency.canton_id as unknown as string),
      postal_code: agency.postal_code,
      status: agency.status,
      is_verified: agency.is_verified,
      verification_date: agency.verification_date,
      total_properties: agency.total_properties,
      created_at: agency.created_at,
      updated_at: agency.updated_at,
      city: agency.city_id?._id
        ? {
            id: agency.city_id._id.toString(),
            name: this.localizeText(agency.city_id.name, lang) as IMultilingualText | string,
          }
        : undefined,
      canton: agency.canton_id?._id
        ? {
            id: agency.canton_id._id.toString(),
            name: this.localizeText(agency.canton_id.name, lang) as IMultilingualText | string,
            code: agency.canton_id.code,
          }
        : undefined,
    };
  }
}

// Export singleton instance
export const agencyService = new AgencyService(agencyRepository);
