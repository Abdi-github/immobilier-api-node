import mongoose, { Schema, Document } from 'mongoose';

/**
 * Multilingual text interface
 */
export interface IMultilingualText {
  en: string;
  fr: string;
  de: string;
  it: string;
}

/**
 * Permission document interface
 */
export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  name: string; // e.g., "users:read"
  display_name: IMultilingualText;
  description: IMultilingualText;
  resource: string; // e.g., "users"
  action: string; // e.g., "read"
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Multilingual text schema
 */
const multilingualTextSchema = new Schema<IMultilingualText>(
  {
    en: { type: String, required: true, trim: true },
    fr: { type: String, required: true, trim: true },
    de: { type: String, required: true, trim: true },
    it: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/**
 * Permission Schema
 */
const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    display_name: {
      type: multilingualTextSchema,
      required: [true, 'Display name is required'],
    },
    description: {
      type: multilingualTextSchema,
      required: [true, 'Description is required'],
    },
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      lowercase: true,
      enum: [
        'create',
        'read',
        'update',
        'delete',
        'manage',
        'approve',
        'reject',
        'publish',
        'archive',
        '*', // Wildcard for super admin
      ],
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
    collection: 'permissions',
  }
);

// Indexes
permissionSchema.index({ name: 1 });
permissionSchema.index({ resource: 1, action: 1 });
permissionSchema.index({ is_active: 1 });

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);
