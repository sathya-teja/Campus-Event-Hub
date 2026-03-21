import express from "express";
import { verifyToken, authorizeRoles, optionalVerifyToken } from "../middleware/authmiddleware.js";
import {
  postMessage,
  getEventDiscussions,
  editMessage,
  deleteMessage,
  addReply,
  editReply,
  deleteReply,
  getDiscussionStats,
  toggleLike,
} from "../controllers/discussionController.js";

const router = express.Router();

/*
  ─────────────────────────────────────────────
  IN-MEMORY RATE LIMITER
  Prevents spam posting.
  Logged-in users  → 15 messages per minute
  ─────────────────────────────────────────────
*/
const postLimitStore = new Map();
const POST_WINDOW_MS = 60 * 1000;  // 1 minute
const POST_LIMIT     = 15;

function postRateLimit(req, res, next) {
  const key  = req.user._id.toString();
  const now  = Date.now();
  const entry = postLimitStore.get(key);

  if (!entry || now - entry.windowStart > POST_WINDOW_MS) {
    postLimitStore.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= POST_LIMIT) {
    return res.status(429).json({
      message: "Too many messages. Please wait a moment before posting again.",
    });
  }

  entry.count++;
  return next();
}

// Clean stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of postLimitStore.entries()) {
    if (now - entry.windowStart > POST_WINDOW_MS) {
      postLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/*
========================================
📋 ROUTES
Base: /api/discussions
========================================
*/

/*
  GET /api/discussions/event/:eventId?page=1
  Public read — guests can view discussions.
  Optional auth to know if viewer is the author.
*/
router.get(
  "/event/:eventId",
  optionalVerifyToken,
  getEventDiscussions
);

/*
  GET /api/discussions/event/:eventId/stats
  College admin only — stats for their own event.
*/
router.get(
  "/event/:eventId/stats",
  verifyToken,
  authorizeRoles("college_admin"),
  getDiscussionStats
);

/*
  POST /api/discussions
  Any logged-in user can post a message.
*/
router.post(
  "/",
  verifyToken,
  postRateLimit,
  postMessage
);

/*
  PUT /api/discussions/:id
  Owner only — edit their own message.
*/
router.put(
  "/:id",
  verifyToken,
  editMessage
);

/*
  DELETE /api/discussions/:id
  Owner OR college_admin (event owner) — soft delete.
*/
router.delete(
  "/:id",
  verifyToken,
  deleteMessage
);

/*
  POST /api/discussions/:id/like
  Toggle like — any logged-in user.
*/
router.post(
  "/:id/like",
  verifyToken,
  toggleLike
);

/*
  POST /api/discussions/:id/reply
  Any logged-in user can reply.
*/
router.post(
  "/:id/reply",
  verifyToken,
  postRateLimit,
  addReply
);

/*
  PUT /api/discussions/:id/reply/:replyId
  Reply owner only — edit their own reply.
*/
router.put(
  "/:id/reply/:replyId",
  verifyToken,
  editReply
);

/*
  DELETE /api/discussions/:id/reply/:replyId
  Reply owner OR college_admin (event owner).
*/
router.delete(
  "/:id/reply/:replyId",
  verifyToken,
  deleteReply
);

export default router;