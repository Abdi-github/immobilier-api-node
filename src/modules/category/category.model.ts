import mongoose, { Schema, Document } from 'mongoose';
import { IMultilingualText } from '../location/canton.model.js';

/**
 * Category section type
 */
export type CategorySection = 'residential' | 'commercial' | 'land' | 'parking' | 'special';

/**
 * Category document interface
 */
export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  section: CategorySection;
  name: IMultilingualText;
  slug: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Category Schema
 */
const categorySchema = new Schema<ICategory>(
  {
    section: {
      type: String,
      required: [true, 'Section is required'],
      enum: {
        values: ['residential', 'commercial', 'land', 'parking', 'special'],
        message: 'Section must be one of: residential, commercial, land, parking, special',
      },
      index: true,
    },
    name: {
      en: { type: String, trim: true, required: [true, 'English name is required'] },
      fr: { type: String, trim: true, required: [true, 'French name is required'] },
      de: { type: String, trim: true, required: [true, 'German name is required'] },
      it: { type: String, trim: true, required: [true, 'Italian name is required'] },
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'categories',
  }
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ section: 1, is_active: 1 });
categorySchema.index({ sort_order: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
