import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheck, FiTrash2, FiX } from "react-icons/fi";

/*
========================================
🔔 NOTIFICATION DROPDOWN
Shows list of notifications with:
  - Unread badge
  - Mark as read on click
  - Delete individual
  - Mark all as read
========================================
*/

const typeIcon = {
  admin_approved:   "✅",
  admin_rejected:   "❌",
  event_created:    "🎉",
  event_updated:    "✏️",
  event_deleted:    "🗑️",
  event_registered: "📋",
  general:          "🔔",
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClose,
}) {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleClick = (notification) => {
    if (!notification.isRead) {
      onMarkRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-2">
          <FiBell size={16} className="text-blue-600" />
          <span className="font-semibold text-gray-800 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              <FiCheck size={12} /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FiBell size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer group ${
                !n.isRead ? "bg-blue-50/50" : ""
              }`}
            >
              {/* Icon */}
              <span className="text-xl flex-shrink-0 mt-0.5">
                {typeIcon[n.type] || "🔔"}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
              </div>

              {/* Unread dot + delete */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(n._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2 text-center">
          <p className="text-xs text-gray-400">{notifications.length} total notifications</p>
        </div>
      )}
    </div>
  );
}
