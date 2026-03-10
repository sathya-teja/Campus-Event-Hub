import { useState } from "react";
import { FiBell } from "react-icons/fi";
import { useNotifications } from "../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";

/*
========================================
🔔 NOTIFICATION BELL
Drop this into Navbar next to the user avatar.

Usage in Navbar.jsx — add these two lines:
  1. import NotificationBell from "./NotificationBell";
  2. <NotificationBell user={user} />  ← place next to avatar button
========================================
*/
export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteOne,
  } = useNotifications(user);

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative p-2 rounded-full border transition-all duration-150 ${
          open
            ? "bg-blue-50 border-blue-200"
            : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
        }`}
        aria-label="Notifications"
      >
        <FiBell
          size={18}
          className={open ? "text-blue-600" : "text-gray-600"}
        />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDelete={deleteOne}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
