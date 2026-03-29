// routes/healthRoutes.js
import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";
import { getHealthStatus, runHealthCheck } from "../controllers/healthController.js";

const router = express.Router();

// Platform health status - super admin only
router.get(
  "/status",
  verifyToken,
  authorizeRoles("super_admin"),
  getHealthStatus
);

// Run manual health check
router.post(
  "/check",
  verifyToken,
  authorizeRoles("super_admin"),
  runHealthCheck
);

export default router;