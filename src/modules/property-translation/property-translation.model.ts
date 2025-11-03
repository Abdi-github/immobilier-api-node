import mongoose, { Schema, Document } from 'mongoose';
import { SupportedLanguage } from '../location/canton.model.js';

/**
 * Translation source type
 */
export type TranslationSource = 'original' | 'deepl' | 'libretranslate' | 'human';

/**
 * Translation approval status
 */
export type TranslationApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Property Translation document interface
 */
export interface IPropertyTranslation extends Document {
  _id: mongoose.Types.ObjectId;
  property_id: mongoose.Types.ObjectId;
  language: SupportedLanguage;

  title: string;
  description: string;

  source: TranslationSource;
  quality_score?: number;

  approval_status: TranslationApprovalStatus;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  rejection_reason?: string;

  created_at: Date;
  updated_at: Date;
}

/**
 * Property Translation Schema
 */
const propertyTranslationSchema = new Schema<IPropertyTranslation>(
  {
    property_id: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
      index: true,
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: {
        values: ['en', 'fr', 'de', 'it'],
        message: 'Language must be one of: en, fr, de, it',
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Translation source is required'],
      enum: {
        values: ['original', 'deepl', 'libretranslate', 'human'],
        message: 'Source must be one of: original, deepl, libretranslate, human',
      },
      default: 'original',
    },
    quality_score: {
      type: Number,
      min: [0, 'Quality score cannot be negative'],
      max: [100, 'Quality score cannot exceed 100'],
    },
    approval_status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED'],
        message: 'Approval status must be one of: PENDING, APPROVED, REJECTED',
      },
      default: 'PENDING',
      index: true,
    },
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approved_at: {
      type: Date,
    },
    rejection_reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'property_translations',
  }
);

// Compound unique index for property + language
propertyTranslationSchema.index({ property_id: 1, language: 1 }, { unique: true });

// Indexes for querying
propertyTranslationSchema.index({ property_id: 1, language: 1, approval_status: 1 });
propertyTranslationSchema.index({ approval_status: 1, language: 1 });

// Text index for search
propertyTranslationSchema.index({ title: 'text', description: 'text' });

export const PropertyTranslation = mongoose.model<IPropertyTranslation>(
  'PropertyTranslation',
  propertyTranslationSchema
);

// Note: IPropertyTranslation, TranslationSource, and TranslationApprovalStatus
// are already exported at their declaration above
