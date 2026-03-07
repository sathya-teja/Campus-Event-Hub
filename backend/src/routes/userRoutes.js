import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  updateProfile,
  changePassword,
  deleteAccount,
  rejectAdmin,
  getAllUsers
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

// Reject admin (only super admin)
router.put(
  "/reject-admin/:id",
  verifyToken,
  authorizeRoles("super_admin"),
  rejectAdmin
);
router.get(
  "/all-users",
  verifyToken,
  authorizeRoles("super_admin"),
  getAllUsers
);

export default router;