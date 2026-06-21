import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Discussion from "../models/Discussion.js";
import Feedback from "../models/Feedback.js";

dotenv.config();

/*
========================================
🔗 INTERACTIONS SEED
----------------------------------------
Builds Registrations, Feedback, and Discussions across all 20 events,
fully respecting the lifecycle business rules:

  PAST     → registrations + attendance + feedback (certificates derive
             from attended+approved registrations — no separate model)
  ONGOING  → registrations + discussions + PARTIAL attendance, NO feedback
  UPCOMING → registrations + OPTIONAL discussions, NO attendance, NO feedback

Registration status split (per event): ~70% approved, ~20% pending, ~10% rejected.
Feedback rating split: 5★40% · 4★35% · 3★15% · 2★7% · 1★3%.

currentParticipants on every Event is recalculated at the end to exactly
equal its count of "approved" registrations (the same invariant the live
controllers — approveRegistration/cancelRegistration — maintain).

Lifecycle status is computed LIVE from each event's actual startDate/
endDate vs "now" (the same logic as getEventStatus() in the frontend),
rather than trusted from seedEvents.js comments — this keeps the script
correct even if event dates or run-order ever change.

Global wipe-and-rebuild of Registration/Discussion/Feedback on every run
is intentional (approved decision — this is demo data, not production).
========================================
*/

const PAST_FEEDBACK_TAKE_RATE = 0.75;   // not every attendee leaves feedback
const PAST_ATTEND_RATE        = 0.85;   // of approved regs on a Past event
const ONGOING_ATTEND_RATE     = 0.40;   // of approved regs on an Ongoing event
const MIN_REGS_PER_EVENT      = 12;
const MAX_REGS_PER_EVENT      = 22;

/* ── status helpers ──────────────────────────────────────────────────── */
function getLifecycleStatus(event, now) {
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Past";
}

function pickRegistrationStatus(rand) {
  const r = rand() * 100;
  if (r < 70) return "approved";
  if (r < 90) return "pending";
  return "rejected";
}

function pickWeightedRating(rand) {
  const r = rand() * 100;

  if (r < 40) return 5; // 40%
  if (r < 75) return 4; // 35%
  if (r < 90) return 3; // 15%
  if (r < 97) return 2; // 7%
  return 1;             // 3%
}

/**
 * Builds an array of exactly `n` ratings matching the target proportions
 * (5★40% · 4★35% · 3★15% · 2★7% · 1★3%) using the largest-remainder
 * method for rounding, then returns it pre-shuffled.
 *
 * This "deck" approach is used instead of independent per-item random
 * draws because the total feedback volume in a demo dataset is small
 * (tens of entries, not thousands) — independent draws converge to the
 * target percentages only at large N, so they'd visibly miss the spec
 * on a small sample. A shuffled deck guarantees the exact target
 * proportions (within ±1 unit from rounding) at any sample size.
 */
function buildRatingDeck(n, rand) {
  const target = { 5: 0.40, 4: 0.35, 3: 0.15, 2: 0.07, 1: 0.03 };
  const raw = {};
  const floorCounts = {};
  let used = 0;
  for (const k of Object.keys(target)) {
    raw[k] = target[k] * n;
    floorCounts[k] = Math.floor(raw[k]);
    used += floorCounts[k];
  }
  let remainder = n - used;
  const fracsDesc = Object.keys(target)
    .map((k) => ({ k, frac: raw[k] - floorCounts[k] }))
    .sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (remainder > 0) {
    floorCounts[fracsDesc[i % fracsDesc.length].k] += 1;
    remainder--;
    i++;
  }
  const deck = [];
  for (const k of Object.keys(floorCounts)) {
    for (let c = 0; c < floorCounts[k]; c++) deck.push(Number(k));
  }
  return shuffle(deck, rand);
}

