import mongoose from 'mongoose';

/**
 * NotificationPreference stores per-user channel preferences per notification type.
 *
 * DESIGN DECISION:
 * Instead of storing a giant object with 20 fields, we use a Map so that
 * adding a new notification type in the future requires ZERO schema changes.
 *
 * Example document:
 * {
 *   userId: ObjectId("..."),
 *   preferences: {
 *     "enrollment":    { inApp: true, email: true  },
 *     "payment":       { inApp: true, email: true  },
 *     "course_update": { inApp: true, email: false },
 *     "qa_reply":      { inApp: true, email: false },
 *     "promotion":     { inApp: false, email: false },
 *   }
 * }
 */

const channelSchema = new mongoose.Schema(
  {
    inApp: { type: Boolean, default: true  },
    email: { type: Boolean, default: true  },
  },
  { _id: false }
);

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true, // One preference document per user
      index: true,
    },
    // Using Map so we can add new types without schema migrations
    preferences: {
      type: Map,
      of: channelSchema,
      default: () => new Map([
        ['enrollment',    { inApp: true, email: true  }],
        ['payment',       { inApp: true, email: true  }],
        ['course_update', { inApp: true, email: false }],
        ['qa_reply',      { inApp: true, email: false }],
        ['promotion',     { inApp: false, email: false }],
      ]),
    },
  },
  { timestamps: true }
);

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);
export default NotificationPreference;
