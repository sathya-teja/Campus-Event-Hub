import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendEmail, emailTemplates } from "../services/emailService.js";           // 🔔 NEW
import { createAndSendNotification } from "./notificationController.js";           // 🔔 NEW
import { logAdminAction } from "../services/loggerService.js";

/*
========================================
✏ UPDATE PROFILE
========================================
*/
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update only provided fields
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.college !== undefined) user.college = req.body.college;
    if (req.body.phone !== undefined) user.phone = req.body.phone;

    // If new profile image uploaded
    if (req.file) {
      user.profileImage = req.file.filename;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/*
========================================
🔐 CHANGE PASSWORD
========================================
*/
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Mongoose pre-save hook will hash it
    user.password = newPassword;

    await user.save();

    res.status(200).json({ message: "Password updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/*
========================================
🗑 DELETE ACCOUNT
========================================
*/
export const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);

    res.status(200).json({
      message: "Account deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

export const rejectAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    const admin = await User.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.status = "rejected";
    await admin.save();

    // Log the rejection action
    logAdminAction(
  req.user,
  "COLLEGE_ADMIN_REJECTED",
  admin._id,
  "User",
  { email: admin.email }
);

    res.status(200).json({ message: "Admin rejected successfully" });

    // 🔔 NEW — send in-app + email + browser push (non-blocking, after response sent)
    try {
      await createAndSendNotification({
        userId: admin._id,
        title: "Account Rejected ❌",
        message: "Your college admin account request has been rejected. Please contact support.",
        type: "admin_rejected",
        link: "/",
      });
      const template = emailTemplates.adminRejected(admin.name);
      await sendEmail({ to: admin.email, ...template });
    } catch (notifError) {
      console.error("⚠️ Notification error (non-blocking):", notifError.message);
    }

  } catch (error) {
    res.status(500).json({ message: "Error rejecting admin" });
  }
};

/*
========================================
👥 GET ALL USERS (Super Admin)
========================================
*/
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    const filter = {};

    // Filter by role if provided
    if (role && ["student", "college_admin", "super_admin"].includes(role)) {
      filter.role = role;
    }

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("name email role college status createdAt profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(users);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};