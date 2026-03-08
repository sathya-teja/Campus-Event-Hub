import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import Event from "../models/Event.js";
import User from "../models/User.js";

/* ─────────────────────────────────────────────
   IN-MEMORY CONVERSATION STORE
   Each session: { history[], lastActive }
   Cleanup job runs every 30 min and removes
   sessions idle for more than 2 hours.
───────────────────────────────────────────── */
const conversations = new Map();

const IDLE_TIMEOUT_MS    = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;     // 30 minutes

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of conversations.entries()) {
    if (now - session.lastActive > IDLE_TIMEOUT_MS) {
      conversations.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

/* ─────────────────────────────────────────────
   INTENT DETECTION
   Returns which DB queries are needed.
   Follow-up / conversational messages get
   no DB fetch — the AI already has the data
   in its history and can answer from there.
───────────────────────────────────────────── */
const FOLLOWUP_PATTERN = /^\s*(more|again|re-?list|repeat|show (them|it|all|more)|list (them|all|more)|yes|ok(ay)?|got it|thanks?|thank you|all of them|all events?)\s*[.?!]?\s*$/i;

function detectIntent(message) {
  if (FOLLOWUP_PATTERN.test(message)) {
    return {
      listEvents: false, myEvents: false, myProfile: false,
      userStats: false, pendingAdmins: false,
    };
  }

  const msg = message.toLowerCase();
  return {
    listEvents:    /\b(upcoming events?|available events?|show events?|list events?|browse events?|find events?|what.*events?|events?.*today|events?.*available|events?.*upcoming)\b/.test(msg),
    myEvents:      /\b(my events?|events? i (created|made|added)|created by me)\b/.test(msg),
    myProfile:     /\b(my (profile|account|info|details?|college|role|name|email))\b/.test(msg),
    userStats:     /\b(how many (users?|students?|admins?)|(total|count).*(users?|students?))\b/.test(msg),
    pendingAdmins: /\b(pending|waiting|approval|approve|unapproved)\b.*\b(admin|admins?)\b/.test(msg),
  };
}

/* ─────────────────────────────────────────────
   DB CONTEXT BUILDER
   Fetches only what intent needs and formats
   it as a plain-text block for the AI prompt.
───────────────────────────────────────────── */
async function buildDbContext(intent, user) {
  const lines = [];

  try {
    // Upcoming events — visible to everyone
    if (intent.listEvents) {
      const now = new Date();
      const events = await Event.find({ startDate: { $gte: now } })
        .sort({ startDate: 1 })
        .populate("createdBy", "name college")
        .lean();

      if (events.length === 0) {
        lines.push("LIVE DATA — Upcoming Events: None at the moment.");
      } else {
        lines.push("LIVE DATA — Upcoming Events:");
        events.forEach((e, i) => {
          lines.push(
            `${i + 1}. "${e.title}" | Category: ${e.category} | ` +
            `Location: ${e.location} | ` +
            `Start: ${new Date(e.startDate).toLocaleDateString("en-IN")} | ` +
            `End: ${new Date(e.endDate).toLocaleDateString("en-IN")} | ` +
            `By: ${e.createdBy?.name || "Unknown"} (${e.createdBy?.college || ""})`
          );
        });
      }
    }

    // Events created by this college admin
    if (intent.myEvents && user?.role === "college_admin") {
      const myEvents = await Event.find({ createdBy: user._id })
        .sort({ startDate: -1 })
        .lean();

      if (myEvents.length === 0) {
        lines.push("LIVE DATA — Your Events: You have not created any events yet.");
      } else {
        lines.push(`LIVE DATA — Events created by ${user.name}:`);
        myEvents.forEach((e, i) => {
          lines.push(
            `${i + 1}. "${e.title}" | Category: ${e.category} | ` +
            `Location: ${e.location} | ` +
            `Start: ${new Date(e.startDate).toLocaleDateString("en-IN")}`
          );
        });
      }
    }

    // Logged-in user's own profile
    if (intent.myProfile && user) {
      lines.push(
        `LIVE DATA — Your Profile: Name: ${user.name} | Email: ${user.email} | ` +
        `Role: ${user.role} | College: ${user.college || "N/A"} | Status: ${user.status}`
      );
    }

    // Platform user stats — admin and super admin only
    if (intent.userStats && (user?.role === "super_admin" || user?.role === "college_admin")) {
      const [totalStudents, totalAdmins] = await Promise.all([
        User.countDocuments({ role: "student",       status: "approved" }),
        User.countDocuments({ role: "college_admin", status: "approved" }),
      ]);
      lines.push(
        `LIVE DATA — Platform Stats: Approved Students: ${totalStudents} | ` +
        `Approved College Admins: ${totalAdmins}`
      );
    }

    // Pending college admins — super admin only
    if (intent.pendingAdmins && user?.role === "super_admin") {
      const pending = await User.find({ role: "college_admin", status: "pending" })
        .select("name email college createdAt")
        .lean();

      if (pending.length === 0) {
        lines.push("LIVE DATA — Pending Admins: No admins pending approval.");
      } else {
        lines.push("LIVE DATA — Pending College Admins:");
        pending.forEach((a, i) => {
          lines.push(
            `${i + 1}. ${a.name} | Email: ${a.email} | ` +
            `College: ${a.college} | ` +
            `Requested: ${new Date(a.createdAt).toLocaleDateString("en-IN")}`
          );
        });
      }
    }

  } catch (err) {
    console.error("DB context fetch error:", err);
    lines.push("LIVE DATA — (Could not fetch live data right now.)");
  }

  return lines.length > 0
    ? `\n\n--- REAL-TIME DATABASE CONTEXT ---\n${lines.join("\n")}\n--- END OF DATABASE CONTEXT ---`
    : "";
}

/* ─────────────────────────────────────────────
   TRAINING FILE — cached after first read
───────────────────────────────────────────── */
let cachedTraining = null;

function loadTraining() {
  if (cachedTraining !== null) return cachedTraining;
  try {
    const trainingPath = path.join(process.cwd(), "data/custom-training.txt");
    cachedTraining = fs.existsSync(trainingPath)
      ? fs.readFileSync(trainingPath, "utf8")
      : "";
  } catch (err) {
    console.error("Training file error:", err);
    cachedTraining = "";
  }
  return cachedTraining;
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export const getChatResponse = async (message, user) => {
  const groq      = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const sessionId = user?._id?.toString() || "guest";
  const role      = user?.role || "guest";

  // Initialize session
  if (!conversations.has(sessionId)) {
    const training = loadTraining();
    conversations.set(sessionId, {
      lastActive: Date.now(),
      history: [
        {
          role: "system",
          content:
`${training}

Current user role: ${role}
${user ? `Current user name: ${user.name}\nCurrent user email: ${user.email}` : "User is not logged in (guest)."}

IMPORTANT RULES:
- Answer ONLY CampusEventHub-related queries.
- When REAL-TIME DATABASE CONTEXT is provided, use that exact data in your answer.
- Never make up event names, dates, or counts — only use what is in the DB context.
- Never expose other users' passwords, tokens, or private data.
- YOU ARE READ-ONLY. You can only READ and DISPLAY data from the database. You CANNOT create, update, approve, reject, or delete anything. Never claim you have performed any action on the database.
- If a user asks you to approve, reject, delete, or modify anything — always tell them to do it themselves through the dashboard. Never say "I have approved" or "I have updated" or "I have corrected" anything.
- If Student → guide only student features.
- If College Admin → guide only their own events and admin features.
- If Super Admin → guide all super admin features.
- If Guest → explain the platform and suggest logging in.
- Use numbered steps for processes.
- Stay strictly within the CampusEventHub platform.`,
        },
      ],
    });
  }

  const session    = conversations.get(sessionId);
  session.lastActive = Date.now();

  // Detect what the user wants and fetch DB data
  const intent    = detectIntent(message);
  const dbContext = await buildDbContext(intent, user);

  // Inject DB context into the user message if we fetched anything
  const userContent = dbContext ? `${message}\n${dbContext}` : message;

  session.history.push({ role: "user", content: userContent });

  // Keep max 10 exchanges (system prompt + 20 messages)
  if (session.history.length > 21) {
    session.history.splice(1, 2);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: session.history,
      temperature: 0.3,
      max_tokens: 600,
    });

    const reply = completion.choices[0].message.content;
    session.history.push({ role: "assistant", content: reply });
    return reply;

  } catch (error) {
    console.error("Groq API error:", error);
    // Remove the failed user message to keep history clean
    session.history.pop();
    return "I'm currently having trouble responding. Please try again shortly.";
  }
};