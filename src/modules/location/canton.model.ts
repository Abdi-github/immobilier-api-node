import mongoose, { Schema, Document } from 'mongoose';

/**
 * Supported languages for the platform
 */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

/**
 * Multilingual text structure
 */
export interface IMultilingualText {
  en?: string;
  fr?: string;
  de?: string;
  it?: string;
}

/**
 * Canton document interface
 */
export interface ICanton extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: IMultilingualText;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Canton Schema
 */
const cantonSchema = new Schema<ICanton>(
  {
    code: {
      type: String,
      required: [true, 'Canton code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [2, 'Canton code must be exactly 2 characters'],
      minlength: [2, 'Canton code must be exactly 2 characters'],
    },
    name: {
      en: { type: String, trim: true },
      fr: { type: String, trim: true },
      de: { type: String, trim: true },
      it: { type: String, trim: true },
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
    collection: 'cantons',
  }
);

// Indexes
cantonSchema.index({ code: 1 });
cantonSchema.index({ is_active: 1 });
cantonSchema.index({ 'name.en': 'text', 'name.fr': 'text', 'name.de': 'text', 'name.it': 'text' });

export const Canton = mongoose.model<ICanton>('Canton', cantonSchema);
