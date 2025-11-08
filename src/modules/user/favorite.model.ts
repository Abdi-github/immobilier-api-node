import mongoose, { Schema, Document } from 'mongoose';

/**
 * Favorite document interface
 */
export interface IFavorite extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  property_id: mongoose.Types.ObjectId;
  created_at: Date;
}

/**
 * Favorite Schema
 */
const favoriteSchema = new Schema<IFavorite>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    property_id: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
    collection: 'favorites',
  }
);

// Compound unique index - user can only favorite a property once
favoriteSchema.index({ user_id: 1, property_id: 1 }, { unique: true });

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);
