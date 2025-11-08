import bcrypt from 'bcryptjs';
import mongoose, { Schema, Document } from 'mongoose';

/**
 * User type enum values
 */
export const USER_TYPES = [
  'end_user',
  'owner',
  'agent',
  'agency_admin',
  'platform_admin',
  'super_admin',
] as const;

/**
 * User type
 */
export type UserType = (typeof USER_TYPES)[number];

/**
 * User status enum values
 */
export const USER_STATUSES = ['active', 'pending', 'suspended', 'inactive'] as const;

/**
 * User status
 */
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * User document interface
 */
/**
 * Notification preferences sub-document
 */
export interface INotificationPreferences {
  email_new_properties: boolean;
  email_price_changes: boolean;
  email_favorites_updates: boolean;
  email_newsletter: boolean;
  push_enabled: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  user_type: UserType;
  agency_id?: mongoose.Types.ObjectId;
  preferred_language: 'en' | 'fr' | 'de' | 'it';
  notification_preferences: INotificationPreferences;
  status: UserStatus;
  email_verified: boolean;
  email_verified_at?: Date;
  email_verification_token?: string;
  email_verification_expires?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_login_at?: Date;
  password_changed_at?: Date;
  refresh_token?: string;
  created_at: Date;
  updated_at: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  fullName(): string;
}

/**
 * User Schema
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password_hash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include in queries by default
    },
    first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    last_name: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar_url: {
      type: String,
      trim: true,
    },
    user_type: {
      type: String,
      required: [true, 'User type is required'],
      enum: {
        values: USER_TYPES,
        message:
          'User type must be one of: end_user, owner, agent, agency_admin, platform_admin, super_admin',
      },
      default: 'end_user',
      index: true,
    },
    agency_id: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      index: true,
    },
    preferred_language: {
      type: String,
      enum: ['en', 'fr', 'de', 'it'],
      default: 'en',
    },
    notification_preferences: {
      email_new_properties: { type: Boolean, default: true },
      email_price_changes: { type: Boolean, default: true },
      email_favorites_updates: { type: Boolean, default: true },
      email_newsletter: { type: Boolean, default: false },
      push_enabled: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: {
        values: USER_STATUSES,
        message: 'Status must be one of: active, pending, suspended, inactive',
      },
      default: 'pending',
      index: true,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    email_verified_at: {
      type: Date,
    },
    email_verification_token: {
      type: String,
      select: false,
    },
    email_verification_expires: {
      type: Date,
      select: false,
    },
    password_reset_token: {
      type: String,
      select: false,
    },
    password_reset_expires: {
      type: Date,
      select: false,
    },
    last_login_at: {
      type: Date,
    },
    password_changed_at: {
      type: Date,
    },
    refresh_token: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'users',
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ user_type: 1, status: 1 });
userSchema.index({ agency_id: 1, user_type: 1 });
userSchema.index({ first_name: 'text', last_name: 'text', email: 'text' });

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

/**
 * Get full name
 */
userSchema.methods.fullName = function (): string {
  return `${this.first_name} ${this.last_name}`;
};

/**
 * Pre-save hook to hash password if modified
 */
userSchema.pre('save', async function (next) {
  // Only hash if password_hash is modified and it's not already hashed
  if (!this.isModified('password_hash')) return next();

  // Check if it's already hashed (bcrypt hashes start with $2)
  if (this.password_hash.startsWith('$2')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    this.password_changed_at = new Date();
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = mongoose.model<IUser>('User', userSchema);
