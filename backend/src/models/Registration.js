import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── QR Attendance ──────────────────────────────────────────────
    // Opaque random token stored in DB; the actual QR payload is a
    // short-lived signed JWT generated on-demand (never stored).
    // qrToken is used as a secondary lookup key when verifying scans.
    qrToken: {
      type: String,
      default: null,
      index: true,        // fast lookup during scan verification
      sparse: true,       // null values are not indexed (saves space)
    },
    attendanceCode:       { type: String, default: null, index: true, sparse: true },
    attendanceCodeExpiry: { type: Date,   default: null },

    attended: {
      type: Boolean,
      default: false,
    },

    attendedAt: {
      type: Date,
      default: null,
    },
    // ───────────────────────────────────────────────────────────────
  },
  {
    timestamps: true,
  }
);

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;