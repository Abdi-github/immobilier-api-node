import mongoose from 'mongoose';
import { Property, IProperty, PropertyStatus } from './property.model.js';
import { PropertyImage } from './property-image.model.js';
import { Category } from '../category/category.model.js';
import {
  PropertyFilterOptions,
  PropertyPaginationOptions,
  PropertyCursorPaginationOptions,
  PropertyFindResult,
  PropertyCursorFindResult,
  PropertyWithPopulated,
  PropertyCreateDto,
  PropertyUpdateDto,
  PropertyImageCreateDto,
  PropertyImageUpdateDto,
} from './property.types.js';
import { IPropertyImage } from './property-image.model.js';

/**
 * Property Repository
 * Handles all database operations for properties
 */
export class PropertyRepository {
  /**
   * Build query object from filters
   */
  private buildQuery(
    filters: PropertyFilterOptions,
    includeUnpublished = false
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    // Status filter (default: only PUBLISHED for public)
    if (filters.status) {
      query.status = filters.status;
    } else if (!includeUnpublished) {
      query.status = 'PUBLISHED';
    }

    // Location filters
    if (filters.canton_id) {
      query.canton_id = new mongoose.Types.ObjectId(filters.canton_id);
    }
    if (filters.city_id) {
      query.city_id = new mongoose.Types.ObjectId(filters.city_id);
    }
    if (filters.postal_code) {
      query.postal_code = filters.postal_code;
    }

    // Property filters
    if (filters.category_id) {
      // Support comma-separated category IDs for multi-select
      const categoryIds = filters.category_id.split(',').map((id) => id.trim());
      if (categoryIds.length === 1) {
        query.category_id = new mongoose.Types.ObjectId(categoryIds[0]);
      } else {
        query.category_id = { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    }

    // Section filter (for category section - residential/commercial)
    // Note: This will be handled separately via lookup or pre-query
    // The section filter requires getting category IDs first

    if (filters.transaction_type) {
      query.transaction_type = filters.transaction_type;
    }
    if (filters.agency_id) {
      query.agency_id = new mongoose.Types.ObjectId(filters.agency_id);
    }
    if (filters.owner_id) {
      query.owner_id = new mongoose.Types.ObjectId(filters.owner_id);
    }

    // Price range
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
      query.price = {};
      if (filters.price_min !== undefined) {
        (query.price as Record<string, number>).$gte = filters.price_min;
      }
      if (filters.price_max !== undefined) {
        (query.price as Record<string, number>).$lte = filters.price_max;
      }
    }

    // Rooms range
    if (filters.rooms_min !== undefined || filters.rooms_max !== undefined) {
      query.rooms = {};
      if (filters.rooms_min !== undefined) {
        (query.rooms as Record<string, number>).$gte = filters.rooms_min;
      }
      if (filters.rooms_max !== undefined) {
        (query.rooms as Record<string, number>).$lte = filters.rooms_max;
      }
    }

    // Surface range
    if (filters.surface_min !== undefined || filters.surface_max !== undefined) {
      query.surface = {};
      if (filters.surface_min !== undefined) {
        (query.surface as Record<string, number>).$gte = filters.surface_min;
      }
      if (filters.surface_max !== undefined) {
        (query.surface as Record<string, number>).$lte = filters.surface_max;
      }
    }

    // Amenities filter (all specified amenities must be present)
    if (filters.amenities && filters.amenities.length > 0) {
      query.amenities = {
        $all: filters.amenities.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Search filter (address)
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ address: searchRegex }, { external_id: searchRegex }];
    }

    return query;
  }

  /**
   * Populate property with related documents
   */
  private populateProperty(queryBuilder: mongoose.Query<unknown, unknown>) {
    return queryBuilder
      .populate('category_id', '_id name section')
      .populate('agency_id', '_id name slug')
      .populate('city_id', '_id name')
      .populate('canton_id', '_id name code')
      .populate('amenities', '_id name icon');
  }

