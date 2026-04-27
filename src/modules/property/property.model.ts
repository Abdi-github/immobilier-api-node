import mongoose, { Schema, Document } from 'mongoose';
import { SupportedLanguage } from '../location/canton.model.js';

/**
 * Property status type
 */
export type PropertyStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED';

/**
 * Transaction type
 */
export type TransactionType = 'rent' | 'buy';

export type PropertyLocationPrecision = 'exact' | 'postal_code' | 'city' | 'canton' | 'unknown';

export type PropertyGeocodingSource =
  | 'manual'
  | 'provider'
  | 'city_centroid'
  | 'canton_centroid';

/**
 * Property document interface
 */
export interface IProperty extends Document {
  _id: mongoose.Types.ObjectId;
  external_id: string;
  external_url?: string;

  source_language: SupportedLanguage;

  category_id: mongoose.Types.ObjectId;
  agency_id?: mongoose.Types.ObjectId;
  owner_id?: mongoose.Types.ObjectId;

  transaction_type: TransactionType;

  price: number;
  currency: 'CHF';
  additional_costs?: number;

  rooms?: number;
  surface?: number;

  address: string;
  city_id: mongoose.Types.ObjectId;
  canton_id: mongoose.Types.ObjectId;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  location_precision?: PropertyLocationPrecision;
  geocoding_source?: PropertyGeocodingSource;
  geocoded_at?: Date;

  proximity?: Record<string, string>;

  amenities: mongoose.Types.ObjectId[];

  status: PropertyStatus;

  reviewed_by?: mongoose.Types.ObjectId;
  reviewed_at?: Date;
  rejection_reason?: string;

  published_at?: Date;

  created_at: Date;
  updated_at: Date;
}

/**
 * Property Schema
 */
const propertySchema = new Schema<IProperty>(
  {
    external_id: {
      type: String,
      required: [true, 'External ID is required'],
      unique: true,
      trim: true,
    },
    external_url: {
      type: String,
      trim: true,
    },
    source_language: {
      type: String,
      required: [true, 'Source language is required'],
      enum: {
        values: ['en', 'fr', 'de', 'it'],
        message: 'Source language must be one of: en, fr, de, it',
      },
      default: 'en',
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
      index: true,
    },
    agency_id: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      index: true,
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    transaction_type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['rent', 'buy'],
        message: 'Transaction type must be one of: rent, buy',
      },
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      enum: ['CHF'],
      default: 'CHF',
    },
    additional_costs: {
      type: Number,
      min: [0, 'Additional costs cannot be negative'],
    },
    rooms: {
      type: Number,
      min: [0, 'Rooms cannot be negative'],
    },
    surface: {
      type: Number,
      min: [0, 'Surface cannot be negative'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
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
    location_precision: {
      type: String,
      enum: {
        values: ['exact', 'postal_code', 'city', 'canton', 'unknown'],
        message: 'Location precision must be one of: exact, postal_code, city, canton, unknown',
      },
    },
    geocoding_source: {
      type: String,
      enum: {
        values: ['manual', 'provider', 'city_centroid', 'canton_centroid'],
        message:
          'Geocoding source must be one of: manual, provider, city_centroid, canton_centroid',
      },
    },
    geocoded_at: {
      type: Date,
    },
    proximity: {
      type: Map,
      of: String,
    },
    amenities: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Amenity',
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'],
        message:
          'Status must be one of: DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PUBLISHED, ARCHIVED',
      },
      default: 'DRAFT',
      index: true,
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewed_at: {
      type: Date,
    },
    rejection_reason: {
      type: String,
      trim: true,
    },
    published_at: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'properties',
  }
);

// Compound indexes for search and filtering
propertySchema.index({ status: 1, published_at: -1 });
propertySchema.index({ canton_id: 1, city_id: 1, status: 1 });
propertySchema.index({ transaction_type: 1, category_id: 1, status: 1 });
propertySchema.index({ price: 1, status: 1 });
propertySchema.index({ rooms: 1, surface: 1 });
propertySchema.index({ agency_id: 1, status: 1 });

// Cursor-based pagination index (published_at + _id)
propertySchema.index({ published_at: -1, _id: -1 });

export const Property = mongoose.model<IProperty>('Property', propertySchema);
