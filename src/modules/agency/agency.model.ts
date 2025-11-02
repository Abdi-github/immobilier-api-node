import mongoose, { Schema, Document } from 'mongoose';
import { IMultilingualText } from '../location/index.js';

/**
 * Agency status enum
 */
export const AGENCY_STATUS = ['active', 'pending', 'suspended', 'inactive'] as const;
export type AgencyStatus = (typeof AGENCY_STATUS)[number];

/**
 * Agency document interface
 */
export interface IAgency extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: IMultilingualText;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address: string;
  city_id: mongoose.Types.ObjectId;
  canton_id: mongoose.Types.ObjectId;
  postal_code?: string;
  status: AgencyStatus;
  is_verified: boolean;
  verification_date?: Date;
  total_properties: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Agency Schema
 */
const agencySchema = new Schema<IAgency>(
  {
    name: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
      maxlength: [200, 'Agency name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      en: { type: String, trim: true, maxlength: 2000 },
      fr: { type: String, trim: true, maxlength: 2000 },
      de: { type: String, trim: true, maxlength: 2000 },
      it: { type: String, trim: true, maxlength: 2000 },
    },
    logo_url: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    contact_person: {
      type: String,
      trim: true,
      maxlength: [200, 'Contact person name cannot exceed 200 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    city_id: {
      type: Schema.Types.ObjectId,
      ref: 'City',
      required: [true, 'City ID is required'],
      index: true,
    },
    canton_id: {
      type: Schema.Types.ObjectId,
      ref: 'Canton',
      required: [true, 'Canton ID is required'],
      index: true,
    },
    postal_code: {
      type: String,
      trim: true,
      maxlength: [10, 'Postal code cannot exceed 10 characters'],
    },
    status: {
      type: String,
      enum: {
        values: AGENCY_STATUS,
        message: 'Status must be one of: active, pending, suspended, inactive',
      },
      default: 'active',
      index: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verification_date: {
      type: Date,
    },
    total_properties: {
      type: Number,
      default: 0,
      min: [0, 'Total properties cannot be negative'],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'agencies',
  }
);

// Compound indexes
agencySchema.index({ status: 1, is_verified: 1 });
agencySchema.index({ canton_id: 1, city_id: 1 });
agencySchema.index({ canton_id: 1, status: 1 });

// Text search index
agencySchema.index({ name: 'text', address: 'text' });

// Pre-save hook to generate slug if not provided
agencySchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[àáâäã]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôöõ]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

export const Agency = mongoose.model<IAgency>('Agency', agencySchema);
