import { NotFoundError, ConflictError } from '../../shared/errors/AppError.js';
import { IMultilingualText, SupportedLanguage } from '../location/canton.model.js';
import { categoryRepository } from './category.repository.js';
import { CategorySection } from './category.model.js';
import {
  CategoryQueryDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  CategoryResponseDto,
  CategoryListResponseDto,
} from './category.types.js';

/**
 * Category Service
 * Business logic for Category operations
 */
export class CategoryService {
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
   * Transform category to response DTO
   */
  private transformCategoryToResponse(
    category: {
      _id: { toString: () => string };
      section: CategorySection;
      slug: string;
      name: IMultilingualText;
      icon?: string;
      sort_order: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    },
    lang?: SupportedLanguage
  ): CategoryResponseDto {
    return {
      id: category._id.toString(),
      section: category.section,
      slug: category.slug,
      name: this.getLocalizedName(category.name, lang),
      icon: category.icon,
      sort_order: category.sort_order,
      is_active: category.is_active,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get all categories with filtering, sorting, and pagination
   */
  async getAll(query: CategoryQueryDto): Promise<CategoryListResponseDto> {
    const { categories, pagination } = await categoryRepository.findAll(query);

    return {
      data: categories.map((category) => this.transformCategoryToResponse(category, query.lang)),
      pagination,
    };
  }

  /**
   * Get category by ID
   */
  async getById(id: string, lang?: SupportedLanguage): Promise<CategoryResponseDto> {
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw NotFoundError('Category not found');
    }

    return this.transformCategoryToResponse(category, lang);
  }

  /**
   * Get category by slug
   */
  async getBySlug(slug: string, lang?: SupportedLanguage): Promise<CategoryResponseDto> {
    const category = await categoryRepository.findBySlug(slug);

    if (!category) {
      throw NotFoundError('Category not found');
    }

    return this.transformCategoryToResponse(category, lang);
  }

  /**
   * Get categories by section
   */
  async getBySection(
    section: CategorySection,
    lang?: SupportedLanguage
  ): Promise<CategoryResponseDto[]> {
    const categories = await categoryRepository.findBySection(section);

    return categories.map((category) => this.transformCategoryToResponse(category, lang));
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Create a new category (Admin only)
   */
  async create(data: CategoryCreateDto): Promise<CategoryResponseDto> {
    // Check for unique slug
    const isUnique = await categoryRepository.isSlugUnique(data.slug);
    if (!isUnique) {
      throw ConflictError('A category with this slug already exists');
    }

    const category = await categoryRepository.create(data);

    return this.transformCategoryToResponse(category);
  }

  /**
   * Update a category (Admin only)
   */
  async update(id: string, data: CategoryUpdateDto): Promise<CategoryResponseDto> {
    // Check if category exists
    const exists = await categoryRepository.exists(id);
    if (!exists) {
      throw NotFoundError('Category not found');
    }

    // Check for unique slug if slug is being updated
    if (data.slug) {
      const isUnique = await categoryRepository.isSlugUnique(data.slug, id);
      if (!isUnique) {
        throw ConflictError('A category with this slug already exists');
      }
    }

    const updated = await categoryRepository.update(id, data);

    if (!updated) {
      throw NotFoundError('Category not found');
    }

    return this.transformCategoryToResponse(updated);
  }

  /**
   * Delete a category (Admin only)
   */
  async delete(id: string): Promise<void> {
    // Check if category exists
    const exists = await categoryRepository.exists(id);
    if (!exists) {
      throw NotFoundError('Category not found');
    }

    // TODO: Check if category is being used by any properties
    // This should be added when the Property module is implemented

    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw NotFoundError('Category not found');
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
