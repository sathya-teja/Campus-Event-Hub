import express from "express";
import { verifyToken } from "../middleware/authmiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  updateProfile,
  changePassword,
  deleteAccount,
  rejectAdmin
} from "../controllers/userController.js";

const router = express.Router();

router.put(
  "/update-profile",
  verifyToken,
  upload.single("profileImage"),
  updateProfile
);

router.put("/change-password", verifyToken, changePassword);

router.delete("/delete-account", verifyToken, deleteAccount);

// Reject admin route
router.put("/reject-admin/:id", rejectAdmin);

export default router;