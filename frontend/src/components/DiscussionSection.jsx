import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../services/api";
import {
  FiMessageSquare,
  FiSend,
  FiCornerDownRight,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiHeart,
  FiSmile,
} from "react-icons/fi";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────────
   EMOJI PICKER DATA
───────────────────────────────────────────── */
const EMOJI_GROUPS = [
  {
    label: "Reactions",
    emojis: ["👍","👎","❤️","🔥","🎉","😂","😮","😢","😡","🙌","💯","⭐"],
  },
  {
    label: "Faces",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😊","😇","🥰","😍","🤩","😘","🙂","🤗","🤔","😐","😑","😏","😒","🙄","😬","😌","😔","😪","😴","😷","🤒","🤕","🤧"],
  },
  {
    label: "Gestures",
    emojis: ["👋","🤚","✋","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🙏"],
  },
  {
    label: "Objects",
    emojis: ["💻","📱","🖥","⌨️","📷","📸","📹","🎥","📞","☎️","📺","📻","⏰","⌚","🔋","🔌","🎮","🕹","📚","📖","📝","✏️","🖊","🖋","📌","📎","🔗"],
  },
  {
    label: "Symbols",
    emojis: ["✅","❌","⚠️","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","❓","❗","💬","💭","🔔","🎵","🎶","🔊","📢","🔇","🔎","🔍","💡","🔑","🏆","🥇","🎯"],
  },
];

/* ─────────────────────────────────────────────
   API HELPERS
───────────────────────────────────────────── */
const authHeader = () => ({
  "Content-Type": "application/json",
  Authorization : `Bearer ${localStorage.getItem("token")}`,
});

