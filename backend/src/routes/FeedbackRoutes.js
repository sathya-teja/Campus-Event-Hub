import express from "express";
const router = express.Router();

// Controllers
import {
  submitFeedback,
  getEventFeedback,
  updateFeedback,
  deleteFeedback,
  getMyFeedback,
  getAdminAnalytics,
  getEventAnalytics,
} from "../controllers/feedbackController.js";

// Middleware
import {
  verifyToken,
  authorizeRoles,
} from "../middleware/authmiddleware.js";


// ==============================================
// STUDENT ROUTES
// ==============================================

// @route   POST /api/feedback
// @desc    Submit feedback for an attended, completed event
// @access  Private — student only
router.post(
  "/",
  verifyToken,
  authorizeRoles("student"),
  submitFeedback
);

// @route   GET /api/feedback/my
// @desc    Get the logged-in student's own feedback history
// @access  Private — student only
// NOTE: must be defined before /:id to avoid route conflict
router.get(
  "/my",
  verifyToken,
  authorizeRoles("student"),
  getMyFeedback
);

// @route   PUT /api/feedback/:id
// @desc    Edit own feedback (within 24 hours)
// @access  Private — student only
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("student"),
  updateFeedback
);

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (student deletes own | admin deletes any)
// @access  Private — student or college_admin (role check inside controller)
router.delete(
  "/:id",
  verifyToken,
  deleteFeedback
);


// ==============================================
// COLLEGE ADMIN ROUTES
// ==============================================

// @route   GET /api/feedback/analytics
// @desc    Overall feedback analytics across all events
// @access  Private — college_admin only
// NOTE: must be defined before /analytics/:eventId
router.get(
  "/analytics",
  verifyToken,
  authorizeRoles("college_admin"),
  getAdminAnalytics
);

// @route   GET /api/feedback/analytics/:eventId
// @desc    Detailed feedback analytics for a specific event
// @access  Private — college_admin only
router.get(
  "/analytics/:eventId",
  verifyToken,
  authorizeRoles("college_admin"),
  getEventAnalytics
);

// @route   GET /api/feedback/event/:id
// @desc    Get all feedback for an event (with pagination, filter, sort)
// @access  Private — college_admin only
router.get(
  "/event/:id",
  verifyToken,
  authorizeRoles("college_admin"),
  getEventFeedback
);


export default router;