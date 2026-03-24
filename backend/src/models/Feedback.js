import mongoose from "mongoose";

/*
========================================
⭐ FEEDBACK SCHEMA
One document = one attended student's
rating + written review for one event.

Rules enforced at schema level:
  - One feedback per student per event (unique index)
  - Rating is required (1–5)
  - Comment is optional but capped at 1000 chars
  - Only meaningful after the event ends
    (enforced in controller, not here)
========================================
*/
const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : "User",
      required: true,
      index   : true,
    },

    eventId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : "Event",
      required: true,
      index   : true,
    },

    // Star rating 1–5 (required)
    rating: {
      type    : Number,
      required: [true, "Rating is required"],
      min     : [1, "Rating must be at least 1"],
      max     : [5, "Rating cannot exceed 5"],
    },

    // Written review (optional)
    comment: {
      type     : String,
      trim     : true,
      default  : "",
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },

    // Track if the student edited their review
    isEdited: {
      type   : Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/*
── One feedback per student per event.
   Attempting a second insert throws a
   duplicate key error (code 11000).
*/
feedbackSchema.index({ userId: 1, eventId: 1 }, { unique: true });

/*
── Fast lookup for admin analytics:
   "get all feedback for this event"
*/
feedbackSchema.index({ eventId: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
