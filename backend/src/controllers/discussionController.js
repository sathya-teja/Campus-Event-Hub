import mongoose from "mongoose";
import Discussion from "../models/Discussion.js";
import Event      from "../models/Event.js";

/*
  ─────────────────────────────────────────────
  CONSTANTS
  ─────────────────────────────────────────────
*/
const MAX_MESSAGE_LENGTH = 2000;
const MAX_REPLY_LENGTH   = 1000;
const PAGE_SIZE          = 20;   // messages per page

/*
  ─────────────────────────────────────────────
  HELPERS
  ─────────────────────────────────────────────
*/

/** Sanitize a plain-text string — strip HTML tags and null bytes */
const sanitizeText = (str) =>
  str
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/\0/g, "")                 // strip null bytes
    .trim();

/** Validate a MongoDB ObjectId and return 400 if invalid */
const requireObjectId = (res, id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: `Invalid ${label}` });
    return false;
  }
  return true;
};

/*
========================================
📝 POST A MESSAGE
POST /api/discussions
Body: { eventId, message }
Auth: any logged-in user
========================================
*/
export const postMessage = async (req, res) => {
  try {
    const { eventId, message } = req.body;

    // ── Validate eventId ──────────────────────────────────────────
    if (!requireObjectId(res, eventId, "event ID")) return;

    // ── Validate message ──────────────────────────────────────────
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    const clean = sanitizeText(message);

    if (clean.length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (clean.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      });
    }

    // ── Verify event exists ───────────────────────────────────────
    const event = await Event.findById(eventId).select("_id title").lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // ── Persist ───────────────────────────────────────────────────
    const discussion = await Discussion.create({
      eventId,
      userId : req.user._id,
      message: clean,
    });

    // Populate author for immediate response — avoids extra round-trip
    await discussion.populate("userId", "name college profileImage role");

    return res.status(201).json({
      message   : "Message posted successfully",
      discussion,
    });

  } catch (error) {
    console.error("❌ postMessage error:", error.message);
    return res.status(500).json({ message: "Failed to post message" });
  }
};

/*
========================================
📋 GET MESSAGES FOR AN EVENT
GET /api/discussions/event/:eventId?page=1
Auth: optional (guests can read)
Pagination: cursor-based via ?page
========================================
*/
export const getEventDiscussions = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!requireObjectId(res, eventId, "event ID")) return;

    // Parse page — default 1, clamp to reasonable range
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const skip  = (page - 1) * PAGE_SIZE;

    // ── Verify event exists ───────────────────────────────────────
    const event = await Event.findById(eventId).select("_id title").lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // ── Fetch messages + total in parallel ────────────────────────
    const filter = { eventId, isDeleted: false };

    const [discussions, total] = await Promise.all([
      Discussion.find(filter)
        .populate("userId",          "name college profileImage role")
        .populate("replies.userId",  "name college profileImage role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean(),
      Discussion.countDocuments(filter),
    ]);

    return res.status(200).json({
      discussions,
      pagination: {
        total,
        page,
        pages   : Math.ceil(total / PAGE_SIZE),
        hasMore : skip + discussions.length < total,
      },
    });

  } catch (error) {
    console.error("❌ getEventDiscussions error:", error.message);
    return res.status(500).json({ message: "Failed to fetch discussions" });
  }
};

/*
========================================
✏️ EDIT A MESSAGE
PUT /api/discussions/:id
Body: { message }
Auth: owner only
========================================
*/
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!requireObjectId(res, id, "discussion ID")) return;

    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    const clean = sanitizeText(message);
    if (clean.length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (clean.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      });
    }

    const discussion = await Discussion.findOne({ _id: id, isDeleted: false });
    if (!discussion) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only the author can edit
    if (discussion.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. Not your message." });
    }

    discussion.message  = clean;
    discussion.isEdited = true;
    await discussion.save();

    await discussion.populate("userId", "name college profileImage role");

    return res.status(200).json({
      message   : "Message updated successfully",
      discussion,
    });

  } catch (error) {
    console.error("❌ editMessage error:", error.message);
    return res.status(500).json({ message: "Failed to edit message" });
  }
};

