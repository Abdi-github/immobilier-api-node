import mongoose, { Schema, Document } from 'mongoose';

import { AlertCriteria, AlertFrequency, ALERT_FREQUENCIES } from './user.types.js';

// Re-export types for convenience
export type { AlertCriteria, AlertFrequency };
export { ALERT_FREQUENCIES };

/**
 * Alert document interface
 */
export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  name: string;
  criteria: AlertCriteria;
  frequency: AlertFrequency;
  is_active: boolean;
  last_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Alert Criteria Schema
 */
const alertCriteriaSchema = new Schema<AlertCriteria>(
  {
    transaction_type: {
      type: String,
      enum: ['rent', 'buy'],
    },
    category_id: {
      type: String,
    },
    canton_id: {
      type: String,
    },
    city_id: {
      type: String,
    },
    price_min: {
      type: Number,
      min: 0,
    },
    price_max: {
      type: Number,
      min: 0,
    },
    rooms_min: {
      type: Number,
      min: 0,
    },
    rooms_max: {
      type: Number,
      min: 0,
    },
    surface_min: {
      type: Number,
      min: 0,
    },
    surface_max: {
      type: Number,
      min: 0,
    },
    amenities: [
      {
        type: String,
      },
    ],
  },
  { _id: false }
);

/**
 * Alert Schema
 */
const alertSchema = new Schema<IAlert>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Alert name is required'],
      trim: true,
      maxlength: [100, 'Alert name cannot exceed 100 characters'],
    },
    criteria: {
      type: alertCriteriaSchema,
      required: [true, 'Alert criteria is required'],
    },
    frequency: {
      type: String,
      enum: {
        values: ALERT_FREQUENCIES,
        message: 'Frequency must be one of: instant, daily, weekly',
      },
      default: 'daily',
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    last_sent_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'alerts',
  }
);

// Indexes
alertSchema.index({ user_id: 1, is_active: 1 });
alertSchema.index({ is_active: 1, frequency: 1 });

export const Alert = mongoose.model<IAlert>('Alert', alertSchema);
