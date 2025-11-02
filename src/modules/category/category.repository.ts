import { Category, ICategory } from './category.model.js';
import {
  CategoryQueryDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  PaginationDto,
} from './category.types.js';

/**
 * Category Repository
 * Data access layer for Categories
 */
export class CategoryRepository {
  /**
   * Find all categories with filtering, sorting, and pagination
   */
  async findAll(
    query: CategoryQueryDto
  ): Promise<{ categories: ICategory[]; pagination: PaginationDto }> {
    const { page = 1, limit = 50, sort = 'sort_order', is_active, section, search } = query;

    // Build filter - by default only show active categories unless explicitly filtered
    const filter: Record<string, unknown> = {};

    // Default to showing only active categories if not explicitly specified
    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    } else {
      filter.is_active = true;
    }

    if (section) {
      filter.section = section;
    }

    if (search) {
      filter.$or = [
        { slug: new RegExp(search, 'i') },
        { 'name.en': new RegExp(search, 'i') },
        { 'name.fr': new RegExp(search, 'i') },
        { 'name.de': new RegExp(search, 'i') },
        { 'name.it': new RegExp(search, 'i') },
      ];
    }

    // Count total
    const total = await Category.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Execute query
    const categories = await Category.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<ICategory[]>()
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

    return { categories, pagination };
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<ICategory | null> {
    return Category.findById(id).lean<ICategory>().exec();
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<ICategory | null> {
    return Category.findOne({ slug: slug.toLowerCase() }).lean<ICategory>().exec();
  }

  /**
   * Find categories by section
   */
  async findBySection(section: string): Promise<ICategory[]> {
    return Category.find({ section, is_active: true })
      .sort({ sort_order: 1 })
      .lean<ICategory[]>()
      .exec();
  }

  /**
   * Create a category
   */
  async create(data: CategoryCreateDto): Promise<ICategory> {
    const category = new Category({
      section: data.section,
      slug: data.slug.toLowerCase(),
      name: data.name,
      icon: data.icon,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    });
    await category.save();
    return category.toObject();
  }

  /**
   * Update a category
   */
  async update(id: string, data: CategoryUpdateDto): Promise<ICategory | null> {
    const updateData: Record<string, unknown> = {};

    if (data.section !== undefined) {
      updateData.section = data.section;
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug.toLowerCase();
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.icon !== undefined) {
      updateData.icon = data.icon;
    }
    if (data.sort_order !== undefined) {
      updateData.sort_order = data.sort_order;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return Category.findByIdAndUpdate(id, updateData, { new: true }).lean<ICategory>().exec();
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<boolean> {
    const result = await Category.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if category exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await Category.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if slug is unique (for create/update)
   */
  async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const count = await Category.countDocuments(filter);
    return count === 0;
  }

  /**
   * Count categories (for validation)
   */
  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return Category.countDocuments(filter);
  }
}

// Export singleton instance
export const categoryRepository = new CategoryRepository();