const discussionAPI = {
  getMessages : (eventId, page = 1) =>
    fetch(`${BASE_URL}/api/discussions/event/${eventId}?page=${page}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).then((r) => r.json()),

  postMessage : (eventId, message) =>
    fetch(`${BASE_URL}/api/discussions`, {
      method : "POST",
      headers: authHeader(),
      body   : JSON.stringify({ eventId, message }),
    }).then((r) => r.json()),

  editMessage : (id, message) =>
    fetch(`${BASE_URL}/api/discussions/${id}`, {
      method : "PUT",
      headers: authHeader(),
      body   : JSON.stringify({ message }),
    }).then((r) => r.json()),

  deleteMessage : (id) =>
    fetch(`${BASE_URL}/api/discussions/${id}`, {
      method : "DELETE",
      headers: authHeader(),
    }).then((r) => r.json()),

  toggleLike : (id) =>
    fetch(`${BASE_URL}/api/discussions/${id}/like`, {
      method : "POST",
      headers: authHeader(),
    }).then((r) => r.json()),

  addReply : (id, message) =>
    fetch(`${BASE_URL}/api/discussions/${id}/reply`, {
      method : "POST",
      headers: authHeader(),
      body   : JSON.stringify({ message }),
    }).then((r) => r.json()),

  editReply : (id, replyId, message) =>
    fetch(`${BASE_URL}/api/discussions/${id}/reply/${replyId}`, {
      method : "PUT",
      headers: authHeader(),
      body   : JSON.stringify({ message }),
    }).then((r) => r.json()),

  deleteReply : (id, replyId) =>
    fetch(`${BASE_URL}/api/discussions/${id}/reply/${replyId}`, {
      method : "DELETE",
      headers: authHeader(),
    }).then((r) => r.json()),
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ─────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────── */
function Avatar({ user, size = "w-8 h-8", textSize = "text-sm" }) {
  const [imgErr, setImgErr] = useState(false);
  const src =
    user?.profileImage && !imgErr
      ? user.profileImage.startsWith("http")
        ? user.profileImage
        : `${BASE_URL}/uploads/${user.profileImage}`
      : null;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const roleColor = {
    college_admin: "bg-amber-500",
    super_admin  : "bg-red-500",
    student      : "bg-blue-500",
  }[user?.role] || "bg-gray-400";

  return (
    <div className={`${size} rounded-full overflow-hidden flex-shrink-0`}>
      {src ? (
        <img src={src} alt={user?.name} className="w-full h-full object-cover"
          onError={() => setImgErr(true)} />
      ) : (
        <div className={`w-full h-full ${roleColor} flex items-center justify-center`}>
          <span className={`${textSize} font-bold text-white leading-none`}>{initials}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROLE BADGE
───────────────────────────────────────────── */
function RoleBadge({ role }) {
  if (!role || role === "student") return null;
  const cfg = {
    college_admin: { label: "Organizer", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    super_admin  : { label: "Admin",     cls: "bg-red-50 text-red-700 border-red-200" },
  }[role];
  if (!cfg) return null;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   EMOJI PICKER DROPDOWN
───────────────────────────────────────────── */
function EmojiPicker({ onSelect, onClose, openUp = false }) {
  const ref      = useRef(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute ${openUp ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl w-72 overflow-hidden`}
    >
      {/* Tab strip */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setTab(i)}
            className={`flex-shrink-0 px-3 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              tab === i
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
        {EMOJI_GROUPS[tab].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-gray-100 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDITABLE INPUT (edit mode for existing messages)
───────────────────────────────────────────── */
function EditableInput({ defaultValue, maxLength, onSave, onCancel, multiline = false }) {
  const [value,     setValue]     = useState(defaultValue);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = (e) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      if (value.trim()) onSave(value.trim());
    }
  };

  const insertEmoji = (emoji) => {
    const el    = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end   = el?.selectionEnd   ?? value.length;
    const next  = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    setTimeout(() => {
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
      el?.focus();
    }, 0);
  };

  const Tag = multiline ? "textarea" : "input";

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="relative">
        <Tag
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          maxLength={maxLength}
          rows={multiline ? 3 : undefined}
          className="w-full px-3 py-2 pr-9 text-sm border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400/30 resize-none bg-blue-50/40 text-gray-800"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmoji((p) => !p)}
            className="absolute right-2 bottom-2 text-gray-400 hover:text-blue-500 transition"
          >
            <FiSmile size={14} />
          </button>
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.13 }}
              >
                <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} openUp />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{value.length}/{maxLength}</span>
        <div className="flex gap-1.5">
          <button onClick={onCancel}
            className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition flex items-center gap-1">
            <FiX size={11} /> Cancel
          </button>
          <button
            onClick={() => value.trim() && onSave(value.trim())}
            disabled={!value.trim()}
            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-1">
            <FiCheck size={11} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MESSAGE INPUT BOX (new posts + replies)
───────────────────────────────────────────── */
function MessageInput({
  value, onChange, onSubmit, loading,
  placeholder, maxLength = 2000,
  multiline = true, rows = 2, autoFocus = false,
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 50);
  }, [autoFocus]);

  const insertEmoji = (emoji) => {
    const el    = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end   = el?.selectionEnd   ?? value.length;
    const next  = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
      el?.focus();
    }, 0);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !loading) onSubmit();
    }
  };

  const Tag = multiline ? "textarea" : "input";

  return (
    <div className="flex gap-2 items-end w-full">
      <div className="relative flex-1">
        <Tag
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={multiline ? rows : undefined}
          disabled={loading}
          className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 bg-white transition resize-none placeholder:text-gray-400"
        />
        {/* Emoji toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmoji((p) => !p)}
            className="absolute right-3 bottom-2.5 text-gray-400 hover:text-blue-500 transition"
            title="Insert emoji"
          >
            <FiSmile size={15} />
          </button>
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.13 }}
              >
                <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} openUp={!multiline} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={onSubmit}
        disabled={!value.trim() || loading}
        className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition flex-shrink-0 shadow-sm shadow-blue-200 disabled:shadow-none hover:scale-105 active:scale-95 disabled:scale-100"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <FiSend size={14} strokeWidth={2.5} />
        }
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIKE BUTTON — optimistic UI with heart animation
───────────────────────────────────────────── */
function LikeButton({ discussionId, initialLikes = [], currentUser }) {
  const resolveId = (uid) =>
    typeof uid === "string" ? uid : uid?._id?.toString?.() ?? uid?.toString?.() ?? "";

  const didLike = currentUser
    ? initialLikes.some((uid) => resolveId(uid) === currentUser._id)
    : false;

  const [liked,     setLiked]     = useState(didLike);
  const [likeCount, setLikeCount] = useState(initialLikes.length);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    setLiked(
      currentUser
        ? initialLikes.some((uid) => resolveId(uid) === currentUser._id)
        : false
    );
    setLikeCount(initialLikes.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLikes.length, currentUser]);

  const handleClick = async () => {
    if (!currentUser) { toast.error("Login to like messages"); return; }
    if (loading) return;

    // Optimistic
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));

    try {
      setLoading(true);
      const data = await discussionAPI.toggleLike(discussionId);
      if (typeof data.likeCount === "number") {
        setLikeCount(data.likeCount);
        setLiked(data.liked);
      } else {
        // Revert
        setLiked(!newLiked);
        setLikeCount((c) => newLiked ? Math.max(0, c - 1) : c + 1);
        toast.error(data.message || "Failed to update like");
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => newLiked ? Math.max(0, c - 1) : c + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1 text-xs font-medium transition-all disabled:opacity-50 ${
        liked ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-red-400"
      }`}
      title={liked ? "Unlike" : "Like"}
    >
      <motion.span
        animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <FiHeart
          size={13}
          className={liked ? "fill-red-500 stroke-red-500" : ""}
        />
      </motion.span>
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}

