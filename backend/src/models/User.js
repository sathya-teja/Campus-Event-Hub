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
    password: {
      type: String,
      required: [true, "Password is required"],
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
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;