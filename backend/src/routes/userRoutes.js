import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  updateProfile,
  changePassword,
  deleteAccount,
<<<<<<< HEAD
  rejectAdmin
=======
  rejectAdmin,
  getAllUsers
>>>>>>> 9a1cb6932463935cf9daf4e8aa5078cc540fb41d
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

<<<<<<< HEAD
// Reject admin route
router.put("/reject-admin/:id", rejectAdmin);
=======
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
>>>>>>> 9a1cb6932463935cf9daf4e8aa5078cc540fb41d

export default router;