  /**
   * Find all properties with filtering and offset pagination
   */
  async findAll(
    filters: PropertyFilterOptions,
    pagination: PropertyPaginationOptions,
    includeUnpublished = false
  ): Promise<PropertyFindResult> {
    // Handle section filter by getting category IDs first
    let effectiveFilters = { ...filters };
    if (filters.section && !filters.category_id) {
      const categoryIds = await Category.find(
        { section: filters.section, is_active: true },
        { _id: 1 }
      ).lean();
      console.log(
        `[PropertyRepository] Section filter: ${filters.section}, Found ${categoryIds.length} categories`
      );
      if (categoryIds.length > 0) {
        effectiveFilters.category_id = categoryIds.map((c) => c._id.toString()).join(',');
        console.log(`[PropertyRepository] Category IDs filter: ${effectiveFilters.category_id}`);
      } else {
        // No categories found for this section - return empty result
        console.log(`[PropertyRepository] No categories found for section: ${filters.section}`);
        return { properties: [], total: 0 };
      }
    }

    const query = this.buildQuery(effectiveFilters, includeUnpublished);

    // Build sort
    const sortOrder = pagination.order === 'desc' ? -1 : 1;
    const sort: Record<string, 1 | -1> = {
      [pagination.sort]: sortOrder,
    };

    // Get total count
    const total = await Property.countDocuments(query);

    // Get paginated results with population
    const propertiesQuery = Property.find(query)
      .sort(sort)
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit);

    const properties = await this.populateProperty(propertiesQuery).lean<PropertyWithPopulated[]>();

