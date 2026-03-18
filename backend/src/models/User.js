// src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    // ✅ CHANGED: password is optional for OAuth users (Google etc.)
    //    All existing password logic below is untouched.
    password: {
      type: String,
      required: false,       // was: required: [true, "Password is required"]
      select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    role: {
      type: String,
      enum: ["student", "college_admin", "super_admin"],
      default: "student",
      index: true,
    },
    college: {
      type: String,
      required: function () {
        return this.role === "college_admin";
      },
    },

    // ✅ Added phone field
    phone: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    // 🔐 Approval system
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: function () {
        if (this.role === "student") return "approved";
        if (this.role === "college_admin") return "pending";
        return "approved";
      },
      index: true,
    },

    // ✅ NEW: OAuth provider IDs — add one field per provider
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    // Future GitHub:   githubId: { type: String, default: null, index: true },
    // Future Microsoft: microsoftId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// ── Existing pre-save hook — UNTOUCHED ───────────────────────────────────────
// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  // ✅ Skip if no password (OAuth users)
  if (!this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Existing method — UNTOUCHED ──────────────────────────────────────────────
// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;