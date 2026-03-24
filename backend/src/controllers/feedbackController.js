import Feedback from "../models/Feedback.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import mongoose from "mongoose";

/* ================================
   ⭐ SUBMIT FEEDBACK
   - Student only
   - Only after event.endDate has passed
   - Student must have attended (Registration: approved + attended)
   - One feedback per student per event
================================ */
export const submitFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    let { eventId, rating, comment } = req.body;

    // ── Basic validation ──────────────────────────────────
    if (!eventId || !rating) {
      return res.status(400).json({ success: false, message: "Event and rating are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const r = Number(rating);
    if (r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Strip HTML tags from comment
    const cleanComment = comment?.replace(/<[^>]*>?/gm, "") || "";

    // ── Event must exist ──────────────────────────────────
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // ── Event must be completed (endDate in the past) ─────
    if (new Date(event.endDate) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted after the event has ended",
      });
    }

    // ── Student must have attended the event ──────────────
    // Attendance is tracked via the Registration model
    const registration = await Registration.findOne({
      userId,
      eventId,
      status: "approved",
      attended: true,
    });

    if (!registration) {
      return res.status(403).json({
        success: false,
        message: "You can only submit feedback for events you attended",
      });
    }

    // ── One feedback per student per event ────────────────
    const exists = await Feedback.findOne({ userId, eventId });
    if (exists) {
      return res.status(400).json({ success: false, message: "You have already submitted feedback for this event" });
    }

    // ── Create feedback ───────────────────────────────────
    const feedback = await Feedback.create({
      userId,
      eventId,
      rating: r,
      comment: cleanComment,
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error("submitFeedback error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================================
   📖 GET EVENT FEEDBACK
   - Accessible to college_admin
   - Supports pagination, rating filter, sort
================================ */
export const getEventFeedback = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const { rating, page = 1, sort, limit = 5 } = req.query;

    const pageNum  = Math.max(1, Number(page)  || 1);
    const limitNum = Math.min(10, Number(limit) || 5);

    const filter = { eventId: new mongoose.Types.ObjectId(req.params.id) };

    if (rating) {
      const rf = Number(rating);
      if (rf < 1 || rf > 5) {
        return res.status(400).json({ success: false, message: "Rating filter must be between 1 and 5" });
      }
      filter.rating = rf;
    }

    const sortOption = sort === "top" ? { rating: -1 } : { createdAt: -1 };

    const feedbacks = await Feedback.find(filter)
      .populate("userId", "name profileImage")
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Feedback.countDocuments(filter);

    // Average rating via aggregation
    const stats = await Feedback.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id        : null,
          avgRating  : { $avg: "$rating" },
          total      : { $sum: 1 },
          // breakdown: count per star
          fiveStar   : { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStar   : { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStar  : { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStar    : { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar    : { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const avg = stats[0]?.avgRating || 0;

    res.json({
      success: true,
      data: {
        feedbacks,
        averageRating : parseFloat(avg.toFixed(2)),
        totalReviews  : total,
        currentPage   : pageNum,
        totalPages    : Math.ceil(total / limitNum),
        ratingBreakdown: {
          5: stats[0]?.fiveStar  || 0,
          4: stats[0]?.fourStar  || 0,
          3: stats[0]?.threeStar || 0,
          2: stats[0]?.twoStar   || 0,
          1: stats[0]?.oneStar   || 0,
        },
      },
    });
  } catch (error) {
    console.error("getEventFeedback error:", error);
    res.status(500).json({ success: false, message: "Error fetching feedback" });
  }
};

/* ================================
   ✏️ UPDATE FEEDBACK
   - Student can edit their own feedback within 24 hours
   - Sets isEdited flag to true
================================ */
export const updateFeedback = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID" });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    // Only the student who submitted it can edit
    if (feedback.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own feedback" });
    }

    // 24-hour edit window
    const hoursSinceSubmission = (Date.now() - new Date(feedback.createdAt)) / (1000 * 60 * 60);
    if (hoursSinceSubmission > 24) {
      return res.status(400).json({ success: false, message: "Feedback can only be edited within 24 hours of submission" });
    }

    if (req.body.rating !== undefined) {
      const r = Number(req.body.rating);
      if (r < 1 || r > 5) {
        return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
      }
      feedback.rating = r;
    }

    if (req.body.comment !== undefined) {
      feedback.comment = req.body.comment.replace(/<[^>]*>?/gm, "");
    }

    // Mark as edited
    feedback.isEdited = true;

    await feedback.save();

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error("updateFeedback error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

/* ================================
   ❌ DELETE FEEDBACK
   - Student can delete their own feedback
   - college_admin can delete any feedback
================================ */
export const deleteFeedback = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID" });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    const isOwner = feedback.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "college_admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not allowed to delete this feedback" });
    }

    await Feedback.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("deleteFeedback error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

/* ================================
   👤 GET MY FEEDBACK (Student)
   - Returns all feedback submitted by the logged-in student
================================ */
export const getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id })
      .populate("eventId", "title startDate endDate location")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: feedbacks });
  } catch (error) {
    console.error("getMyFeedback error:", error);
    res.status(500).json({ success: false, message: "Error fetching your feedback" });
  }
};

/* ================================
   📊 ADMIN ANALYTICS (college_admin)
   - Overall stats across all events
   - Per-event breakdown
================================ */
export const getAdminAnalytics = async (req, res) => {
  try {
    // Overall stats across all events
    const overallStats = await Feedback.aggregate([
      {
        $group: {
          _id          : null,
          totalFeedbacks: { $sum: 1 },
          averageRating : { $avg: "$rating" },
        },
      },
    ]);

    // Per-event breakdown — shows every event and its feedback summary
    const perEventStats = await Feedback.aggregate([
      {
        $group: {
          _id          : "$eventId",
          totalFeedbacks: { $sum: 1 },
          averageRating : { $avg: "$rating" },
        },
      },
      {
        $lookup: {
          from        : "events",
          localField  : "_id",
          foreignField: "_id",
          as          : "event",
        },
      },
      { $unwind: "$event" },
      {
        $project: {
          eventId       : "$_id",
          eventTitle    : "$event.title",
          eventEndDate  : "$event.endDate",
          totalFeedbacks: 1,
          averageRating : { $round: ["$averageRating", 2] },
        },
      },
      { $sort: { eventEndDate: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overall: {
          totalFeedbacks: overallStats[0]?.totalFeedbacks || 0,
          averageRating : parseFloat((overallStats[0]?.averageRating || 0).toFixed(2)),
        },
        perEvent: perEventStats,
      },
    });
  } catch (error) {
    console.error("getAdminAnalytics error:", error);
    res.status(500).json({ success: false, message: "Analytics error" });
  }
};

/* ================================
   📊 EVENT ANALYTICS (college_admin)
   - Detailed stats for one specific event
================================ */
export const getEventAnalytics = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const eventObjectId = new mongoose.Types.ObjectId(req.params.eventId);

    // Verify event exists
    const event = await Event.findById(eventObjectId).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const stats = await Feedback.aggregate([
      { $match: { eventId: eventObjectId } },
      {
        $group: {
          _id           : null,
          totalFeedbacks: { $sum: 1 },
          averageRating : { $avg: "$rating" },
          fiveStar      : { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStar      : { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStar     : { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStar       : { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar       : { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        event: {
          id      : event._id,
          title   : event.title,
          endDate : event.endDate,
        },
        totalFeedbacks : stats[0]?.totalFeedbacks || 0,
        averageRating  : parseFloat((stats[0]?.averageRating || 0).toFixed(2)),
        ratingBreakdown: {
          5: stats[0]?.fiveStar  || 0,
          4: stats[0]?.fourStar  || 0,
          3: stats[0]?.threeStar || 0,
          2: stats[0]?.twoStar   || 0,
          1: stats[0]?.oneStar   || 0,
        },
      },
    });
  } catch (error) {
    console.error("getEventAnalytics error:", error);
    res.status(500).json({ success: false, message: "Error fetching event analytics" });
  }
};