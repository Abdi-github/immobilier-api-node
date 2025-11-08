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
 * Role document interface
 */
export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  name: string; // e.g., "super_admin"
  display_name: IMultilingualText;
  description: IMultilingualText;
  permissions: mongoose.Types.ObjectId[];
  is_system: boolean;
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
 * Role Schema
 */
const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
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
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
    is_system: {
      type: Boolean,
      default: false,
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
    collection: 'roles',
  }
);

// Indexes
roleSchema.index({ name: 1 });
roleSchema.index({ is_active: 1 });
roleSchema.index({ is_system: 1 });

export const Role = mongoose.model<IRole>('Role', roleSchema);
