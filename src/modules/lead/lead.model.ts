import mongoose, { Schema, Document } from 'mongoose';
import {
  LeadStatus,
  LeadSource,
  LeadInquiryType,
  LeadPriority,
  SupportedLanguage,
  LEAD_STATUS,
  LEAD_SOURCE,
  LEAD_INQUIRY_TYPE,
  LEAD_PRIORITY,
} from './lead.types.js';

/**
 * Lead note subdocument interface
 */
export interface ILeadNote {
  _id: mongoose.Types.ObjectId;
  content: string;
  is_internal: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
}

/**
 * Lead document interface
 */
export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  property_id: mongoose.Types.ObjectId;
  agency_id?: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;

  // Contact information
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone?: string;
  preferred_contact_method: 'email' | 'phone' | 'both';
  preferred_language: SupportedLanguage;

  // Inquiry details
  inquiry_type: LeadInquiryType;
  message: string;

  // Lead management
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;

  assigned_to?: mongoose.Types.ObjectId;
  viewing_scheduled_at?: Date;
  follow_up_date?: Date;

  // Notes/history
  notes: ILeadNote[];

  // Tracking
  first_response_at?: Date;
  closed_at?: Date;
  close_reason?: string;

  created_at: Date;
  updated_at: Date;
}

/**
 * Lead Note Schema
 */
const leadNoteSchema = new Schema<ILeadNote>(
  {
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      maxlength: [5000, 'Note content cannot exceed 5000 characters'],
    },
    is_internal: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Note creator is required'],
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Lead Schema
 */
const leadSchema = new Schema<ILead>(
  {
    property_id: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
      index: true,
    },
    agency_id: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    contact_first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    contact_last_name: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    contact_email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    contact_phone: {
      type: String,
      trim: true,
    },
    preferred_contact_method: {
      type: String,
      enum: {
        values: ['email', 'phone', 'both'],
        message: 'Preferred contact method must be: email, phone, or both',
      },
      default: 'email',
    },
    preferred_language: {
      type: String,
      enum: {
        values: ['en', 'fr', 'de', 'it'],
        message: 'Preferred language must be one of: en, fr, de, it',
      },
      default: 'en',
    },
    inquiry_type: {
      type: String,
      required: [true, 'Inquiry type is required'],
      enum: {
        values: LEAD_INQUIRY_TYPE,
        message: `Inquiry type must be one of: ${LEAD_INQUIRY_TYPE.join(', ')}`,
      },
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: LEAD_STATUS,
        message: `Status must be one of: ${LEAD_STATUS.join(', ')}`,
      },
      default: 'NEW',
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: LEAD_PRIORITY,
        message: `Priority must be one of: ${LEAD_PRIORITY.join(', ')}`,
      },
      default: 'medium',
      index: true,
    },
    source: {
      type: String,
      enum: {
        values: LEAD_SOURCE,
        message: `Source must be one of: ${LEAD_SOURCE.join(', ')}`,
      },
      default: 'website',
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    viewing_scheduled_at: {
      type: Date,
    },
    follow_up_date: {
      type: Date,
      index: true,
    },
    notes: [leadNoteSchema],
    first_response_at: {
      type: Date,
    },
    closed_at: {
      type: Date,
    },
    close_reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Close reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'leads',
  }
);

// Indexes for common queries
leadSchema.index({ agency_id: 1, status: 1, created_at: -1 });
leadSchema.index({ assigned_to: 1, status: 1, created_at: -1 });
leadSchema.index({ property_id: 1, created_at: -1 });
leadSchema.index({ contact_email: 1, created_at: -1 });
leadSchema.index({ status: 1, priority: 1, created_at: -1 });
leadSchema.index({ follow_up_date: 1, status: 1 });

/**
 * Lead Model
 */
export const Lead = mongoose.model<ILead>('Lead', leadSchema);
