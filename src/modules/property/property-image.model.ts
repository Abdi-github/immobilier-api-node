import mongoose, { Schema, Document } from 'mongoose';

/**
 * Image source type
 */
export type ImageSource = 'cloudinary' | 'external' | 'local';

/**
 * Property Image document interface
 */
export interface IPropertyImage extends Document {
  _id: mongoose.Types.ObjectId;
  property_id: mongoose.Types.ObjectId;

  // Cloudinary specific fields
  public_id?: string;
  version?: number;
  signature?: string;

  // Image URLs
  url: string;
  secure_url?: string;
  thumbnail_url?: string;
  thumbnail_secure_url?: string;

  // Image metadata
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resource_type?: string;

  // Display properties
  alt_text?: string;
  caption?: string;
  sort_order: number;
  is_primary: boolean;

  // Source tracking
  source: ImageSource;
  original_filename?: string;
  external_url?: string;

  // Migration tracking
  original_url?: string;
  migrated_at?: Date;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Property Image Schema
 */
const propertyImageSchema = new Schema<IPropertyImage>(
  {
    property_id: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
      index: true,
    },

    // Cloudinary specific fields
    public_id: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    version: {
      type: Number,
    },
    signature: {
      type: String,
      trim: true,
    },

    // Image URLs
    url: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    secure_url: {
      type: String,
      trim: true,
    },
    thumbnail_url: {
      type: String,
      trim: true,
    },
    thumbnail_secure_url: {
      type: String,
      trim: true,
    },

    // Image metadata
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    format: {
      type: String,
      trim: true,
    },
    bytes: {
      type: Number,
    },
    resource_type: {
      type: String,
      trim: true,
      default: 'image',
    },

    // Display properties
    alt_text: {
      type: String,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    is_primary: {
      type: Boolean,
      default: false,
    },

    // Source tracking
    source: {
      type: String,
      enum: ['cloudinary', 'external', 'local'],
      default: 'cloudinary',
    },
    original_filename: {
      type: String,
      trim: true,
    },
    external_url: {
      type: String,
      trim: true,
    },
    // Migration tracking
    original_url: {
      type: String,
      trim: true,
    },
    migrated_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'property_images',
  }
);

// Indexes
propertyImageSchema.index({ property_id: 1, sort_order: 1 });
propertyImageSchema.index({ property_id: 1, is_primary: 1 });
propertyImageSchema.index({ public_id: 1 }, { sparse: true });
propertyImageSchema.index({ source: 1 });

// Compound index for efficient queries
propertyImageSchema.index({ property_id: 1, is_primary: -1, sort_order: 1 });

export const PropertyImage = mongoose.model<IPropertyImage>('PropertyImage', propertyImageSchema);
