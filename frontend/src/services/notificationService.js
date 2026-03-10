import { BASE_URL } from "./api";

const getAuthHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/*
========================================
🔔 NOTIFICATION API CALLS
========================================
*/

// Fetch all notifications + unread count
export const fetchNotifications = async () => {
  const res = await fetch(`${BASE_URL}/api/notifications`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json(); // { notifications, unreadCount }
};

// Mark single notification as read
export const markNotificationRead = async (id) => {
  const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
    method: "PUT",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to mark as read");
  return res.json();
};

// Mark all notifications as read
export const markAllNotificationsRead = async () => {
  const res = await fetch(`${BASE_URL}/api/notifications/read-all`, {
    method: "PUT",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to mark all as read");
  return res.json();
};

// Delete a notification
export const deleteNotificationById = async (id) => {
  const res = await fetch(`${BASE_URL}/api/notifications/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Failed to delete notification");
  return res.json();
};