/* ─────────────────────────────────────────────
   REPLY CARD
───────────────────────────────────────────── */
function ReplyCard({ reply, discussionId, currentUser, isEventAdmin, onReplyUpdated, onReplyDeleted }) {
  const [editing,  setEditing]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUser && reply.userId?._id === currentUser._id;
  const canAct  = isOwner || isEventAdmin;

  const handleSaveEdit = async (message) => {
    try {
      const data = await discussionAPI.editReply(discussionId, reply._id, message);
      if (data.reply) { onReplyUpdated(data.reply); setEditing(false); }
      else toast.error(data.message || "Failed to update reply");
    } catch { toast.error("Failed to update reply"); }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const data = await discussionAPI.deleteReply(discussionId, reply._id);
      if (data.message === "Reply deleted successfully") onReplyDeleted(reply._id);
      else toast.error(data.message || "Failed to delete reply");
    } catch { toast.error("Failed to delete reply"); }
    finally { setDeleting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 group">
      <FiCornerDownRight size={13} className="text-gray-300 flex-shrink-0 mt-2" />
      <Avatar user={reply.userId} size="w-6 h-6" textSize="text-[10px]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-800">{reply.userId?.name || "Unknown"}</span>
          <RoleBadge role={reply.userId?.role} />
          <span className="text-[10px] text-gray-400">{timeAgo(reply.createdAt)}</span>
          {reply.isEdited && <span className="text-[10px] text-gray-400 italic">(edited)</span>}
        </div>

        {editing ? (
          <EditableInput
            defaultValue={reply.message}
            maxLength={1000}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed break-words">{reply.message}</p>
        )}

        {canAct && !editing && (
          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isOwner && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600 transition">
                <FiEdit2 size={10} /> Edit
              </button>
            )}
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition disabled:opacity-50">
              <FiTrash2 size={10} /> {deleting ? "..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MESSAGE CARD
───────────────────────────────────────────── */
function MessageCard({ discussion, currentUser, isEventAdmin, onUpdated, onDeleted }) {
  const [showReplies,   setShowReplies]   = useState(false);
  const [replies,       setReplies]       = useState(discussion.replies || []);
  const [replyInput,    setReplyInput]    = useState("");
  const [replyLoading,  setReplyLoading]  = useState(false);
  const [showReplyBox,  setShowReplyBox]  = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = currentUser && discussion.userId?._id === currentUser._id;
  const canAct  = isOwner || isEventAdmin;

  const handleSaveEdit = async (message) => {
    try {
      const data = await discussionAPI.editMessage(discussion._id, message);
      if (data.discussion) { onUpdated(data.discussion); setEditing(false); }
      else toast.error(data.message || "Failed to update message");
    } catch { toast.error("Failed to update message"); }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const data = await discussionAPI.deleteMessage(discussion._id);
      if (data.message === "Message deleted successfully") onDeleted(discussion._id);
      else toast.error(data.message || "Failed to delete message");
    } catch { toast.error("Failed to delete message"); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  const handleAddReply = async () => {
    if (!replyInput.trim()) return;
    try {
      setReplyLoading(true);
      const data = await discussionAPI.addReply(discussion._id, replyInput.trim());
      if (data.reply) {
        setReplies((prev) => [...prev, data.reply]);
        setReplyInput("");
        setShowReplies(true);
        setShowReplyBox(false);
        toast.success("Reply posted");
      } else {
        toast.error(data.message || "Failed to post reply");
      }
    } catch { toast.error("Failed to post reply"); }
    finally { setReplyLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 group"
    >
      <div className="flex items-start gap-3">
        <Avatar user={discussion.userId} size="w-9 h-9" textSize="text-sm" />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{discussion.userId?.name || "Unknown"}</span>
            <RoleBadge role={discussion.userId?.role} />
            {discussion.userId?.college && (
              <span className="text-[11px] text-gray-400 truncate">{discussion.userId.college}</span>
            )}
            <span className="text-[11px] text-gray-400 ml-auto">{timeAgo(discussion.createdAt)}</span>
            {discussion.isEdited && (
              <span className="text-[10px] text-gray-400 italic">(edited)</span>
            )}
          </div>

          {/* Message body */}
          {editing ? (
            <EditableInput
              defaultValue={discussion.message}
              maxLength={2000}
              multiline
              onSave={handleSaveEdit}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
              {discussion.message}
            </p>
          )}

          {/* Actions row */}
          {!editing && (
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">

              {/* Like */}
              <LikeButton
                discussionId={discussion._id}
                initialLikes={discussion.likes || []}
                currentUser={currentUser}
              />

              {/* Reply toggle */}
              {currentUser && (
                <button
                  onClick={() => setShowReplyBox((p) => !p)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition font-medium"
                >
                  <FiCornerDownRight size={12} />
                  Reply
                </button>
              )}

              {/* Show replies */}
              {replies.length > 0 && (
                <button
                  onClick={() => setShowReplies((p) => !p)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition font-medium"
                >
                  {showReplies ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                  {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </button>
              )}

              {/* Edit / Delete — shown on hover */}
              {canAct && (
                <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {isOwner && !confirmDelete && (
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600 transition">
                      <FiEdit2 size={10} /> Edit
                    </button>
                  )}
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition"
                    >
                      <FiTrash2 size={10} /> Delete
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500">Delete?</span>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition disabled:opacity-50"
                      >
                        {deleting ? "Deleting..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-[11px] text-gray-400 hover:text-gray-600 transition"
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reply input */}
          <AnimatePresence>
            {showReplyBox && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex gap-2 items-start overflow-hidden"
              >
                <Avatar user={currentUser} size="w-6 h-6" textSize="text-[10px]" />
                <div className="flex-1">
                  <MessageInput
                    value={replyInput}
                    onChange={setReplyInput}
                    onSubmit={handleAddReply}
                    loading={replyLoading}
                    placeholder="Write a reply..."
                    maxLength={1000}
                    multiline={false}
                    autoFocus
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies list */}
          <AnimatePresence>
            {showReplies && replies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3 pl-1 border-l-2 border-gray-100 ml-1 overflow-hidden"
              >
                {replies.map((reply) => (
                  <ReplyCard
                    key={reply._id}
                    reply={reply}
                    discussionId={discussion._id}
                    currentUser={currentUser}
                    isEventAdmin={isEventAdmin}
                    onReplyUpdated={(updated) =>
                      setReplies((prev) => prev.map((r) => r._id === updated._id ? updated : r))
                    }
                    onReplyDeleted={(rid) =>
                      setReplies((prev) => prev.filter((r) => r._id !== rid))
                    }
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function DiscussionSection({ eventId, eventAdminId }) {
  const { user } = useAuth();

  const [discussions, setDiscussions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [pagination,  setPagination]  = useState({ page: 1, hasMore: false, total: 0 });
  const [newMessage,  setNewMessage]  = useState("");
  const [posting,     setPosting]     = useState(false);

  const isEventAdmin =
    user?.role === "college_admin" &&
    eventAdminId &&
    user._id === eventAdminId;

  const fetchMessages = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const data = await discussionAPI.getMessages(eventId, page);

      if (data.discussions) {
        setDiscussions((prev) =>
          append ? [...prev, ...data.discussions] : data.discussions
        );
        setPagination({
          page   : data.pagination.page,
          hasMore: data.pagination.hasMore,
          total  : data.pagination.total,
        });
      } else {
        setError(data.message || "Failed to load discussions");
      }
    } catch {
      setError("Failed to load discussions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [eventId]);

  useEffect(() => { fetchMessages(1); }, [fetchMessages]);

  const handlePost = async () => {
    if (!newMessage.trim() || posting) return;
    try {
      setPosting(true);
      const data = await discussionAPI.postMessage(eventId, newMessage.trim());
      if (data.discussion) {
        setDiscussions((prev) => [data.discussion, ...prev]);
        setPagination((p) => ({ ...p, total: p.total + 1 }));
        setNewMessage("");
        toast.success("Message posted");
      } else {
        toast.error(data.message || "Failed to post message");
      }
    } catch { toast.error("Failed to post message"); }
    finally  { setPosting(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <FiMessageSquare size={15} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Discussion</h2>
            {!loading && (
              <p className="text-xs text-gray-400">
                {pagination.total} {pagination.total === 1 ? "message" : "messages"}
              </p>
            )}
          </div>
        </div>
        {!user && (
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
            Login to participate
          </span>
        )}
      </div>

      {/* Post input */}
      {user && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-3 items-start">
            <Avatar user={user} size="w-9 h-9" textSize="text-sm" />
            <div className="flex-1">
              <MessageInput
                value={newMessage}
                onChange={setNewMessage}
                onSubmit={handlePost}
                loading={posting}
                placeholder="Ask a question or start a discussion..."
                maxLength={2000}
                rows={2}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Press Enter to post · Shift+Enter for new line · Use the smile icon to insert an emoji
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="divide-y divide-gray-50">

        {loading && (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <FiAlertCircle size={20} className="text-red-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Failed to load discussions</p>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button onClick={() => fetchMessages(1)}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition">
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && discussions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <FiMessageSquare size={24} className="text-blue-400" />
            </div>
            <p className="text-gray-700 font-semibold mb-1">No discussions yet</p>
            <p className="text-gray-400 text-sm">
              {user ? "Be the first to start a conversation!" : "Login to start the discussion."}
            </p>
          </div>
        )}

        {!loading && !error && discussions.length > 0 && (
          <div className="p-5 space-y-4">
            <AnimatePresence initial={false}>
              {discussions.map((d) => (
                <MessageCard
                  key={d._id}
                  discussion={d}
                  currentUser={user}
                  isEventAdmin={isEventAdmin}
                  onUpdated={(updated) =>
                    setDiscussions((prev) => prev.map((x) => x._id === updated._id ? updated : x))
                  }
                  onDeleted={(id) => {
                    setDiscussions((prev) => prev.filter((x) => x._id !== id));
                    setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
                    toast.success("Message deleted");
                  }}
                />
              ))}
            </AnimatePresence>

            {pagination.hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchMessages(pagination.page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {loadingMore
                    ? <><span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> Loading...</>
                    : "Load more messages"
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}