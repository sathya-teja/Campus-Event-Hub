import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { addClient, removeClient, sendToUser } from "../services/sseManager.js";

/*
========================================
📡 SSE CONNECTION
GET /api/notifications/sse
User connects here to receive real-time
notifications via Server-Sent Events.
========================================
*/
export const sseConnect = async (req, res) => {
  const userId = req.user._id;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // important for nginx
  res.flushHeaders();

  // Send initial ping so client knows connection is alive
  res.write(`data: ${JSON.stringify({ type: "connected", message: "SSE connected" })}\n\n`);

  // Register this client
  addClient(userId, res);

  // Heartbeat every 30s to prevent connection timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
};

/*
========================================
🔔 GET NOTIFICATIONS
GET /api/notifications
Returns the logged-in user's notifications
(most recent 50, unread first).
========================================
*/
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/*
========================================
✅ MARK ONE AS READ
PUT /api/notifications/:id/read
========================================
*/
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

/*
========================================
✅ MARK ALL AS READ
PUT /api/notifications/read-all
========================================
*/
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
};

/*
========================================
🗑️ DELETE A NOTIFICATION
DELETE /api/notifications/:id
========================================
*/
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

/*
========================================
🔧 INTERNAL HELPER
createAndSendNotification({ userId, title, message, type, link })

Call this from any controller to:
  1. Save notification to DB
  2. Push via SSE (real-time if user is online)
  3. Send browser push (if user subscribed)

NOT a route handler — import and call internally.
========================================
*/
export const createAndSendNotification = async ({
  userId,
  title,
  message,
  type = "general",
  link = "",
}) => {
  try {
    // 1. Save to DB
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
    });

    // 2. Push via SSE (real-time)
    sendToUser(userId, {
      type: "notification",
      notification,
    });

    return notification;
  } catch (error) {
    console.error("❌ createAndSendNotification error:", error.message);
  }
};