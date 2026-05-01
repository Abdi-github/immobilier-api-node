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

const isMultilingualText = (value: unknown): value is IMultilingualText => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'en' in value &&
    'fr' in value &&
    'de' in value &&
    'it' in value
  );
};

const toMultilingualText = (value: string): IMultilingualText => ({
  en: value,
  fr: value,
  de: value,
  it: value,
});

const normalizeRoleName = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
};

const humanizeRoleName = (value: string): string => {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

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

roleSchema.path('display_name').set((value: IMultilingualText | string) => {
  return isMultilingualText(value) ? value : toMultilingualText(String(value));
});

roleSchema.path('description').set((value: IMultilingualText | string) => {
  return isMultilingualText(value) ? value : toMultilingualText(String(value));
});

roleSchema.virtual('code')
  .get(function (this: IRole) {
    return this.name;
  })
  .set(function (this: IRole & { display_name?: IMultilingualText }, value: string) {
    const currentName = this.name?.trim();
    if (!this.display_name && currentName && currentName !== value) {
      this.display_name = toMultilingualText(currentName);
    }
    this.name = value;
  });

roleSchema.pre('validate', function (next) {
  const currentName = this.name?.trim();

  if (currentName) {
    const normalizedName = normalizeRoleName(currentName);
    if (!this.display_name && normalizedName !== currentName) {
      this.display_name = toMultilingualText(currentName);
    }
    this.name = normalizedName;
  }

  if (!this.display_name && this.name) {
    this.display_name = toMultilingualText(humanizeRoleName(this.name));
  }

  if (!this.description && this.name) {
    this.description = toMultilingualText(humanizeRoleName(this.name));
  }

  next();
});

// Indexes
roleSchema.index({ name: 1 });
roleSchema.index({ is_active: 1 });
roleSchema.index({ is_system: 1 });

export const Role = mongoose.model<IRole>('Role', roleSchema);
