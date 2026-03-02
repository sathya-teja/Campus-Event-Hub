import bcrypt from "bcryptjs";
import User from "../models/User.js";

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