/*
========================================
🗑️ DELETE A MESSAGE (soft delete)
DELETE /api/discussions/:id
Auth: owner OR college_admin (event owner)
========================================
*/
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!requireObjectId(res, id, "discussion ID")) return;

    const discussion = await Discussion.findOne({ _id: id, isDeleted: false })
      .populate("eventId", "createdBy");

    if (!discussion) {
      return res.status(404).json({ message: "Message not found" });
    }

    const isOwner = discussion.userId.toString() === req.user._id.toString();
    const isEventAdmin =
      req.user.role === "college_admin" &&
      discussion.eventId?.createdBy?.toString() === req.user._id.toString();

    if (!isOwner && !isEventAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Soft delete — preserve thread structure
    discussion.isDeleted = true;
    await discussion.save();

    return res.status(200).json({ message: "Message deleted successfully" });

  } catch (error) {
    console.error("❌ deleteMessage error:", error.message);
    return res.status(500).json({ message: "Failed to delete message" });
  }
};

/*
========================================
💬 ADD A REPLY
POST /api/discussions/:id/reply
Body: { message }
Auth: any logged-in user
========================================
*/
export const addReply = async (req, res) => {
  try {
    const { id } = req.params;
    if (!requireObjectId(res, id, "discussion ID")) return;

    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const clean = sanitizeText(message);
    if (clean.length === 0) {
      return res.status(400).json({ message: "Reply cannot be empty" });
    }
    if (clean.length > MAX_REPLY_LENGTH) {
      return res.status(400).json({
        message: `Reply cannot exceed ${MAX_REPLY_LENGTH} characters`,
      });
    }

    const discussion = await Discussion.findOne({ _id: id, isDeleted: false });
    if (!discussion) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Guard: max 100 replies per message (already in schema validator,
    // but check here for a clear error message before hitting DB)
    if (discussion.replies.length >= 100) {
      return res.status(400).json({
        message: "This message has reached the maximum number of replies",
      });
    }

    discussion.replies.push({
      userId : req.user._id,
      message: clean,
    });

    await discussion.save();

    // Populate for response
    await discussion.populate([
      { path: "userId",         select: "name college profileImage role" },
      { path: "replies.userId", select: "name college profileImage role" },
    ]);

    const newReply = discussion.replies[discussion.replies.length - 1];

    return res.status(201).json({
      message : "Reply added successfully",
      reply   : newReply,
    });

  } catch (error) {
    console.error("❌ addReply error:", error.message);
    return res.status(500).json({ message: "Failed to add reply" });
  }
};

/*
========================================
✏️ EDIT A REPLY
PUT /api/discussions/:id/reply/:replyId
Body: { message }
Auth: reply owner only
========================================
*/
export const editReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    if (!requireObjectId(res, id,      "discussion ID")) return;
    if (!requireObjectId(res, replyId, "reply ID"))      return;

    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const clean = sanitizeText(message);
    if (clean.length === 0) {
      return res.status(400).json({ message: "Reply cannot be empty" });
    }
    if (clean.length > MAX_REPLY_LENGTH) {
      return res.status(400).json({
        message: `Reply cannot exceed ${MAX_REPLY_LENGTH} characters`,
      });
    }

    const discussion = await Discussion.findOne({ _id: id, isDeleted: false });
    if (!discussion) {
      return res.status(404).json({ message: "Message not found" });
    }

    const reply = discussion.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (reply.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. Not your reply." });
    }

    reply.message  = clean;
    reply.isEdited = true;
    await discussion.save();

    await discussion.populate("replies.userId", "name college profileImage role");

    return res.status(200).json({
      message: "Reply updated successfully",
      reply  : discussion.replies.id(replyId),
    });

  } catch (error) {
    console.error("❌ editReply error:", error.message);
    return res.status(500).json({ message: "Failed to edit reply" });
  }
};

