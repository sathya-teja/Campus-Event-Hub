import express from "express";
import { chatHandler } from "../controllers/chatController.js";
import { optionalVerifyToken } from "../middleware/authmiddleware.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   SIMPLE IN-MEMORY RATE LIMITER
   Logged-in users  → 30 messages per minute
   Guests           → 10 messages per minute
   Uses IP as key for guests, user ID for auth.
───────────────────────────────────────────── */
const rateLimitStore = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute window

function rateLimit(req, res, next) {
  const isAuth      = !!req.user;
  const key         = isAuth ? req.user._id.toString() : req.ip;
  const limit       = isAuth ? 30 : 10;
  const now         = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= limit) {
    return res.status(429).json({
      message: `Too many messages. Please wait a moment before sending more.`,
    });
  }

  entry.count++;
  return next();
}

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

router.post("/", optionalVerifyToken, rateLimit, chatHandler);

export default router;