// FeedbackSection.jsx
// Drop this file in your components or inline it at the bottom of AdminDashboard.jsx
// It is a self-contained section — no props needed (uses auth token from API interceptor)

import { useState, useEffect, useCallback } from "react";
import { FiStar, FiChevronLeft, FiChevronRight, FiSearch, FiX, FiBarChart2, FiAlertCircle } from "react-icons/fi";
import { getAdminFeedbackAnalytics, getEventFeedback, getEventFeedbackAnalytics } from "../services/api";

/* ── Star renderer ── */
function Stars({ value, size = 14 }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          size={size}
          className={s <= value ? "fill-amber-400 text-amber-400" : "text-gray-200"}
        />
      ))}
    </span>
  );
}

/* ── Small rating bar ── */
function RatingBar({ count, total, star }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-3 text-right">{star}</span>
      <FiStar size={10} className="fill-amber-400 text-amber-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
    </div>
  );
}

export default function FeedbackSection() {
  // ── Overall analytics ─────────────────────────────────────────
  const [analytics,        setAnalytics]        = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // ── Selected event drill-down ─────────────────────────────────
  const [selectedEvent,    setSelectedEvent]    = useState(null); // { eventId, eventTitle }
  const [eventAnalytics,   setEventAnalytics]   = useState(null);
  const [feedbacks,        setFeedbacks]        = useState([]);
  const [fbTotal,          setFbTotal]          = useState(0);
  const [fbPage,           setFbPage]           = useState(1);
  const [fbTotalPages,     setFbTotalPages]     = useState(1);
  const [fbLoading,        setFbLoading]        = useState(false);
  const [fbSort,           setFbSort]           = useState("latest");
  const [fbRatingFilter,   setFbRatingFilter]   = useState(null);
  const [fbSearch,         setFbSearch]         = useState("");

  // ── Event list search ─────────────────────────────────────────
  const [eventSearch, setEventSearch] = useState("");

  // ── Load overall analytics ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadingAnalytics(true);
        const { data } = await getAdminFeedbackAnalytics();
        setAnalytics(data.data);
      } catch {
        // silent
      } finally {
        setLoadingAnalytics(false);
      }
    })();
  }, []);

  // ── Load event feedback when an event is selected ─────────────
  const loadEventFeedback = useCallback(async () => {
    if (!selectedEvent) return;
    setFbLoading(true);
    try {
      const [analyticRes, feedbackRes] = await Promise.all([
        getEventFeedbackAnalytics(selectedEvent.eventId),
        getEventFeedback(selectedEvent.eventId, {
          page: fbPage,
          limit: 5,
          sort: fbSort === "top" ? "top" : undefined,
          rating: fbRatingFilter || undefined,
        }),
      ]);
      setEventAnalytics(analyticRes.data.data);
      setFeedbacks(feedbackRes.data.data.feedbacks || []);
      setFbTotal(feedbackRes.data.data.totalReviews || 0);
      setFbTotalPages(feedbackRes.data.data.totalPages || 1);
    } catch {
      // silent
    } finally {
      setFbLoading(false);
    }
  }, [selectedEvent, fbPage, fbSort, fbRatingFilter]);

  useEffect(() => { loadEventFeedback(); }, [loadEventFeedback]);

  // Reset page when filters change
  useEffect(() => { setFbPage(1); }, [fbSort, fbRatingFilter]);

  // ── Filtered event list ───────────────────────────────────────
  const perEvent = analytics?.perEvent || [];
  const filteredEvents = perEvent.filter((e) =>
    e.eventTitle?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */

  // ── DRILL-DOWN VIEW ──────────────────────────────────────────
  if (selectedEvent) {
    const bd = eventAnalytics?.ratingBreakdown || {};
    const totalForEvent = eventAnalytics?.totalFeedbacks || 0;

    // Client-side name search filter on fetched feedbacks
    const visibleFeedbacks = fbSearch
      ? feedbacks.filter((f) =>
          f.userId?.name?.toLowerCase().includes(fbSearch.toLowerCase())
        )
      : feedbacks;

    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => { setSelectedEvent(null); setEventAnalytics(null); setFeedbacks([]); setFbPage(1); setFbRatingFilter(null); setFbSearch(""); }}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 mb-5 transition"
        >
          <FiChevronLeft size={16} /> Back to all events
        </button>

        <h3 className="text-base font-bold text-gray-800 mb-1 truncate">{selectedEvent.eventTitle}</h3>
        <p className="text-xs text-gray-400 mb-5">Feedback received for this event</p>

        {/* Event stats cards */}
        {eventAnalytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{totalForEvent}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Responses</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{eventAnalytics.averageRating.toFixed(1)}</p>
              <div className="flex justify-center mt-0.5">
                <Stars value={Math.round(eventAnalytics.averageRating)} size={12} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Average Rating</p>
            </div>
            {/* Rating breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">Breakdown</p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((r) => (
                  <RatingBar key={r} star={r} count={bd[r] || 0} total={totalForEvent} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          {/* Name search */}
          <div className="relative flex-1">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search by student name…"
              value={fbSearch}
              onChange={(e) => setFbSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-gray-50"
            />
            {fbSearch && (
              <button onClick={() => setFbSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex gap-1">
            {[{ key: "latest", label: "Latest" }, { key: "top", label: "Top" }].map((s) => (
              <button
                key={s.key}
                onClick={() => setFbSort(s.key)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  fbSort === s.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <div className="flex gap-1">
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => setFbRatingFilter(fbRatingFilter === r ? null : r)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition ${
                  fbRatingFilter === r
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {r}★
              </button>
            ))}
          </div>
        </div>

        {/* Feedback rows */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {fbLoading ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-2/4" />
                  </div>
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : visibleFeedbacks.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FiStar size={20} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No feedback found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {visibleFeedbacks.map((fb, i) => (
                <div key={fb._id || i} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {fb.userId?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{fb.userId?.name || "Student"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Stars value={fb.rating} size={11} />
                          <span className="text-xs text-gray-400">
                            {new Date(fb.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                          {fb.isEdited && <span className="text-[10px] text-gray-400 italic">(edited)</span>}
                        </div>
                      </div>
                    </div>

                    {/* Rating badge */}
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
                      fb.rating >= 4
                        ? "bg-green-50 text-green-700 border-green-200"
                        : fb.rating === 3
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-600 border-red-200"
                    }`}>
                      {fb.rating}/5
                    </span>
                  </div>

                  {fb.comment && (
                    <p className="text-sm text-gray-500 mt-2.5 leading-relaxed pl-12">{fb.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {fbTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setFbPage((p) => Math.max(1, p - 1))}
              disabled={fbPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <FiChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-gray-500">{fbPage} / {fbTotalPages}</span>
            <button
              onClick={() => setFbPage((p) => Math.min(fbTotalPages, p + 1))}
              disabled={fbPage === fbTotalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── OVERVIEW: all-events list ────────────────────────────────
  return (
    <div>
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800">Feedback & Ratings</h3>
        <p className="text-sm text-gray-400 mt-0.5">Student feedback across all your events</p>
      </div>

      {/* Overall stats */}
      {loadingAnalytics ? (
        <div className="grid grid-cols-2 gap-3 mb-6 animate-pulse">
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{analytics.overall.totalFeedbacks}</p>
            <p className="text-xs text-gray-400 mt-1">Total Responses</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{analytics.overall.averageRating.toFixed(1)}</p>
            <div className="flex justify-center mt-1">
              <Stars value={Math.round(analytics.overall.averageRating)} size={13} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Overall Rating</p>
          </div>
        </div>
      ) : null}

      {/* Per-event list */}
      <div className="mb-3">
        <div className="relative">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search events…"
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-gray-50"
          />
          {eventSearch && (
            <button onClick={() => setEventSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <FiX size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loadingAnalytics ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-2/5" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FiBarChart2 size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              {eventSearch ? "No events match your search" : "No feedback received yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredEvents.map((ev) => (
              <button
                key={ev.eventId}
                onClick={() => setSelectedEvent({ eventId: ev.eventId, eventTitle: ev.eventTitle })}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors text-left"
              >
                {/* Event info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{ev.eventTitle}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ev.totalFeedbacks} response{ev.totalFeedbacks !== 1 ? "s" : ""}
                    {ev.eventEndDate && ` · Ended ${new Date(ev.eventEndDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}`}
                  </p>
                </div>

                {/* Rating badge */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-sm font-bold text-amber-600">{ev.averageRating.toFixed(1)}</span>
                  <FiStar size={13} className="fill-amber-400 text-amber-400" />
                  <FiChevronRight size={14} className="text-gray-300 ml-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
