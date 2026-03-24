import express from "express";
import { getLogs } from "../controllers/adminLogController.js";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Only admins can access logs
router.get(
  "/",
  verifyToken,
  authorizeRoles("college_admin", "super_admin"),
  getLogs
);

export default router;