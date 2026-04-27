import { Canton, ICanton } from './canton.model.js';
import { City, ICity } from './city.model.js';
import {
  CantonQueryDto,
  CityQueryDto,
  CantonCreateDto,
  CantonUpdateDto,
  CityCreateDto,
  CityUpdateDto,
  PaginationDto,
  CityWithCanton,
} from './location.types.js';
import mongoose from 'mongoose';

/**
 * Location Repository
 * Data access layer for Cantons and Cities
 */
export class LocationRepository {
  // ==================== CANTON METHODS ====================

  /**
   * Find all cantons with filtering, sorting, and pagination
   */
  async findAllCantons(
    query: CantonQueryDto
  ): Promise<{ cantons: ICanton[]; pagination: PaginationDto }> {
    const { page = 1, limit = 50, sort = 'code', is_active, code, search } = query;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    if (code) {
      filter.code = code.toUpperCase();
    }

    if (search) {
      filter.$or = [
        { code: new RegExp(search, 'i') },
        { 'name.en': new RegExp(search, 'i') },
        { 'name.fr': new RegExp(search, 'i') },
        { 'name.de': new RegExp(search, 'i') },
        { 'name.it': new RegExp(search, 'i') },
      ];
    }

    // Count total
    const total = await Canton.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Execute query
    const cantons = await Canton.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<ICanton[]>()
      .exec();

    // Build pagination
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationDto = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { cantons, pagination };
  }

  /**
   * Find canton by ID
   */
  async findCantonById(id: string): Promise<ICanton | null> {
    return Canton.findById(id).lean<ICanton>().exec();
  }

  /**
   * Find canton by code
   */
  async findCantonByCode(code: string): Promise<ICanton | null> {
    return Canton.findOne({ code: code.toUpperCase() }).lean<ICanton>().exec();
  }

  /**
   * Create a canton
   */
  async createCanton(data: CantonCreateDto): Promise<ICanton> {
    const canton = new Canton({
      code: data.code.toUpperCase(),
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      is_active: data.is_active ?? true,
    });
    await canton.save();
    return canton.toObject();
  }

