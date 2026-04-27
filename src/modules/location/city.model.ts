import mongoose, { Schema, Document } from 'mongoose';
import { IMultilingualText } from './canton.model.js';

/**
 * City document interface
 */
export interface ICity extends Document {
  _id: mongoose.Types.ObjectId;
  canton_id: mongoose.Types.ObjectId;
  name: IMultilingualText;
  postal_code: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * City Schema
 */
const citySchema = new Schema<ICity>(
  {
    canton_id: {
      type: Schema.Types.ObjectId,
      ref: 'Canton',
      required: [true, 'Canton ID is required'],
      index: true,
    },
    name: {
      en: { type: String, trim: true },
      fr: { type: String, trim: true },
      de: { type: String, trim: true },
      it: { type: String, trim: true },
    },
    postal_code: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
    },
    image_url: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
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
    collection: 'cities',
  }
);

// Indexes
citySchema.index({ canton_id: 1, postal_code: 1 });
citySchema.index({ postal_code: 1 });
citySchema.index({ is_active: 1 });
citySchema.index({ 'name.en': 'text', 'name.fr': 'text', 'name.de': 'text', 'name.it': 'text' });

export const City = mongoose.model<ICity>('City', citySchema);
