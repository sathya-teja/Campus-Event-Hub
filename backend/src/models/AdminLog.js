import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminRole: {
      type: String,
      enum: ["college_admin", "super_admin"],
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetEntityType: {
      type: String,
      enum: ["Event", "User", "Registration", "Discussion"],
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast filtering
adminLogSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.model("AdminLog", adminLogSchema);