import mongoose, { Schema, Document } from 'mongoose';

import { IMultilingualText } from '../location/canton.model.js';

/**
 * Amenity group type
 */
export type AmenityGroup =
  | 'general'
  | 'kitchen'
  | 'bathroom'
  | 'outdoor'
  | 'security'
  | 'parking'
  | 'accessibility'
  | 'energy'
  | 'other';

/**
 * Amenity document interface
 */
export interface IAmenity extends Document {
  _id: mongoose.Types.ObjectId;
  name: IMultilingualText;
  group: AmenityGroup;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Amenity Schema
 */
const amenitySchema = new Schema<IAmenity>(
  {
    name: {
      en: { type: String, trim: true, required: [true, 'English name is required'] },
      fr: { type: String, trim: true, required: [true, 'French name is required'] },
      de: { type: String, trim: true, required: [true, 'German name is required'] },
      it: { type: String, trim: true, required: [true, 'Italian name is required'] },
    },
    group: {
      type: String,
      required: [true, 'Amenity group is required'],
      enum: {
        values: [
          'general',
          'kitchen',
          'bathroom',
          'outdoor',
          'security',
          'parking',
          'accessibility',
          'energy',
          'other',
        ],
        message:
          'Group must be one of: general, kitchen, bathroom, outdoor, security, parking, accessibility, energy, other',
      },
      index: true,
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
    collection: 'amenities',
  }
);

// Indexes
amenitySchema.index({ group: 1, is_active: 1 });
amenitySchema.index({ sort_order: 1 });
amenitySchema.index({ 'name.en': 'text', 'name.fr': 'text', 'name.de': 'text', 'name.it': 'text' });

export const Amenity = mongoose.model<IAmenity>('Amenity', amenitySchema);