    return { properties, total };
  }

  /**
   * Find all properties with cursor-based pagination
   * Cursor format: base64(published_at:_id)
   */
  async findAllWithCursor(
    filters: PropertyFilterOptions,
    pagination: PropertyCursorPaginationOptions,
    includeUnpublished = false
  ): Promise<PropertyCursorFindResult> {
    // Handle section filter by getting category IDs first
    let effectiveFilters = { ...filters };
    if (filters.section && !filters.category_id) {
      const categoryIds = await Category.find(
        { section: filters.section, is_active: true },
        { _id: 1 }
      ).lean();
      if (categoryIds.length > 0) {
        effectiveFilters.category_id = categoryIds.map((c) => c._id.toString()).join(',');
      }
    }

    const query = this.buildQuery(effectiveFilters, includeUnpublished);

    // Parse cursor if present
    if (pagination.cursor) {
      try {
        const decoded = Buffer.from(pagination.cursor, 'base64').toString('utf-8');
        const [publishedAt, id] = decoded.split(':');
        const cursorDate = new Date(publishedAt);
        const cursorId = new mongoose.Types.ObjectId(id);

        if (pagination.direction === 'next') {
          // Get items after cursor (older)
          query.$or = [
            { published_at: { $lt: cursorDate } },
            {
              published_at: cursorDate,
              _id: { $lt: cursorId },
            },
          ];
        } else {
          // Get items before cursor (newer)
          query.$or = [
            { published_at: { $gt: cursorDate } },
            {
              published_at: cursorDate,
              _id: { $gt: cursorId },
            },
          ];
        }
      } catch {
        // Invalid cursor, ignore it
      }
    }

    // Get total count (without cursor constraints)
    const totalQuery = this.buildQuery(effectiveFilters, includeUnpublished);
    const total = await Property.countDocuments(totalQuery);

    // Fetch one extra to determine if there are more pages
    const sort: Record<string, 1 | -1> =
      pagination.direction === 'prev' ? { published_at: 1, _id: 1 } : { published_at: -1, _id: -1 };

    const propertiesQuery = Property.find(query)
      .sort(sort)
      .limit(pagination.limit + 1);

    let properties = await this.populateProperty(propertiesQuery).lean<PropertyWithPopulated[]>();

    // Determine if there are more pages
    const hasMore = properties.length > pagination.limit;
    if (hasMore) {
      properties = properties.slice(0, pagination.limit);
    }

    // Reverse if going backwards
    if (pagination.direction === 'prev') {
      properties.reverse();
    }

    // Generate cursors
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;

    if (properties.length > 0) {
      const firstProperty = properties[0];
      const lastProperty = properties[properties.length - 1];

      // Next cursor (for older items)
      if (pagination.direction === 'next' ? hasMore : pagination.cursor) {
        const publishedAt =
          lastProperty.published_at || lastProperty.created_at || new Date().toISOString();
        nextCursor = Buffer.from(`${publishedAt}:${lastProperty._id}`).toString('base64');
      }

      // Prev cursor (for newer items)
      if (pagination.direction === 'prev' ? hasMore : pagination.cursor) {
        const publishedAt =
          firstProperty.published_at || firstProperty.created_at || new Date().toISOString();
        prevCursor = Buffer.from(`${publishedAt}:${firstProperty._id}`).toString('base64');
      }
    }

    // Determine hasNext/hasPrev
    const hasNext = pagination.direction === 'next' ? hasMore : !!pagination.cursor;
    const hasPrev = pagination.direction === 'prev' ? hasMore : !!pagination.cursor;

    return {
      properties,
      total,
      hasNext,
      hasPrev,
      nextCursor,
      prevCursor,
    };
  }

  /**
   * Find property by ID
   */
  async findById(id: string): Promise<PropertyWithPopulated | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const propertyQuery = Property.findById(id);
    const property = await this.populateProperty(propertyQuery).lean<PropertyWithPopulated>();

    return property;
  }

  /**
   * Find property by external ID
   */
  async findByExternalId(externalId: string): Promise<PropertyWithPopulated | null> {
    const propertyQuery = Property.findOne({ external_id: externalId });
    const property = await this.populateProperty(propertyQuery).lean<PropertyWithPopulated>();

    return property;
  }

  /**
   * Check if external ID exists
   */
  async externalIdExists(externalId: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { external_id: externalId };
    if (excludeId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Property.countDocuments(query);
    return count > 0;
  }

  /**
   * Find properties by canton
   */
  async findByCanton(
    cantonId: string,
    pagination: PropertyPaginationOptions,
    includeUnpublished = false
  ): Promise<PropertyFindResult> {
    return this.findAll({ canton_id: cantonId }, pagination, includeUnpublished);
  }

  /**
   * Find properties by city
   */
  async findByCity(
    cityId: string,
    pagination: PropertyPaginationOptions,
    includeUnpublished = false
  ): Promise<PropertyFindResult> {
    return this.findAll({ city_id: cityId }, pagination, includeUnpublished);
  }

  /**
   * Find properties by agency
   */
  async findByAgency(
    agencyId: string,
    pagination: PropertyPaginationOptions,
    includeUnpublished = false
  ): Promise<PropertyFindResult> {
    return this.findAll({ agency_id: agencyId }, pagination, includeUnpublished);
  }

  /**
   * Find properties by category
   */
  async findByCategory(
    categoryId: string,
    pagination: PropertyPaginationOptions,
    includeUnpublished = false
  ): Promise<PropertyFindResult> {
    return this.findAll({ category_id: categoryId }, pagination, includeUnpublished);
  }

  /**
   * Create a new property
   */
  async create(data: PropertyCreateDto): Promise<IProperty> {
    const propertyData: Record<string, unknown> = {
      ...data,
      category_id: new mongoose.Types.ObjectId(data.category_id),
      city_id: new mongoose.Types.ObjectId(data.city_id),
      canton_id: new mongoose.Types.ObjectId(data.canton_id),
    };

    // Convert optional ObjectId fields
    if (data.agency_id) {
      propertyData.agency_id = new mongoose.Types.ObjectId(data.agency_id);
    }
    if (data.owner_id) {
      propertyData.owner_id = new mongoose.Types.ObjectId(data.owner_id);
    }
    if (data.amenities && data.amenities.length > 0) {
      propertyData.amenities = data.amenities.map((id) => new mongoose.Types.ObjectId(id));
    }

    const property = new Property(propertyData);
    return property.save();
  }

  /**
   * Update a property
   */
  async update(id: string, data: PropertyUpdateDto): Promise<IProperty | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateData: Record<string, unknown> = { ...data };

    // Convert string IDs to ObjectIds if present
    if (data.category_id) {
      updateData.category_id = new mongoose.Types.ObjectId(data.category_id);
    }
    if (data.city_id) {
      updateData.city_id = new mongoose.Types.ObjectId(data.city_id);
    }
    if (data.canton_id) {
      updateData.canton_id = new mongoose.Types.ObjectId(data.canton_id);
    }
    if (data.agency_id) {
      updateData.agency_id = new mongoose.Types.ObjectId(data.agency_id);
    }
    if (data.owner_id) {
      updateData.owner_id = new mongoose.Types.ObjectId(data.owner_id);
    }
    if (data.amenities && data.amenities.length > 0) {
      updateData.amenities = data.amenities.map((id) => new mongoose.Types.ObjectId(id));
    }

    const property = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return property;
  }

  /**
   * Delete a property (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await Property.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Update property status
   */
  async updateStatus(
    id: string,
    status: PropertyStatus,
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<IProperty | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateData: Record<string, unknown> = { status };

    if (reviewedBy) {
      updateData.reviewed_by = new mongoose.Types.ObjectId(reviewedBy);
      updateData.reviewed_at = new Date();
    }

    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    // Set published_at when publishing
    if (status === 'PUBLISHED') {
      updateData.published_at = new Date();
    }

    return Property.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  /**
   * Approve a property
   */
  async approve(id: string, reviewedBy: string): Promise<IProperty | null> {
    return this.updateStatus(id, 'APPROVED', reviewedBy);
  }

  /**
   * Reject a property
   */
  async reject(id: string, reviewedBy: string, reason: string): Promise<IProperty | null> {
    return this.updateStatus(id, 'REJECTED', reviewedBy, reason);
  }

  /**
   * Publish a property
   */
  async publish(id: string): Promise<IProperty | null> {
    return this.updateStatus(id, 'PUBLISHED');
  }

  /**
   * Archive a property
   */
  async archive(id: string): Promise<IProperty | null> {
    return this.updateStatus(id, 'ARCHIVED');
  }

  /**
   * Count properties by status
   */
  async countByStatus(scope?: {
    agency_id?: string;
    owner_id?: string;
  }): Promise<Record<string, number>> {
    const pipeline: any[] = [];

    if (scope?.agency_id) {
      pipeline.push({ $match: { agency_id: new mongoose.Types.ObjectId(scope.agency_id) } });
    } else if (scope?.owner_id) {
      pipeline.push({ $match: { owner_id: new mongoose.Types.ObjectId(scope.owner_id) } });
    }

    pipeline.push({
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    });

    const result = await Property.aggregate(pipeline);

    const counts: Record<string, number> = {
      DRAFT: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      REJECTED: 0,
      PUBLISHED: 0,
      ARCHIVED: 0,
    };

    result.forEach((item: { _id: string; count: number }) => {
      counts[item._id] = item.count;
    });

    return counts;
  }

  /**
   * Count properties by transaction type
   */
  async countByTransactionType(scope?: {
    agency_id?: string;
    owner_id?: string;
  }): Promise<Record<string, number>> {
    const pipeline: any[] = [];

    if (scope?.agency_id) {
      pipeline.push({ $match: { agency_id: new mongoose.Types.ObjectId(scope.agency_id) } });
    } else if (scope?.owner_id) {
      pipeline.push({ $match: { owner_id: new mongoose.Types.ObjectId(scope.owner_id) } });
    }

    pipeline.push({
      $group: {
        _id: '$transaction_type',
        count: { $sum: 1 },
      },
    });

    const result = await Property.aggregate(pipeline);

    const counts: Record<string, number> = {
      rent: 0,
      buy: 0,
    };

    result.forEach((item: { _id: string; count: number }) => {
      counts[item._id] = item.count;
    });

    return counts;
  }

  /**
   * Count properties by canton
   */
  async countByCanton(scope?: {
    agency_id?: string;
    owner_id?: string;
  }): Promise<
    Array<{ canton_id: string; canton_name: string; canton_code: string; count: number }>
  > {
    const pipeline: any[] = [];

    if (scope?.agency_id) {
      pipeline.push({ $match: { agency_id: new mongoose.Types.ObjectId(scope.agency_id) } });
    } else if (scope?.owner_id) {
      pipeline.push({ $match: { owner_id: new mongoose.Types.ObjectId(scope.owner_id) } });
    }

    pipeline.push({
      $group: {
        _id: '$canton_id',
        count: { $sum: 1 },
      },
    });

    const result = await Property.aggregate([
      ...pipeline,
      {
        $lookup: {
          from: 'cantons',
          localField: '_id',
          foreignField: '_id',
          as: 'canton',
        },
      },
      {
        $unwind: '$canton',
      },
      {
        $project: {
          canton_id: { $toString: '$_id' },
          canton_name: '$canton.name.en',
          canton_code: '$canton.code',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return result;
  }

  /**
   * Calculate average prices
   */
  async calculateAveragePrices(scope?: {
    agency_id?: string;
    owner_id?: string;
  }): Promise<{ buy: number | null; rent: number | null }> {
    const matchFilter: any = {
      status: 'PUBLISHED',
      price: { $gt: 0 },
    };

    if (scope?.agency_id) {
      matchFilter.agency_id = new mongoose.Types.ObjectId(scope.agency_id);
    } else if (scope?.owner_id) {
      matchFilter.owner_id = new mongoose.Types.ObjectId(scope.owner_id);
    }

    const result = await Property.aggregate([
      {
        $match: matchFilter,
      },
      {
        $group: {
          _id: '$transaction_type',
          avgPrice: { $avg: '$price' },
        },
      },
    ]);

    const prices: { buy: number | null; rent: number | null } = {
      buy: null,
      rent: null,
    };

    result.forEach((item: { _id: string; avgPrice: number }) => {
      if (item._id === 'buy') {
        prices.buy = Math.round(item.avgPrice);
      } else if (item._id === 'rent') {
        prices.rent = Math.round(item.avgPrice);
      }
    });

    return prices;
  }

  /**
   * Get total count
   */
  async count(filters?: PropertyFilterOptions, includeUnpublished = false): Promise<number> {
    const query = filters ? this.buildQuery(filters, includeUnpublished) : {};
    return Property.countDocuments(query);
  }

  // ==========================================
  // Property Image Methods
  // ==========================================

  /**
   * Get images for a property
   */
  async getImages(propertyId: string): Promise<IPropertyImage[]> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return [];
    }

    const images = await PropertyImage.find({
      property_id: new mongoose.Types.ObjectId(propertyId),
    })
      .sort({ sort_order: 1 })
      .lean();

    return images as unknown as IPropertyImage[];
  }

  /**
   * Get images for multiple properties (batch operation)
   * Returns a Map with property_id as key and images array as value
   */
  async getImagesForProperties(propertyIds: string[]): Promise<Map<string, IPropertyImage[]>> {
    const validIds = propertyIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return new Map();
    }

    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

    const images = await PropertyImage.find({
      property_id: { $in: objectIds },
    })
      .sort({ property_id: 1, sort_order: 1 })
      .lean();

    // Group images by property_id
    const imageMap = new Map<string, IPropertyImage[]>();
    for (const img of images) {
      const propId = img.property_id.toString();
      if (!imageMap.has(propId)) {
        imageMap.set(propId, []);
      }
      imageMap.get(propId)!.push(img as unknown as IPropertyImage);
    }

    return imageMap;
  }

  /**
   * Get primary image for a property
   */
  async getPrimaryImage(propertyId: string): Promise<IPropertyImage | null> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return null;
    }

    const image = await PropertyImage.findOne({
      property_id: new mongoose.Types.ObjectId(propertyId),
      is_primary: true,
    }).lean();

    return image as unknown as IPropertyImage | null;
  }

  /**
   * Add image to property
   */
  async addImage(data: PropertyImageCreateDto): Promise<IPropertyImage> {
    // If this is the first image or marked as primary, ensure only one primary
    if (data.is_primary) {
      await PropertyImage.updateMany(
        { property_id: new mongoose.Types.ObjectId(data.property_id) },
        { is_primary: false }
      );
    }

    // Get max sort order if not provided
    if (data.sort_order === undefined) {
      const lastImage = await PropertyImage.findOne({
        property_id: new mongoose.Types.ObjectId(data.property_id),
      })
        .sort({ sort_order: -1 })
        .lean();
      data.sort_order = lastImage ? lastImage.sort_order + 1 : 0;
    }

    const image = new PropertyImage({
      ...data,
      property_id: new mongoose.Types.ObjectId(data.property_id),
    });

    return image.save();
  }

  /**
   * Update property image
   */
  async updateImage(imageId: string, data: PropertyImageUpdateDto): Promise<IPropertyImage | null> {
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return null;
    }

    // If setting as primary, unset other primary images
    if (data.is_primary) {
      const image = await PropertyImage.findById(imageId);
      if (image) {
        await PropertyImage.updateMany({ property_id: image.property_id }, { is_primary: false });
      }
    }

    const updatedImage = await PropertyImage.findByIdAndUpdate(imageId, data, {
      new: true,
      runValidators: true,
    }).lean();

    return updatedImage as unknown as IPropertyImage | null;
  }

  /**
   * Delete property image
   */
  async deleteImage(imageId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return false;
    }

    const result = await PropertyImage.findByIdAndDelete(imageId);
    return result !== null;
  }

  /**
   * Delete all images for a property
   */
  async deleteAllImages(propertyId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return 0;
    }

    const result = await PropertyImage.deleteMany({
      property_id: new mongoose.Types.ObjectId(propertyId),
    });
    return result.deletedCount;
  }

  /**
   * Reorder images for a property
   */
  async reorderImages(
    propertyId: string,
    imageOrders: Array<{ id: string; sort_order: number }>
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return false;
    }

    const bulkOps = imageOrders.map((item) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(item.id),
          property_id: new mongoose.Types.ObjectId(propertyId),
        },
        update: { sort_order: item.sort_order },
      },
    }));

    await PropertyImage.bulkWrite(bulkOps);
    return true;
  }

  /**
   * Find image by ID
   */
  async findImageById(imageId: string): Promise<IPropertyImage | null> {
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return null;
    }

    const image = await PropertyImage.findById(imageId).lean();
    return image as unknown as IPropertyImage | null;
  }

  /**
   * Find image by public_id (Cloudinary)
   */
  async findImageByPublicId(publicId: string): Promise<IPropertyImage | null> {
    const image = await PropertyImage.findOne({ public_id: publicId }).lean();
    return image as unknown as IPropertyImage | null;
  }

  /**
   * Get all images with Cloudinary public_ids for a property
   */
  async getCloudinaryImages(propertyId: string): Promise<IPropertyImage[]> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return [];
    }

    const images = await PropertyImage.find({
      property_id: new mongoose.Types.ObjectId(propertyId),
      public_id: { $exists: true, $ne: null },
    }).lean();

    return images as unknown as IPropertyImage[];
  }

  /**
   * Get image count for a property
   */
  async getImageCount(propertyId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return 0;
    }

    return PropertyImage.countDocuments({
      property_id: new mongoose.Types.ObjectId(propertyId),
    });
  }

  /**
   * Batch add images
   */
  async addImages(images: PropertyImageCreateDto[]): Promise<IPropertyImage[]> {
    if (images.length === 0) {
      return [];
    }

    const propertyId = images[0].property_id;

    // Get max sort order
    const lastImage = await PropertyImage.findOne({
      property_id: new mongoose.Types.ObjectId(propertyId),
    })
      .sort({ sort_order: -1 })
      .lean();

    let nextOrder = lastImage ? lastImage.sort_order + 1 : 0;

    // Prepare documents with auto-incrementing sort_order
    const docs = images.map((img, index) => ({
      ...img,
      property_id: new mongoose.Types.ObjectId(img.property_id),
      sort_order: img.sort_order ?? nextOrder + index,
    }));

    // Handle primary flag - only the first image marked as primary should be primary
    const hasPrimary = docs.some((d) => d.is_primary);
    if (hasPrimary) {
      await PropertyImage.updateMany(
        { property_id: new mongoose.Types.ObjectId(propertyId) },
        { is_primary: false }
      );
      // Ensure only one is marked as primary
      let foundPrimary = false;
      for (const doc of docs) {
        if (doc.is_primary) {
          if (foundPrimary) {
            doc.is_primary = false;
          }
          foundPrimary = true;
        }
      }
    }

    const inserted = await PropertyImage.insertMany(docs);
    return inserted as unknown as IPropertyImage[];
  }

  /**
   * Batch delete images by IDs
   */
  async deleteImages(imageIds: string[]): Promise<number> {
    const validIds = imageIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return 0;
    }

    const result = await PropertyImage.deleteMany({
      _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });
    return result.deletedCount;
  }
}

// Export singleton instance
export const propertyRepository = new PropertyRepository();
