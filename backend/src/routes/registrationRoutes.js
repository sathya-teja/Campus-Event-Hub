import express from "express";
import {
  registerEvent,
  getUserRegistrations,
  getEventRegistrations,
  getAllRegistrations,
  approveRegistration,
  rejectRegistration,
  cancelRegistration,
  getTotalRegistrations,
  exportRegistrationsCSV,
  exportRegistrationsExcel,
  exportRegistrationsPDF,
  exportRegistrationsJSON,
  exportAllRegistrationsCSV,
  exportAllRegistrationsExcel,
  exportAllRegistrationsPDF,
  exportAllRegistrationsJSON,
  getMyEventStudents,
  
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

// Get ALL registrations for all of admin's events — single efficient query
router.get(
  "/all",
  verifyToken,
  authorizeRoles("college_admin"),
  getAllRegistrations
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
// Get registration stats (public, for home page)
router.get("/stats/total", getTotalRegistrations);

// Get all unique students who registered for this admin's events
router.get(
  "/my-students",
  verifyToken,
  authorizeRoles("college_admin"),
  getMyEventStudents
);

/*
========================================
📊 EXPORT ALL EVENTS REGISTRATIONS
(must be defined BEFORE /export/:eventId/* to avoid "all" being captured as eventId)
========================================
*/
router.get(
  "/export-all/csv",
  verifyToken,
  authorizeRoles("college_admin"),
  exportAllRegistrationsCSV
);

router.get(
  "/export-all/excel",
  verifyToken,
  authorizeRoles("college_admin"),
  exportAllRegistrationsExcel
);

router.get(
  "/export-all/pdf",
  verifyToken,
  authorizeRoles("college_admin"),
  exportAllRegistrationsPDF
);

router.get(
  "/export-all/json",
  verifyToken,
  authorizeRoles("college_admin"),
  exportAllRegistrationsJSON
);

/*
========================================
📄 EXPORT SINGLE EVENT REGISTRATIONS
========================================
*/
router.get(
  "/export/:eventId/csv",
  verifyToken,
  authorizeRoles("college_admin"),
  exportRegistrationsCSV
);

router.get(
  "/export/:eventId/excel",
  verifyToken,
  authorizeRoles("college_admin"),
  exportRegistrationsExcel
);

router.get(
  "/export/:eventId/pdf",
  verifyToken,
  authorizeRoles("college_admin"),
  exportRegistrationsPDF
);

router.get(
  "/export/:eventId/json",
  verifyToken,
  authorizeRoles("college_admin"),
  exportRegistrationsJSON
);

export default router;