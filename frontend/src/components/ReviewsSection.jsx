import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiStar, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  submitFeedback,
  getMyFeedback,
  updateFeedback,
  deleteFeedback,
} from "../services/api";

/* ─────────────────────────────────────────────
   Star renderer — reused everywhere
───────────────────────────────────────────── */
function Stars({ value, interactive = false, onChange, size = 20 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type={interactive ? "button" : undefined}
          disabled={!interactive}
          onClick={() => interactive && onChange?.(s)}
          onMouseEnter={() => interactive && setHovered(s)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? "transition-transform hover:scale-110" : "cursor-default"}
        >
          <FiStar
            size={size}
            className={
              s <= (interactive ? hovered || value : value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   Props:
     eventId   – ObjectId of the event
     eventStatus – "Upcoming" | "Ongoing" | "Past"
     registrationStatus – the student's registration object (or null)
───────────────────────────────────────────── */
export default function ReviewsSection({ eventId, eventStatus, registrationStatus }) {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  // ── Feedback list state ───────────────────────────────────────
  // const [totalReviews, setTotalReviews] = useState(0);
  // const [avgRating,    setAvgRating]    = useState(0);
  // const [breakdown,    setBreakdown]    = useState({ 5:0, 4:0, 3:0, 2:0, 1:0 });
  // const [page,         setPage]         = useState(1);
  // const [totalPages,   setTotalPages]   = useState(1);
  // const [filterRating, setFilterRating] = useState(null);
  // const [sortBy,       setSortBy]       = useState("latest"); // "latest" | "top"

  // ── My existing feedback ──────────────────────────────────────
  const [myFeedback,  setMyFeedback]  = useState(null);   // null = not yet submitted
  const [checkingMine, setCheckingMine] = useState(true);

  // ── Submit / edit form ────────────────────────────────────────
  const [formRating,  setFormRating]  = useState(5);
  const [formComment, setFormComment] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [editMode,    setEditMode]    = useState(false);

  // ── Fetch paginated feedback ──────────────────────────────────
  // const fetchFeedbacks = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     const params = {
  //       page,
  //       limit: 5,
  //       sort: sortBy === "top" ? "top" : undefined,
  //       rating: filterRating || undefined,
  //     };
  //     const { data } = await getEventFeedback(eventId, params);
  //     setFeedbacks(data.data.feedbacks || []);
  //     setTotalReviews(data.data.totalReviews || 0);
  //     setAvgRating(parseFloat(data.data.averageRating) || 0);
  //     setBreakdown(data.data.ratingBreakdown || { 5:0, 4:0, 3:0, 2:0, 1:0 });
  //     setTotalPages(data.data.totalPages || 1);
  //   } catch {
  //     // silent — don't spam toasts on every page load
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [eventId, page, sortBy, filterRating]);

  // useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  // ── Check if logged-in student has already reviewed ──────────
  useEffect(() => {
    if (!isStudent) { setCheckingMine(false); return; }
    (async () => {
      try {
        const { data } = await getMyFeedback();
        const mine = (data.data || []).find(
          (f) => f.eventId?._id === eventId || f.eventId === eventId
        );
        setMyFeedback(mine || null);
        if (mine) {
          setFormRating(mine.rating);
          setFormComment(mine.comment || "");
        }
      } catch {
        // silent
      } finally {
        setCheckingMine(false);
      }
    })();
  }, [eventId, isStudent]);

  // ── Submit new feedback ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formRating < 1) {
      toast.error("Please select a rating");
      return;
    }
    try {
      setSubmitting(true);
      await submitFeedback({ eventId, rating: formRating, comment: formComment });
      toast.success("Feedback submitted!");
      // Refresh my feedback record
      const { data } = await getMyFeedback();
      const mine = (data.data || []).find(
        (f) => f.eventId?._id === eventId || f.eventId === eventId
      );
      setMyFeedback(mine || null);
      // fetchFeedbacks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Save edited feedback ──────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await updateFeedback(myFeedback._id, { rating: formRating, comment: formComment });
      toast.success("Feedback updated!");
      setEditMode(false);
      const { data } = await getMyFeedback();
      const mine = (data.data || []).find(
        (f) => f.eventId?._id === eventId || f.eventId === eventId
      );
      setMyFeedback(mine || null);
      if (mine) { setFormRating(mine.rating); setFormComment(mine.comment || ""); }
      // fetchFeedbacks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update feedback");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete own feedback ───────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm("Delete your feedback?")) return;
    try {
      await deleteFeedback(myFeedback._id);
      toast.success("Feedback deleted");
      setMyFeedback(null);
      setFormRating(5);
      setFormComment("");
      setEditMode(false);
      // fetchFeedbacks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  // ── Eligibility checks ────────────────────────────────────────
  const eventEnded       = eventStatus === "Past";
  const studentAttended  = registrationStatus?.status === "approved" && registrationStatus?.attended === true;
  const canSubmit        = isStudent && eventEnded && studentAttended && !myFeedback;

  // ── Filter toggle helper ──────────────────────────────────────
  // const toggleFilter = (r) => {
  //   setFilterRating(prev => prev === r ? null : r);
  //   setPage(1);
  // };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ── Rating Summary (only if reviews exist) ── */}
      

      {/* ── MY FEEDBACK: Already submitted ── */}
      {!checkingMine && myFeedback && !editMode && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-green-800">Your Feedback</p>
                {myFeedback.isEdited && (
                  <span className="text-[10px] font-semibold bg-green-100 text-green-600 px-2 py-0.5 rounded-full border border-green-200">
                    Edited
                  </span>
                )}
              </div>
              <Stars value={myFeedback.rating} size={15} />
              {myFeedback.comment && (
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{myFeedback.comment}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Submitted {new Date(myFeedback.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </p>
            </div>

            {/* Edit / Delete — only within 24h */}
            {(Date.now() - new Date(myFeedback.createdAt)) / 36e5 < 24 && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditMode(true)}
                  className="p-2 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-100 transition"
                  title="Edit"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 transition"
                  title="Delete"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── EDIT FORM ── */}
      {!checkingMine && myFeedback && editMode && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6"
        >
          <h3 className="text-sm font-bold text-gray-900 mb-4">Edit Your Feedback</h3>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Rating</label>
              <Stars value={formRating} interactive onChange={setFormRating} size={26} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Comment <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Share your experience..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{formComment.length}/1000</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-xl transition"
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => { setEditMode(false); setFormRating(myFeedback.rating); setFormComment(myFeedback.comment || ""); }}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ── SUBMIT FORM ── */}
      {!checkingMine && canSubmit && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-400 inline-block" />
            Share Your Experience
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Rating *</label>
              <Stars value={formRating} interactive onChange={setFormRating} size={28} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Comment <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="How was the event? What did you enjoy?"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{formComment.length}/1000</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold text-sm rounded-xl transition"
            >
              {submitting ? "Submitting…" : "Submit Feedback"}
            </button>
          </form>
        </motion.div>
      )}

      {/* ── Ineligibility notices ── */}
      {isStudent && !checkingMine && !myFeedback && !canSubmit && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex items-start gap-3"
        >
          <FiAlertCircle size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-500">
            {!eventEnded
              ? "Feedback can be submitted after the event ends."
              : !studentAttended
              ? "Only students who attended this event can leave feedback."
              : "You have already submitted feedback for this event."}
          </p>
        </motion.div>
      )}

      {/* Not logged in */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center"
        >
          <p className="text-sm font-semibold text-amber-800 mb-3">Sign in to leave feedback</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg transition"
          >
            Sign In
          </button>
        </motion.div>
      )}

      {/* ── Controls: sort ── */}
      

      {/* ── Feedback list ── */}
      
      {/* ── Pagination ── */}
      
    </div>
  );
}