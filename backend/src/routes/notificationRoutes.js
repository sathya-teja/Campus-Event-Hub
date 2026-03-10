import express from "express";
import { verifyToken } from "../middleware/authmiddleware.js";
import {
  sseConnect,
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

/*
========================================
🔔 NOTIFICATION ROUTES
Base: /api/notifications
========================================
*/

// SSE connection — frontend connects here for real-time updates
router.get("/sse", verifyToken, sseConnect);

// Get all notifications + unread count
router.get("/", verifyToken, getNotifications);

// Mark all notifications as read
router.put("/read-all", verifyToken, markAllRead);

// Mark single notification as read
router.put("/:id/read", verifyToken, markAsRead);

// Delete a notification
router.delete("/:id", verifyToken, deleteNotification);

export default router;