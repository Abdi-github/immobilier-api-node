import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  InternalServerError,
} from '../../shared/errors/AppError.js';
import { IMultilingualText, SupportedLanguage } from './canton.model.js';
import { locationRepository } from './location.repository.js';
import {
  CantonQueryDto,
  CityQueryDto,
  CantonCreateDto,
  CantonUpdateDto,
  CityCreateDto,
  CityUpdateDto,
  CantonResponseDto,
  CityResponseDto,
  CantonListResponseDto,
  CityListResponseDto,
  CityWithCanton,
  PopularCityResponseDto,
} from './location.types.js';

/**
 * Location Service
 * Business logic for Canton and City operations
 */
export class LocationService {
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
   * Transform canton to response DTO
   */
  private transformCantonToResponse(
    canton: {
      _id: { toString: () => string };
      code: string;
      name: IMultilingualText;
      latitude?: number;
      longitude?: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    lang?: SupportedLanguage
  ): CantonResponseDto {
    return {
      id: canton._id.toString(),
      code: canton.code,
      name: this.getLocalizedName(canton.name, lang),
      latitude: canton.latitude,
      longitude: canton.longitude,
      is_active: canton.is_active,
      created_at: canton.created_at,
      updated_at: canton.updated_at,
    };
  }

  /**
   * Transform city to response DTO
   */
  private transformCityToResponse(
    city: {
      _id: { toString: () => string };
      canton_id:
        | { toString: () => string }
        | {
            _id: { toString: () => string };
            code: string;
            name: IMultilingualText;
            latitude?: number;
            longitude?: number;
            is_active: boolean;
            created_at: Date;
            updated_at: Date;
          };
      name: string | IMultilingualText;
      postal_code: string;
      image_url?: string;
      latitude?: number;
      longitude?: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    lang?: SupportedLanguage,
    populateCanton = false
  ): CityResponseDto {
    const response: CityResponseDto = {
      id: city._id.toString(),
      canton_id:
        typeof city.canton_id === 'object' && '_id' in city.canton_id
          ? city.canton_id._id.toString()
          : city.canton_id.toString(),
      name: this.getLocalizedName(city.name, lang),
      postal_code: city.postal_code,
      image_url: city.image_url,
      latitude: city.latitude,
      longitude: city.longitude,
      is_active: city.is_active,
      created_at: city.created_at,
      updated_at: city.updated_at,
    };

    // Add populated canton if available
    if (populateCanton && typeof city.canton_id === 'object' && '_id' in city.canton_id) {
      response.canton = this.transformCantonToResponse(
        city.canton_id as {
          _id: { toString: () => string };
          code: string;
          name: IMultilingualText;
          latitude?: number;
          longitude?: number;
          is_active: boolean;
          created_at: Date;
          updated_at: Date;
        },
        lang
      );
    }

    return response;
  }

  // ==================== CANTON METHODS ====================

  /**
   * Get all cantons with filtering, sorting, and pagination
   */
  async getAllCantons(query: CantonQueryDto): Promise<CantonListResponseDto> {
    const { cantons, pagination } = await locationRepository.findAllCantons(query);

    return {
      data: cantons.map((canton) => this.transformCantonToResponse(canton, query.lang)),
      pagination,
    };
  }

  /**
   * Get canton by ID
   */
  async getCantonById(id: string, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    const canton = await locationRepository.findCantonById(id);

    if (!canton) {
      throw NotFoundError('Canton not found');
    }

    return this.transformCantonToResponse(canton, lang);
  }

  /**
   * Get canton by code
   */
  async getCantonByCode(code: string, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    const canton = await locationRepository.findCantonByCode(code);

    if (!canton) {
      throw NotFoundError('Canton not found');
    }

    return this.transformCantonToResponse(canton, lang);
  }

  /**
   * Create a canton (Admin only)
   */
  async createCanton(data: CantonCreateDto, lang?: SupportedLanguage): Promise<CantonResponseDto> {
    // Check if code is unique
    const isUnique = await locationRepository.isCantonCodeUnique(data.code);
    if (!isUnique) {
      throw ConflictError('Canton code already exists');
    }

    const canton = await locationRepository.createCanton(data);
    return this.transformCantonToResponse(canton, lang);
  }

  /**
   * Update a canton (Admin only)
   */
  async updateCanton(
    id: string,
    data: CantonUpdateDto,
    lang?: SupportedLanguage
  ): Promise<CantonResponseDto> {
    // Check if canton exists
    const exists = await locationRepository.cantonExists(id);
    if (!exists) {
      throw NotFoundError('Canton not found');
    }

    // Check if new code is unique (if provided)
    if (data.code) {
      const isUnique = await locationRepository.isCantonCodeUnique(data.code, id);
      if (!isUnique) {
        throw ConflictError('Canton code already exists');
      }
    }

    const canton = await locationRepository.updateCanton(id, data);

    if (!canton) {
      throw InternalServerError('Failed to update canton');
    }

    return this.transformCantonToResponse(canton, lang);
  }

  /**
   * Delete a canton (Admin only)
   */
  async deleteCanton(id: string): Promise<void> {
    // Check if canton exists
    const exists = await locationRepository.cantonExists(id);
    if (!exists) {
      throw NotFoundError('Canton not found');
    }

    // Check if canton has cities
    const cityCount = await locationRepository.countCitiesInCanton(id);
    if (cityCount > 0) {
      throw BadRequestError(
        `Cannot delete canton with ${cityCount} cities. Delete or reassign cities first.`
      );
    }

    const deleted = await locationRepository.deleteCanton(id);
    if (!deleted) {
      throw InternalServerError('Failed to delete canton');
    }
  }

  /**
   * Get cities by canton
   */
  async getCitiesByCanton(cantonId: string, query: CityQueryDto): Promise<CityListResponseDto> {
    // Check if canton exists
    const cantonExists = await locationRepository.cantonExists(cantonId);
    if (!cantonExists) {
      throw NotFoundError('Canton not found');
    }

    const { cities, pagination } = await locationRepository.findAllCities(
      { ...query, canton_id: cantonId },
      true
    );

    return {
      data: cities.map((city) =>
        this.transformCityToResponse(city as CityWithCanton, query.lang, true)
      ),
      pagination,
    };
  }

  /**
   * Get cities by canton ID (alias for getCitiesByCanton)
   */
  async getCitiesByCantonId(cantonId: string, query: CityQueryDto): Promise<CityListResponseDto> {
    return this.getCitiesByCanton(cantonId, query);
  }

  /**
   * Search cities by name
   */
  async searchCities(
    searchTerm: string,
    lang?: SupportedLanguage,
    limit = 20
  ): Promise<CityResponseDto[]> {
    const { cities } = await locationRepository.findAllCities(
      { search: searchTerm, limit, lang },
      true
    );

    return cities.map((city) => this.transformCityToResponse(city as CityWithCanton, lang, true));
  }

  // ==================== CITY METHODS ====================

  /**
   * Get all cities with filtering, sorting, and pagination
   */
  async getAllCities(query: CityQueryDto, populateCanton = true): Promise<CityListResponseDto> {
    const { cities, pagination } = await locationRepository.findAllCities(query, populateCanton);

    return {
      data: cities.map((city) =>
        this.transformCityToResponse(city as CityWithCanton, query.lang, populateCanton)
      ),
      pagination,
    };
  }

  /**
   * Get city by ID
   */
  async getCityById(
    id: string,
    lang?: SupportedLanguage,
    populateCanton = true
  ): Promise<CityResponseDto> {
    const city = await locationRepository.findCityById(id, populateCanton);

    if (!city) {
      throw NotFoundError('City not found');
    }

    return this.transformCityToResponse(city as CityWithCanton, lang, populateCanton);
  }

  /**
   * Get cities by postal code
   */
  async getCitiesByPostalCode(
    postalCode: string,
    lang?: SupportedLanguage
  ): Promise<CityResponseDto[]> {
    const cities = await locationRepository.findCitiesByPostalCode(postalCode);

    return cities.map((city) =>
      this.transformCityToResponse(city as unknown as CityWithCanton, lang, true)
    );
  }

  /**
   * Create a city (Admin only)
   */
  async createCity(data: CityCreateDto, lang?: SupportedLanguage): Promise<CityResponseDto> {
    // Check if canton exists
    const cantonExists = await locationRepository.cantonExists(data.canton_id);
    if (!cantonExists) {
      throw NotFoundError('Canton not found');
    }

    const city = await locationRepository.createCity(data);
    const populatedCity = await locationRepository.findCityById(city._id.toString(), true);

    return this.transformCityToResponse(populatedCity as CityWithCanton, lang, true);
  }

  /**
   * Update a city (Admin only)
   */
  async updateCity(
    id: string,
    data: CityUpdateDto,
    lang?: SupportedLanguage
  ): Promise<CityResponseDto> {
    // Check if city exists
    const cityExists = await locationRepository.cityExists(id);
    if (!cityExists) {
      throw NotFoundError('City not found');
    }

    // Check if new canton exists (if provided)
    if (data.canton_id) {
      const cantonExists = await locationRepository.cantonExists(data.canton_id);
      if (!cantonExists) {
        throw NotFoundError('Canton not found');
      }
    }

    const city = await locationRepository.updateCity(id, data);

    if (!city) {
      throw InternalServerError('Failed to update city');
    }

    const populatedCity = await locationRepository.findCityById(city._id.toString(), true);
    return this.transformCityToResponse(populatedCity as CityWithCanton, lang, true);
  }

  /**
   * Delete a city (Admin only)
   */
  async deleteCity(id: string): Promise<void> {
    // Check if city exists
    const exists = await locationRepository.cityExists(id);
    if (!exists) {
      throw NotFoundError('City not found');
    }

    // TODO: Check if city is used by properties, agencies, etc.
    // For now, we allow deletion

    const deleted = await locationRepository.deleteCity(id);
    if (!deleted) {
      throw InternalServerError('Failed to delete city');
    }
  }

  /**
   * Get popular cities with property counts for homepage tiles
   * Returns cities with at least `minProperties` published properties
   */
  async getPopularCities(
    lang?: SupportedLanguage,
    minProperties = 10,
    limit = 12
  ): Promise<PopularCityResponseDto[]> {
    const results = await locationRepository.findPopularCities(minProperties, limit);

    return results.map((result) => ({
      id: result._id.toString(),
      name: this.getLocalizedName(result.city_name, lang),
      canton_code: result.canton_code,
      canton_name: this.getLocalizedName(result.canton_name, lang),
      image_url: result.image_url || undefined,
      rent_count: result.rent_count,
      buy_count: result.buy_count,
      total_count: result.total_count,
    }));
  }

  /**
   * Search locations (cantons and cities)
   */
  async searchLocations(
    search: string,
    lang?: SupportedLanguage
  ): Promise<{
    cantons: CantonResponseDto[];
    cities: CityResponseDto[];
  }> {
    const [cantonsResult, citiesResult] = await Promise.all([
      locationRepository.findAllCantons({ search, limit: 10, lang }),
      locationRepository.findAllCities({ search, limit: 20, lang }, true),
    ]);

    return {
      cantons: cantonsResult.cantons.map((canton) => this.transformCantonToResponse(canton, lang)),
      cities: citiesResult.cities.map((city) =>
        this.transformCityToResponse(city as CityWithCanton, lang, true)
      ),
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();
