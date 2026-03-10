import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
} from "../services/notificationService";
import { BASE_URL } from "../services/api";

/*
========================================
🔔 useNotifications Hook
Manages:
  - Fetching notifications from DB
  - SSE real-time connection
  - Browser push setup
  - Mark read / delete actions
========================================
*/
export const useNotifications = (user) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);

  // ── Fetch from DB ──────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("Failed to load notifications:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── SSE Connection ─────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // SSE doesn't support custom headers — pass token as query param
    const url = `${BASE_URL}/api/notifications/sse?token=${token}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("📡 SSE connected");
          return;
        }

        if (data.type === "notification" && data.notification) {
          setNotifications((prev) => [data.notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      console.warn("⚠️ SSE connection lost. Retrying in 5s...");
      es.close();
      setTimeout(() => connectSSE(), 5000);
    };

    eventSourceRef.current = es;
  }, [user]);

  // ── Mark Single as Read ────────────────────────────────────
  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error.message);
    }
  }, []);

  // ── Mark All as Read ───────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error.message);
    }
  }, []);

  // ── Delete Notification ────────────────────────────────────
  const deleteOne = useCallback(async (id) => {
    try {
      await deleteNotificationById(id);
      setNotifications((prev) => {
        const removed = prev.find((n) => n._id === id);
        if (removed && !removed.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== id);
      });
    } catch (error) {
      console.error("Failed to delete notification:", error.message);
    }
  }, []);

  // ── Lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      loadNotifications();
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user, loadNotifications, connectSSE]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    deleteOne,
    reload: loadNotifications,
  };
};