const FEEDBACK_COMMENTS = {
  5: [
    "Absolutely amazing event, learned a lot!",
    "One of the best events I've attended on campus. Flawless organization.",
    "Incredible experience from start to finish — would attend again instantly.",
  ],
  4: [
    "Great speakers and very well organized.",
    "Really enjoyed the interactive sessions, minor scheduling delays though.",
    "Solid event overall, good takeaways for my coursework.",
  ],
  3: [
    "Good experience, but could have been slightly longer.",
    "Decent event, looking forward to the next one.",
    "Average — venue was a bit cramped but content was useful.",
  ],
  2: [
    "Felt a bit disorganized at times, could improve coordination.",
    "Content was okay but the schedule overran significantly.",
  ],
  1: [
    "Didn't meet my expectations, needs better planning next time.",
  ],
};

function pickComment(rating, rand) {
  const pool = FEEDBACK_COMMENTS[rating];
  return pool[Math.floor(rand() * pool.length)];
}

/** Simple seeded PRNG (mulberry32) so re-runs are reproducible. */
function createRand(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle using the seeded rand, returns a new array. */
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DISCUSSION_PROMPTS = [
  "Will we receive digital certificates immediately after the event ends?",
  "Are there any prerequisites or things we need to prepare beforehand?",
  "Is there a WhatsApp/Telegram group for last-minute updates?",
  "Can outside-college participants register, or is this strictly internal?",
  "What's the expected team size for this one?",
  "Will recordings or slides be shared afterwards?",
];

const DISCUSSION_REPLIES = [
  "Yes! Certificates automatically appear in your 'My Certificates' tab once we scan your check-in QR code.",
  "No specific prerequisites — just bring your college ID and have your QR ticket ready on your phone.",
  "We'll post all updates right here in the discussion tab, so keep an eye on this page.",
  "This edition is open to all colleges on the platform — just register through the Events page.",
  "Teams of 2-4 are ideal, but solo participants are also welcome.",
  "Yes, we'll share a summary and key resources after the event wraps up.",
];

const seedInteractions = async () => {
  try {
    await connectDB();

    console.log("=========================================");
    console.log("🔍 STARTING INTERACTIONS SEEDING");
    console.log("=========================================\n");

    const now = new Date();
    const rand = createRand(20260621); // fixed seed → reproducible demo data

    // ── 1. Load students ──────────────────────────────────────────────
    const students = await User.find({ role: "student", status: "approved" });
    if (students.length === 0) {
      throw new Error("❌ No students found. Please run studentsSeed.js first.");
    }
    console.log(`✅ Loaded ${students.length} students.`);

    const teja = students.find((s) => s.email === "panyamsathyateja@gmail.com");
    if (!teja) {
      throw new Error("❌ Required demo student panyamsathyateja@gmail.com not found.");
    }

    // ── 2. Load approved admins ────────────────────────────────────────
    const adminEmails = [
      "sathyateja116@gmail.com",
      "sathyateja118@gmail.com",
      "james.jntu@gmail.com",
      "emily.svu@gmail.com",
    ];
    const admins = await User.find({ email: { $in: adminEmails }, role: "college_admin" });
    if (admins.length < 4) {
      throw new Error("❌ Not all 4 approved admins found. Please run collegeAdminsSeed.js first.");
    }
    const nbkrAdmin = admins.find((a) => a.email === "sathyateja116@gmail.com");
    const vitAdmin  = admins.find((a) => a.email === "sathyateja118@gmail.com");
    console.log(`✅ Loaded ${admins.length} college admins.\n`);

    // ── 3. Load events ──────────────────────────────────────────────────
    const events = await Event.find();
    if (events.length === 0) {
      throw new Error("❌ No events found. Please run seedEvents.js first.");
    }
    console.log(`✅ Loaded ${events.length} events.\n`);

    // Classify events live (do not trust comments in seedEvents.js)
    const classified = events.map((e) => ({
      event: e,
      status: getLifecycleStatus(e, now),
    }));

    const pastEvents     = classified.filter((c) => c.status === "Past");
    const ongoingEvents  = classified.filter((c) => c.status === "Ongoing");
    const upcomingEvents = classified.filter((c) => c.status === "Upcoming");

    console.log(`📊 Lifecycle breakdown: ${pastEvents.length} Past · ${ongoingEvents.length} Ongoing · ${upcomingEvents.length} Upcoming\n`);

    // ── 4. Wipe existing interaction data (approved decision) ──────────
    await Registration.deleteMany({});
    await Discussion.deleteMany({});
    await Feedback.deleteMany({});
    console.log("🧹 Cleared old registrations, discussions, and feedback.\n");

    // Track in-memory: which (studentId,eventId) pairs already used, to
    // respect the unique compound indexes on Registration and Feedback.
    const registrationDocs = []; // bulk insert buffer
    const feedbackDocs     = [];
    const discussionDocs   = []; // built individually (need replies array)

    // Track approved registrations per event for currentParticipants sync
    const approvedCountByEvent = new Map();

    /* ──────────────────────────────────────────────────────────────────
       MAIN PASS — registrations + attendance + feedback per event
    ────────────────────────────────────────────────────────────────── */
    for (const { event, status } of classified) {
      const regCount = MIN_REGS_PER_EVENT +
        Math.floor(rand() * (MAX_REGS_PER_EVENT - MIN_REGS_PER_EVENT + 1));

      const pool = shuffle(students, rand).slice(0, regCount);

      let approvedForThisEvent = 0;

      for (const student of pool) {
        const regStatus = pickRegistrationStatus(rand);

        let attended   = false;
        let attendedAt = null;

        if (regStatus === "approved") {
          approvedForThisEvent++;

          if (status === "Past" && rand() < PAST_ATTEND_RATE) {
            attended   = true;
            attendedAt = new Date(event.endDate.getTime() - 2 * 60 * 60 * 1000); // 2h before event end
          } else if (status === "Ongoing" && rand() < ONGOING_ATTEND_RATE) {
            attended   = true;
            attendedAt = new Date(); // attended "so far" during the ongoing run
          }
          // Upcoming → attended stays false (hard rule)
        }

        registrationDocs.push({
          userId: student._id,
          eventId: event._id,
          status: regStatus,
          approvedBy: regStatus === "approved" ? event.createdBy : null,
          attended,
          attendedAt,
        });

        // Feedback — Past + approved + attended + random take-rate only
        if (status === "Past" && regStatus === "approved" && attended && rand() < PAST_FEEDBACK_TAKE_RATE) {
          const rating = pickWeightedRating(rand);
          feedbackDocs.push({
            userId: student._id,
            eventId: event._id,
            rating,
            comment: pickComment(rating, rand),
          });
        }
      }

      approvedCountByEvent.set(event._id.toString(), approvedForThisEvent);
    }

    /* ──────────────────────────────────────────────────────────────────
       DISCUSSIONS — concentrated on Ongoing, optional on Upcoming
    ────────────────────────────────────────────────────────────────── */
    for (const { event } of ongoingEvents) {
      const threadCount = 3 + Math.floor(rand() * 3); // 3–5 threads
      for (let t = 0; t < threadCount; t++) {
        const asker = students[Math.floor(rand() * students.length)];
        const prompt = DISCUSSION_PROMPTS[Math.floor(rand() * DISCUSSION_PROMPTS.length)];
        const replyCount = 1 + Math.floor(rand() * 3); // 1–3 replies

        const replies = [];
        for (let r = 0; r < replyCount; r++) {
          // Alternate between the event's own admin and a random student replying
          const replier = r === 0 ? null : students[Math.floor(rand() * students.length)];
          replies.push({
            userId: replier ? replier._id : event.createdBy,
            message: DISCUSSION_REPLIES[Math.floor(rand() * DISCUSSION_REPLIES.length)],
          });
        }

        discussionDocs.push({
          eventId: event._id,
          userId: asker._id,
          message: prompt,
          replies,
        });
      }
    }

    for (const { event } of upcomingEvents) {
      const threadCount = Math.floor(rand() * 3); // 0–2 threads (optional)
      for (let t = 0; t < threadCount; t++) {
        const asker = students[Math.floor(rand() * students.length)];
        const prompt = DISCUSSION_PROMPTS[Math.floor(rand() * DISCUSSION_PROMPTS.length)];
        const hasReply = rand() < 0.6;

        discussionDocs.push({
          eventId: event._id,
          userId: asker._id,
          message: prompt,
          replies: hasReply
            ? [{ userId: event.createdBy, message: DISCUSSION_REPLIES[Math.floor(rand() * DISCUSSION_REPLIES.length)] }]
            : [],
        });
      }
    }

    /* ──────────────────────────────────────────────────────────────────
       SPECIAL DEMO REQUIREMENTS — forced, deterministic overrides
    ────────────────────────────────────────────────────────────────── */
    console.log("🎯 Applying special demo-account guarantees...\n");

    // Remove any random registrations/feedback already queued for Teja so
    // the forced state below is the ONLY state for this account — no risk
    // of duplicate-key collisions with the compound unique indexes.
    for (let i = registrationDocs.length - 1; i >= 0; i--) {
      if (registrationDocs[i].userId.toString() === teja._id.toString()) {
        // un-count it from approvedCountByEvent if it had been approved
        if (registrationDocs[i].status === "approved") {
          const key = registrationDocs[i].eventId.toString();
          approvedCountByEvent.set(key, (approvedCountByEvent.get(key) || 1) - 1);
        }
        registrationDocs.splice(i, 1);
      }
    }
    for (let i = feedbackDocs.length - 1; i >= 0; i--) {
      if (feedbackDocs[i].userId.toString() === teja._id.toString()) {
        feedbackDocs.splice(i, 1);
      }
    }

    // Need: an event for each required state. Pick distinct Past/Past/Upcoming events.
    if (pastEvents.length < 2) {
      throw new Error("❌ Need at least 2 Past events for the Teja demo requirements.");
    }
    if (upcomingEvents.length < 1) {
      throw new Error("❌ Need at least 1 Upcoming event for the Teja demo requirements.");
    }
    if (pastEvents.length < 1) {
      throw new Error("❌ Need at least 1 Past event with a pending registration for Teja.");
    }

    const tejaCertEvent1   = pastEvents[0].event;   // attended + feedback → certificate #1
    const tejaCertEvent2   = pastEvents[1].event;    // attended, NO feedback → certificate #2
    const tejaPendingEvent = pastEvents.length >= 3 ? pastEvents[2].event : upcomingEvents[Math.min(1, upcomingEvents.length - 1)].event;
    const tejaUpcomingEvent = upcomingEvents[0].event; // approved upcoming registration

    // Guard: tejaPendingEvent must differ from the cert events and the upcoming event
    const usedIds = new Set([
      tejaCertEvent1._id.toString(),
      tejaCertEvent2._id.toString(),
      tejaUpcomingEvent._id.toString(),
    ]);
    let pendingEventCandidate = tejaPendingEvent;
    if (usedIds.has(pendingEventCandidate._id.toString())) {
      // fall back to any other event not already used by Teja
      const fallback = classified.find((c) => !usedIds.has(c.event._id.toString()));
      if (!fallback) {
        throw new Error("❌ Not enough distinct events to satisfy all Teja demo requirements.");
      }
      pendingEventCandidate = fallback.event;
    }
    const tejaPendingFinal = pendingEventCandidate;

    // 1) Certificate #1 — attended Past event WITH feedback
    registrationDocs.push({
      userId: teja._id,
      eventId: tejaCertEvent1._id,
      status: "approved",
      approvedBy: tejaCertEvent1.createdBy,
      attended: true,
      attendedAt: new Date(tejaCertEvent1.endDate.getTime() - 2 * 60 * 60 * 1000),
    });
    approvedCountByEvent.set(
      tejaCertEvent1._id.toString(),
      (approvedCountByEvent.get(tejaCertEvent1._id.toString()) || 0) + 1
    );
    feedbackDocs.push({
      userId: teja._id,
      eventId: tejaCertEvent1._id,
      rating: 5,
      comment: "Fantastic event — exactly the kind of hands-on experience I was hoping for!",
    });
    console.log(`   ✅ [CERTIFICATE #1] Teja attended "${tejaCertEvent1.title}" + submitted feedback`);

    // 2) Certificate #2 — attended Past event WITHOUT feedback
    registrationDocs.push({
      userId: teja._id,
      eventId: tejaCertEvent2._id,
      status: "approved",
      approvedBy: tejaCertEvent2.createdBy,
      attended: true,
      attendedAt: new Date(tejaCertEvent2.endDate.getTime() - 2 * 60 * 60 * 1000),
    });
    approvedCountByEvent.set(
      tejaCertEvent2._id.toString(),
      (approvedCountByEvent.get(tejaCertEvent2._id.toString()) || 0) + 1
    );
    console.log(`   ✅ [CERTIFICATE #2 + NO FEEDBACK] Teja attended "${tejaCertEvent2.title}" without submitting feedback`);

    // 3) Pending registration (awaiting approval)
    registrationDocs.push({
      userId: teja._id,
      eventId: tejaPendingFinal._id,
      status: "pending",
      approvedBy: null,
      attended: false,
      attendedAt: null,
    });
    console.log(`   ✅ [PENDING] Teja has a pending registration for "${tejaPendingFinal.title}"`);

    // 4) Approved upcoming registration
    registrationDocs.push({
      userId: teja._id,
      eventId: tejaUpcomingEvent._id,
      status: "approved",
      approvedBy: tejaUpcomingEvent.createdBy,
      attended: false,
      attendedAt: null,
    });
    approvedCountByEvent.set(
      tejaUpcomingEvent._id.toString(),
      (approvedCountByEvent.get(tejaUpcomingEvent._id.toString()) || 0) + 1
    );
    console.log(`   ✅ [APPROVED UPCOMING] Teja is approved for "${tejaUpcomingEvent.title}"\n`);

    // ── Personal admin accounts — pending registrations + active discussions ──
    // Find each admin's Ongoing event (guaranteed to exist — 1 per admin).
    const nbkrOngoing = ongoingEvents.find((c) => c.event.createdBy.toString() === nbkrAdmin._id.toString());
    const vitOngoing  = ongoingEvents.find((c) => c.event.createdBy.toString() === vitAdmin._id.toString());
    const nbkrPast    = pastEvents.find((c) => c.event.createdBy.toString() === nbkrAdmin._id.toString());
    const vitPast     = pastEvents.find((c) => c.event.createdBy.toString() === vitAdmin._id.toString());

    for (const [admin, ongoingMatch, pastMatch] of [
      [nbkrAdmin, nbkrOngoing, nbkrPast],
      [vitAdmin, vitOngoing, vitPast],
    ]) {
      // Ensure at least one pending registration exists on one of this admin's events
      const adminEvents = classified.filter((c) => c.event.createdBy.toString() === admin._id.toString());
      const targetForPending = adminEvents[0].event;
      const pendingStudent = students.find(
        (s) => s.email !== teja.email && s._id.toString() !== targetForPending.createdBy.toString()
      ) || students[1];

      // Remove any existing reg for this exact pair first to avoid duplicate-key collisions
      for (let i = registrationDocs.length - 1; i >= 0; i--) {
        if (
          registrationDocs[i].userId.toString() === pendingStudent._id.toString() &&
          registrationDocs[i].eventId.toString() === targetForPending._id.toString()
        ) {
          if (registrationDocs[i].status === "approved") {
            const key = targetForPending._id.toString();
            approvedCountByEvent.set(key, (approvedCountByEvent.get(key) || 1) - 1);
          }
          registrationDocs.splice(i, 1);
        }
      }
      registrationDocs.push({
        userId: pendingStudent._id,
        eventId: targetForPending._id,
        status: "pending",
        approvedBy: null,
        attended: false,
        attendedAt: null,
      });
      console.log(`   ✅ [ADMIN PENDING] ${admin.email} has a pending registration on "${targetForPending.title}"`);

      // Ensure active discussion on this admin's Ongoing event
      if (ongoingMatch) {
        discussionDocs.push({
          eventId: ongoingMatch.event._id,
          userId: pendingStudent._id,
          message: "Is there a fixed weekly schedule, or can we join sessions flexibly?",
          replies: [
            {
              userId: admin._id,
              message: "Sessions are flexible — drop in whenever suits you, we run them on a rolling basis throughout the program.",
            },
          ],
        });
        console.log(`   ✅ [ADMIN DISCUSSION] Active thread added to "${ongoingMatch.event.title}" (${admin.email}'s ongoing event)`);
      }

      // Ensure feedback exists on this admin's Past event (for analytics)
      if (pastMatch) {
        const feedbackStudent = students.find(
          (s) => s.email !== teja.email && s._id.toString() !== pendingStudent._id.toString()
        ) || students[2];

        // Make sure that student has an attended+approved registration on this event
        const hasReg = registrationDocs.some(
          (r) =>
            r.userId.toString() === feedbackStudent._id.toString() &&
            r.eventId.toString() === pastMatch.event._id.toString() &&
            r.status === "approved" &&
            r.attended
        );
        if (!hasReg) {
          // remove any conflicting prior entry for this pair, then force one in
          for (let i = registrationDocs.length - 1; i >= 0; i--) {
            if (
              registrationDocs[i].userId.toString() === feedbackStudent._id.toString() &&
              registrationDocs[i].eventId.toString() === pastMatch.event._id.toString()
            ) {
              if (registrationDocs[i].status === "approved") {
                const key = pastMatch.event._id.toString();
                approvedCountByEvent.set(key, (approvedCountByEvent.get(key) || 1) - 1);
              }
              registrationDocs.splice(i, 1);
            }
          }
          registrationDocs.push({
            userId: feedbackStudent._id,
            eventId: pastMatch.event._id,
            status: "approved",
            approvedBy: pastMatch.event.createdBy,
            attended: true,
            attendedAt: new Date(pastMatch.event.endDate.getTime() - 2 * 60 * 60 * 1000),
          });
          approvedCountByEvent.set(
            pastMatch.event._id.toString(),
            (approvedCountByEvent.get(pastMatch.event._id.toString()) || 0) + 1
          );
        }

        // remove any conflicting prior feedback for this pair, then force one in
        for (let i = feedbackDocs.length - 1; i >= 0; i--) {
          if (
            feedbackDocs[i].userId.toString() === feedbackStudent._id.toString() &&
            feedbackDocs[i].eventId.toString() === pastMatch.event._id.toString()
          ) {
            feedbackDocs.splice(i, 1);
          }
        }
        feedbackDocs.push({
          userId: feedbackStudent._id,
          eventId: pastMatch.event._id,
          rating: 5,
          comment: "Extremely well run — great use of campus resources and time.",
        });
        console.log(`   ✅ [ADMIN ANALYTICS] Feedback ensured on "${pastMatch.event.title}" (${admin.email}'s past event)\n`);
      }
    }

    /* ──────────────────────────────────────────────────────────────────
       FINAL DEDUPLICATION SAFETY NET
       (compound unique index is {userId,eventId} for both Registration
       and Feedback — collapse any accidental duplicates, last-write-wins,
       before bulk insert, since insertMany would otherwise throw E11000.)
    ────────────────────────────────────────────────────────────────── */
    const dedupeByPair = (docs) => {
      const map = new Map();
      for (const d of docs) {
        map.set(`${d.userId}:${d.eventId}`, d); // later entries overwrite earlier ones
      }
      return [...map.values()];
    };

    const finalRegistrations = dedupeByPair(registrationDocs);
    const finalFeedback      = dedupeByPair(feedbackDocs);

    // Recompute approvedCountByEvent from the FINAL deduped registration list
    // to guarantee currentParticipants is perfectly accurate, regardless of
    // any dedupe collapses above.
    const finalApprovedCount = new Map();
    for (const r of finalRegistrations) {
      if (r.status === "approved") {
        const key = r.eventId.toString();
        finalApprovedCount.set(key, (finalApprovedCount.get(key) || 0) + 1);
      }
    }

    /* ──────────────────────────────────────────────────────────────────
       BULK INSERT
    ────────────────────────────────────────────────────────────────── */
    console.log("💾 Inserting registrations, feedback, and discussions...\n");

    const insertedRegs = await Registration.insertMany(finalRegistrations);
    console.log(`✅ Inserted ${insertedRegs.length} registrations.`);

    const insertedFeedback = await Feedback.insertMany(finalFeedback);
    console.log(`✅ Inserted ${insertedFeedback.length} feedback entries.`);

    let insertedDiscussionCount = 0;
    for (const d of discussionDocs) {
      await Discussion.create(d);
      insertedDiscussionCount++;
    }
    console.log(`✅ Inserted ${insertedDiscussionCount} discussion threads.\n`);

    /* ──────────────────────────────────────────────────────────────────
       SYNC currentParticipants ON EVERY EVENT
    ────────────────────────────────────────────────────────────────── */
    console.log("🔄 Syncing Event.currentParticipants to match approved registrations...");
    for (const { event } of classified) {
      const approvedCount = finalApprovedCount.get(event._id.toString()) || 0;
      await Event.findByIdAndUpdate(event._id, { currentParticipants: approvedCount });
    }
    console.log("✅ currentParticipants sync complete.\n");

    /* ──────────────────────────────────────────────────────────────────
       VERIFICATION SUMMARY
    ────────────────────────────────────────────────────────────────── */
    console.log("=========================================");
    console.log("📊 VERIFICATION SUMMARY");
    console.log("=========================================");

    const totalApproved = finalRegistrations.filter((r) => r.status === "approved").length;
    const totalPending  = finalRegistrations.filter((r) => r.status === "pending").length;
    const totalRejected = finalRegistrations.filter((r) => r.status === "rejected").length;
    const totalAttended = finalRegistrations.filter((r) => r.attended).length;

    console.log(`Registrations: ${finalRegistrations.length} total`);
    console.log(`  approved: ${totalApproved} (${(totalApproved / finalRegistrations.length * 100).toFixed(1)}%)`);
    console.log(`  pending:  ${totalPending} (${(totalPending / finalRegistrations.length * 100).toFixed(1)}%)`);
    console.log(`  rejected: ${totalRejected} (${(totalRejected / finalRegistrations.length * 100).toFixed(1)}%)`);
    console.log(`  attended: ${totalAttended}`);

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    finalFeedback.forEach((f) => ratingCounts[f.rating]++);
    console.log(`\nFeedback: ${finalFeedback.length} total`);
    Object.entries(ratingCounts).forEach(([star, count]) => {
      console.log(`  ${star}★: ${count} (${(count / finalFeedback.length * 100).toFixed(1)}%)`);
    });

    console.log(`\nDiscussions: ${discussionDocs.length} threads`);

    // Confirm no Upcoming-event registration has attended:true
    const badUpcomingAttendance = await Registration.countDocuments({
      eventId: { $in: upcomingEvents.map((c) => c.event._id) },
      attended: true,
    });
    console.log(`\nRule check — Upcoming events with attended:true (should be 0): ${badUpcomingAttendance}`);

    // Confirm no Ongoing/Upcoming event has feedback
    const badFeedbackEvents = await Feedback.countDocuments({
      eventId: { $in: [...ongoingEvents, ...upcomingEvents].map((c) => c.event._id) },
    });
    console.log(`Rule check — Feedback on Ongoing/Upcoming events (should be 0): ${badFeedbackEvents}`);

    // Confirm Teja's required state
    const tejaRegs = await Registration.find({ userId: teja._id }).populate("eventId", "title");
    const tejaCerts = await Registration.countDocuments({ userId: teja._id, status: "approved", attended: true });
    const tejaFeedbackCount = await Feedback.countDocuments({ userId: teja._id });
    console.log(`\nTeja (panyamsathyateja@gmail.com) verification:`);
    console.log(`  Total registrations: ${tejaRegs.length}`);
    console.log(`  Attended+approved (certificate-eligible): ${tejaCerts} (need ≥2)`);
    console.log(`  Feedback submitted: ${tejaFeedbackCount} (need ≥1)`);
    console.log(`  Pending: ${tejaRegs.filter((r) => r.status === "pending").length} (need ≥1)`);
    console.log(
      `  Approved upcoming: ${
        tejaRegs.filter((r) => r.status === "approved" && upcomingEvents.some((c) => c.event._id.toString() === r.eventId._id.toString())).length
      } (need ≥1)`
    );

    console.log("\n===============================================================");
    console.log("🎉 ALL INTERACTIONS (Registrations, Feedback, Discussions) SEEDED SUCCESSFULLY!");
    console.log("===============================================================\n");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error seeding interactions:", error);
    process.exit(1);
  }
};

seedInteractions();
