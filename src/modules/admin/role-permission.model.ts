import mongoose, { Schema, Document } from 'mongoose';

/**
 * Role Permission document interface (join table)
 */
export interface IRolePermission extends Document {
  _id: mongoose.Types.ObjectId;
  role_id: mongoose.Types.ObjectId;
  permission_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

/**
 * Role Permission Schema
 */
const rolePermissionSchema = new Schema<IRolePermission>(
  {
    role_id: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
      index: true,
    },
    permission_id: {
      type: Schema.Types.ObjectId,
      ref: 'Permission',
      required: [true, 'Permission ID is required'],
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'role_permissions',
  }
);

// Compound unique index for role + permission
rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

// Index for querying permissions by role
rolePermissionSchema.index({ role_id: 1 });

// Index for querying roles by permission
rolePermissionSchema.index({ permission_id: 1 });

export const RolePermission = mongoose.model<IRolePermission>(
  'RolePermission',
  rolePermissionSchema
);
