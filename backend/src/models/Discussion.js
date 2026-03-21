import mongoose from "mongoose";

/*
========================================
💬 REPLY SUBDOCUMENT
Embedded inside each Discussion document.
Replies are NOT a separate collection —
they live inside the parent message for
atomic reads and simpler queries.
========================================
*/
const replySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [1,   "Reply cannot be empty"],
      maxlength: [1000, "Reply cannot exceed 1000 characters"],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/*
========================================
💬 DISCUSSION SCHEMA
One document = one top-level message
on an event's discussion board.
========================================
*/
const discussionSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,          // fast lookup by event
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: [true, "Message cannot be empty"],
      trim: true,
      minlength: [1,    "Message cannot be empty"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    // Embedded replies array — max 100 replies per message
    // prevents unbounded document growth
    replies: {
      type: [replySchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 100,
        message: "A message cannot have more than 100 replies",
      },
    },

    // Likes — array of userIds who liked this message.
    // Using an array (not a counter) lets us check if the
    // current user already liked without an extra query,
    // and prevents duplicate likes at the DB level.
    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    // Soft-delete flag — lets admins hide content without
    // losing the thread structure
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

/*
── Compound index: fetch all messages for an event sorted by
   creation time in a single efficient query.
*/
discussionSchema.index({ eventId: 1, createdAt: -1 });

/*
── Partial index: only index non-deleted documents so that
   the common query path (isDeleted: false) stays lean.
*/
discussionSchema.index(
  { eventId: 1, isDeleted: 1 },
  { partialFilterExpression: { isDeleted: false } }
);

export default mongoose.model("Discussion", discussionSchema);