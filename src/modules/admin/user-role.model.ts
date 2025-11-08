import mongoose, { Schema, Document } from 'mongoose';

/**
 * User Role document interface (join table)
 */
export interface IUserRole extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role_id: mongoose.Types.ObjectId;
  assigned_by?: mongoose.Types.ObjectId;
  assigned_at: Date;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * User Role Schema
 */
const userRoleSchema = new Schema<IUserRole>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role_id: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
      index: true,
    },
    assigned_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
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
    collection: 'user_roles',
  }
);

// Compound unique index for user + role
userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

// Index for querying active roles
userRoleSchema.index({ user_id: 1, is_active: 1 });

export const UserRole = mongoose.model<IUserRole>('UserRole', userRoleSchema);
