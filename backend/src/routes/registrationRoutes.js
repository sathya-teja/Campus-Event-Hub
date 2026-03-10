import express from "express";
import {
  registerEvent,
  getUserRegistrations,
  getEventRegistrations,
  approveRegistration,
  rejectRegistration,
  cancelRegistration,
} from "../controllers/registrationController.js";

import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

/*
========================================
🎓 STUDENT ROUTES
========================================
*/

// Register for an event
router.post(
  "/",
  verifyToken,
  authorizeRoles("student"),
  registerEvent
);

// Get own registrations
router.get(
  "/my",
  verifyToken,
  authorizeRoles("student"),
  getUserRegistrations
);

// Cancel own registration
router.delete(
  "/cancel/:id",
  verifyToken,
  authorizeRoles("student"),
  cancelRegistration
);

/*
========================================
🏫 COLLEGE ADMIN ROUTES
========================================
*/

// Get all registrations for a specific event (admin's own events only)
router.get(
  "/event/:eventId",
  verifyToken,
  authorizeRoles("college_admin"),
  getEventRegistrations
);

// Approve a registration
router.put(
  "/approve/:id",
  verifyToken,
  authorizeRoles("college_admin"),
  approveRegistration
);

// Reject a registration
router.put(
  "/reject/:id",
  verifyToken,
  authorizeRoles("college_admin"),
  rejectRegistration
);

export default router;
