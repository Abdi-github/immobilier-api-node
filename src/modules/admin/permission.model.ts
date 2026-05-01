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

type LegacyPermissionInput = Partial<IPermission> & {
  code?: string;
  module?: string;
  display_name?: IMultilingualText | string;
  description?: IMultilingualText | string;
};

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

const humanizePermissionName = (value: string): string => {
  return value
    .split(':')
    .join(' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const normalizePermissionInput = (permission: LegacyPermissionInput): void => {
  const legacyCode = typeof permission.code === 'string' ? permission.code.toLowerCase() : undefined;
  const currentName = typeof permission.name === 'string' ? permission.name.trim() : '';
  const normalizedName = legacyCode ?? currentName.toLowerCase();

  if (normalizedName) {
    permission.name = normalizedName;
  }

  const derivedResource = normalizedName.split(':')[0] || permission.module || permission.resource;
  const derivedAction = normalizedName.split(':')[1] || permission.action;

  permission.resource = derivedResource;
  permission.action = derivedAction;

  const legacyDisplayName =
    permission.display_name ??
    (legacyCode && currentName && currentName.toLowerCase() !== legacyCode ? currentName : undefined) ??
    humanizePermissionName(normalizedName);

  permission.display_name = isMultilingualText(legacyDisplayName)
    ? legacyDisplayName
    : toMultilingualText(String(legacyDisplayName));

  permission.description = isMultilingualText(permission.description)
    ? permission.description
    : toMultilingualText(String(permission.description ?? humanizePermissionName(normalizedName)));
};

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

permissionSchema.path('display_name').set((value: IMultilingualText | string) => {
  return isMultilingualText(value) ? value : toMultilingualText(String(value));
});

permissionSchema.path('description').set((value: IMultilingualText | string) => {
  return isMultilingualText(value) ? value : toMultilingualText(String(value));
});

permissionSchema.virtual('code')
  .get(function (this: IPermission) {
    return this.name;
  })
  .set(function (this: IPermission & { display_name?: IMultilingualText }, value: string) {
    const currentName = this.name?.trim();
    if (!this.display_name && currentName && currentName.toLowerCase() !== value.toLowerCase()) {
      this.display_name = toMultilingualText(currentName);
    }
    this.name = value;
  });

permissionSchema.virtual('module')
  .get(function (this: IPermission) {
    return this.resource;
  })
  .set(function (this: IPermission, value: string) {
    this.resource = value;
  });

permissionSchema.pre('validate', function (next) {
  normalizePermissionInput(this as LegacyPermissionInput);
  next();
});

permissionSchema.pre('insertMany', function (next, docs: LegacyPermissionInput[]) {
  docs.forEach((doc) => normalizePermissionInput(doc));
  next();
});

// Indexes
permissionSchema.index({ name: 1 });
permissionSchema.index({ resource: 1, action: 1 });
permissionSchema.index({ is_active: 1 });

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);