/*
========================================
🗑️ DELETE A REPLY
DELETE /api/discussions/:id/reply/:replyId
Auth: reply owner OR college_admin (event owner)
========================================
*/
export const deleteReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    if (!requireObjectId(res, id,      "discussion ID")) return;
    if (!requireObjectId(res, replyId, "reply ID"))      return;

    const discussion = await Discussion.findOne({ _id: id, isDeleted: false })
      .populate("eventId", "createdBy");

    if (!discussion) {
      return res.status(404).json({ message: "Message not found" });
    }

    const reply = discussion.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    const isReplyOwner = reply.userId.toString() === req.user._id.toString();
    const isEventAdmin =
      req.user.role === "college_admin" &&
      discussion.eventId?.createdBy?.toString() === req.user._id.toString();

    if (!isReplyOwner && !isEventAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Mongoose subdocument remove
    reply.deleteOne();
    await discussion.save();

    return res.status(200).json({ message: "Reply deleted successfully" });

  } catch (error) {
    console.error("❌ deleteReply error:", error.message);
    return res.status(500).json({ message: "Failed to delete reply" });
  }
};

/*
========================================
❤️ LIKE / UNLIKE A MESSAGE (toggle)
POST /api/discussions/:id/like
Auth: any logged-in user
Returns: { liked: bool, likeCount: number }
========================================
*/
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!requireObjectId(res, id, "discussion ID")) return;

    const discussion = await Discussion.findOne({ _id: id, isDeleted: false });
    if (!discussion) {
      return res.status(404).json({ message: "Message not found" });
    }

    const userId     = req.user._id;
    const alreadyIdx = discussion.likes.findIndex(
      (uid) => uid.toString() === userId.toString()
    );

    let liked;
    if (alreadyIdx !== -1) {
      // Already liked → remove (unlike)
      discussion.likes.splice(alreadyIdx, 1);
      liked = false;
    } else {
      // Not liked yet → add like
      discussion.likes.push(userId);
      liked = true;
    }

    await discussion.save();

    return res.status(200).json({
      liked,
      likeCount: discussion.likes.length,
    });

  } catch (error) {
    console.error("❌ toggleLike error:", error.message);
    return res.status(500).json({ message: "Failed to update like" });
  }
};

// GET /api/discussions/event/:eventId/stats
// Auth: college_admin (event owner only)
// Returns: total messages, total replies,
//          most active users, recent activity
// ========================================
// */
export const getDiscussionStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!requireObjectId(res, eventId, "event ID")) return;

    const event = await Event.findById(eventId).select("createdBy title").lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not manage this event." });
    }

    const filter = { eventId, isDeleted: false };

    const [totalMessages, discussions] = await Promise.all([
      Discussion.countDocuments(filter),
      Discussion.find(filter)
        .select("replies createdAt userId")
        .populate("userId", "name")
        .lean(),
    ]);

    const totalReplies = discussions.reduce(
      (sum, d) => sum + d.replies.length, 0
    );

    // Most active posters (top 5)
    const activityMap = new Map();
    discussions.forEach((d) => {
      const uid  = d.userId?._id?.toString();
      const name = d.userId?.name || "Unknown";
      if (uid) {
        const prev = activityMap.get(uid) || { name, count: 0 };
        activityMap.set(uid, { name, count: prev.count + 1 });
      }
    });

    const topPosters = [...activityMap.entries()]
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.status(200).json({
      eventTitle   : event.title,
      totalMessages,
      totalReplies,
      totalActivity: totalMessages + totalReplies,
      topPosters,
    });

  } catch (error) {
    console.error("❌ getDiscussionStats error:", error.message);
    return res.status(500).json({ message: "Failed to fetch discussion stats" });
  }
};