  /**
   * Update a canton
   */
  async updateCanton(id: string, data: CantonUpdateDto): Promise<ICanton | null> {
    const updateData: Record<string, unknown> = {};

    if (data.code !== undefined) {
      updateData.code = data.code.toUpperCase();
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.latitude !== undefined) {
      updateData.latitude = data.latitude;
    }
    if (data.longitude !== undefined) {
      updateData.longitude = data.longitude;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return Canton.findByIdAndUpdate(id, updateData, { new: true }).lean<ICanton>().exec();
  }

  /**
   * Delete a canton
   */
  async deleteCanton(id: string): Promise<boolean> {
    const result = await Canton.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if canton exists
   */
  async cantonExists(id: string): Promise<boolean> {
    const count = await Canton.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if canton code is unique (for create/update)
   */
  async isCantonCodeUnique(code: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { code: code.toUpperCase() };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const count = await Canton.countDocuments(filter);
    return count === 0;
  }

  // ==================== CITY METHODS ====================

  /**
   * Find all cities with filtering, sorting, and pagination
   */
  async findAllCities(
    query: CityQueryDto,
    populateCanton = false
  ): Promise<{ cities: ICity[] | CityWithCanton[]; pagination: PaginationDto }> {
    const {
      page = 1,
      limit = 50,
      sort = 'name',
      is_active,
      canton_id,
      postal_code,
      search,
    } = query;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    if (canton_id) {
      filter.canton_id = canton_id;
    }

    if (postal_code) {
      filter.postal_code = postal_code;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { 'name.en': new RegExp(search, 'i') },
        { 'name.fr': new RegExp(search, 'i') },
        { 'name.de': new RegExp(search, 'i') },
        { 'name.it': new RegExp(search, 'i') },
        { postal_code: new RegExp(search, 'i') },
      ];
    }

    // Count total
    const total = await City.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Build query
    let cityQuery = City.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    if (populateCanton) {
      cityQuery = cityQuery.populate('canton_id', 'code name is_active created_at updated_at');
    }

    const cities = await cityQuery.lean<ICity[] | CityWithCanton[]>().exec();

    // Build pagination
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationDto = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { cities, pagination };
  }

  /**
   * Find city by ID
   */
  async findCityById(id: string, populateCanton = false): Promise<ICity | CityWithCanton | null> {
    let query = City.findById(id);

    if (populateCanton) {
      query = query.populate('canton_id', 'code name is_active created_at updated_at');
    }

    return query.lean<ICity | CityWithCanton>().exec();
  }

  /**
   * Find cities by canton ID
   */
  async findCitiesByCanton(cantonId: string): Promise<ICity[]> {
    return City.find({ canton_id: cantonId, is_active: true })
      .sort({ name: 1 })
      .lean<ICity[]>()
      .exec();
  }

  /**
   * Find cities by postal code
   */
  async findCitiesByPostalCode(postalCode: string): Promise<ICity[]> {
    return City.find({ postal_code: postalCode, is_active: true })
      .populate('canton_id', 'code name')
      .lean<ICity[]>()
      .exec();
  }

  /**
   * Create a city
   */
  async createCity(data: CityCreateDto): Promise<ICity> {
    const city = new City({
      canton_id: data.canton_id,
      name: data.name,
      postal_code: data.postal_code,
      image_url: data.image_url,
      latitude: data.latitude,
      longitude: data.longitude,
      is_active: data.is_active ?? true,
    });
    await city.save();
    return city.toObject();
  }

  /**
   * Update a city
   */
  async updateCity(id: string, data: CityUpdateDto): Promise<ICity | null> {
    const updateData: Record<string, unknown> = {};

    if (data.canton_id !== undefined) {
      updateData.canton_id = data.canton_id;
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.postal_code !== undefined) {
      updateData.postal_code = data.postal_code;
    }
    if (data.image_url !== undefined) {
      updateData.image_url = data.image_url;
    }
    if (data.latitude !== undefined) {
      updateData.latitude = data.latitude;
    }
    if (data.longitude !== undefined) {
      updateData.longitude = data.longitude;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return City.findByIdAndUpdate(id, updateData, { new: true }).lean<ICity>().exec();
  }

  /**
   * Delete a city
   */
  async deleteCity(id: string): Promise<boolean> {
    const result = await City.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if city exists
   */
  async cityExists(id: string): Promise<boolean> {
    const count = await City.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Count cities in a canton
   */
  async countCitiesInCanton(cantonId: string): Promise<number> {
    return City.countDocuments({ canton_id: cantonId });
  }

  /**
   * Find popular cities with property counts (rent/buy breakdown)
   * Returns cities that have at least `minProperties` published properties.
   * Groups by city name (since cities may have multiple postal codes).
   */
  async findPopularCities(
    minProperties = 10,
    limit = 12
  ): Promise<
    Array<{
      _id: string;
      city_name: ICity['name'];
      image_url: string | null;
      canton_code: string;
      canton_name: ICity['name'];
      rent_count: number;
      buy_count: number;
      total_count: number;
    }>
  > {
    const Property = mongoose.model('Property');

    const results = await Property.aggregate([
      // Only count published/approved properties
      {
        $match: {
          status: { $in: ['PUBLISHED', 'APPROVED'] },
        },
      },
      // Group by city_id & transaction_type
      {
        $group: {
          _id: { city_id: '$city_id', transaction_type: '$transaction_type' },
          count: { $sum: 1 },
        },
      },
      // Reshape: group by city_id to get rent/buy counts
      {
        $group: {
          _id: '$_id.city_id',
          rent_count: {
            $sum: {
              $cond: [{ $eq: ['$_id.transaction_type', 'rent'] }, '$count', 0],
            },
          },
          buy_count: {
            $sum: {
              $cond: [{ $eq: ['$_id.transaction_type', 'buy'] }, '$count', 0],
            },
          },
          total_count: { $sum: '$count' },
        },
      },
      // Filter by minimum properties
      {
        $match: { total_count: { $gte: minProperties } },
      },
      // Lookup city details
      {
        $lookup: {
          from: 'cities',
          localField: '_id',
          foreignField: '_id',
          as: 'city',
        },
      },
      { $unwind: '$city' },
      // Only active cities
      { $match: { 'city.is_active': true } },
      // Lookup canton
      {
        $lookup: {
          from: 'cantons',
          localField: 'city.canton_id',
          foreignField: '_id',
          as: 'canton',
        },
      },
      { $unwind: '$canton' },
      // Project final shape
      {
        $project: {
          _id: '$city._id',
          city_name: '$city.name',
          image_url: { $ifNull: ['$city.image_url', null] },
          canton_code: '$canton.code',
          canton_name: '$canton.name',
          rent_count: 1,
          buy_count: 1,
          total_count: 1,
        },
      },
      // Sort by total properties descending
      { $sort: { total_count: -1 } },
      // Limit results
      { $limit: limit },
    ]);

    return results;
  }
}

// Export singleton instance
export const locationRepository = new LocationRepository();
