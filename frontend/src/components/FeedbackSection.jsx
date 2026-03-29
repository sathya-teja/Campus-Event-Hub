// FeedbackSection.jsx — Fixed image resolution

import { useState, useEffect, useCallback } from "react";
import {
  FiStar,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiX,
  FiBarChart2,
  FiAlertCircle,
  FiMessageSquare,
  FiTrendingUp,
  FiAward,
  FiFilter,
  FiArrowLeft,
  FiCalendar,
  FiZap,
  FiMapPin,
  FiClock,
  FiUsers,
  FiImage,
} from "react-icons/fi";
import {
  getAdminFeedbackAnalytics,
  getEventFeedback,
  getEventFeedbackAnalytics,
  getEventById,
  BASE_URL,
} from "../services/api";

// Custom image resolver that matches backend storage pattern
function resolveImage(rawPath) {
  if (!rawPath) return null;
  if (rawPath.startsWith("http")) return rawPath;
  // Remove leading slash: "/uploads/foo.jpg" → "uploads/foo.jpg"
  const p = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
  if (p.startsWith("uploads/")) {
    return `${BASE_URL}/${p}`;
  }
  // Filename only (profile images saved without folder prefix)
  return `${BASE_URL}/uploads/${p}`;
}

/* ─────────────────────────────────────────────────
   Scoped animation + style overrides
───────────────────────────────────────────────── */
const feedbackStyles = `
  @keyframes fb-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fb-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fb-bar-fill {
    from { width: 0%; }
    to   { width: var(--bar-w); }
  }
  @keyframes fb-scale-in {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes fb-star-pop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.35); }
    70%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  @keyframes fb-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes fb-banner-in {
    from { opacity: 0; transform: scale(1.04); }
    to   { opacity: 1; transform: scale(1); }
  }

  .fb-fade-up  { animation: fb-fade-up  0.4s cubic-bezier(.22,.68,0,1) both; }
  .fb-fade-in  { animation: fb-fade-in  0.3s ease both; }
  .fb-scale-in { animation: fb-scale-in 0.35s cubic-bezier(.22,.68,0,1.05) both; }
  .fb-banner-in { animation: fb-banner-in 0.5s cubic-bezier(.22,.68,0,1) both; }

  .fb-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .fb-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.08);
  }

  .fb-event-row {
    transition: background 0.15s ease, transform 0.15s ease;
  }
  .fb-event-row:hover {
    background: rgba(239,246,255,0.7);
    transform: translateX(2px);
  }

  .fb-review-row {
    transition: all 0.2s ease;
    border-radius: 1rem;
  }
  .fb-review-row:hover {
    background: #f9fafb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  }

  .fb-star-active {
    animation: fb-star-pop 0.3s ease forwards;
  }

  .fb-shimmer-line {
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: fb-shimmer 1.4s infinite;
    border-radius: 6px;
  }

  .fb-bar-animated {
    animation: fb-bar-fill 0.8s cubic-bezier(.22,.68,0,1) both;
    width: var(--bar-w);
  }

  .fb-rating-pill {
    transition: all 0.15s ease;
  }
  .fb-rating-pill:hover {
    transform: scale(1.06);
  }
  .fb-rating-pill.active {
    animation: fb-scale-in 0.2s cubic-bezier(.22,.68,0,1.1) both;
  }

  .fb-event-banner {
    position: relative;
    width: 100%;
    border-radius: 20px;
    overflow: hidden;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }
  .fb-event-banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    animation: fb-banner-in 0.5s cubic-bezier(.22,.68,0,1) both;
  }
  .fb-event-banner .fb-banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0.08) 0%,
      rgba(0,0,0,0.55) 70%,
      rgba(0,0,0,0.75) 100%
    );
  }
  .fb-event-banner .fb-banner-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px 24px 22px;
  }

  @media (max-width: 640px) {
    .fb-event-banner .fb-banner-content {
      padding: 16px 18px 18px;
    }
    .fb-event-banner .fb-banner-content h2 {
      font-size: 1.25rem;
    }
    .fb-review-row {
      padding: 1rem;
    }
  }
`;

/* ─────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────── */

function Stars({ value, size = 14, animate = false }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          size={size}
          className={`transition-all duration-150 ${
            s <= value
              ? "fill-amber-400 text-amber-400"
              : "text-gray-200"
          } ${animate && s <= value ? "fb-star-active" : ""}`}
          style={{ animationDelay: animate ? `${(s - 1) * 60}ms` : "0ms" }}
        />
      ))}
    </span>
  );
}

function RatingBar({ count, total, star, delay = 0 }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const color =
    star >= 4 ? "#10b981" : star === 3 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center gap-2.5 group">
      <span className="text-xs font-semibold text-gray-400 w-3 text-right tabular-nums">
        {star}
      </span>
      <FiStar size={10} className="fill-amber-400 text-amber-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full fb-bar-animated"
          style={{
            "--bar-w": `${pct}%`,
            background: color,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-400 w-5 text-right tabular-nums">
        {count}
      </span>
    </div>
  );
}

function AverageRatingRing({ value, total }) {
  const pct = (value / 5) * 100;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 1s cubic-bezier(.22,.68,0,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 leading-none">
            {value.toFixed(1)}
          </span>
          <span className="text-[10px] font-semibold text-gray-400 mt-0.5">/ 5.0</span>
        </div>
      </div>
      <Stars value={Math.round(value)} size={12} animate />
      <p className="text-xs text-gray-400 font-medium mt-0.5">
        {total} review{total !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function SkeletonRow({ avatar = false }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      {avatar && <div className="w-9 h-9 rounded-full fb-shimmer-line flex-shrink-0" />}
      <div className="flex-1 space-y-2">
        <div className="h-3 fb-shimmer-line w-1/3" />
        <div className="h-2.5 fb-shimmer-line w-1/2" />
      </div>
      <div className="h-6 w-20 fb-shimmer-line rounded-full flex-shrink-0" />
    </div>
  );
}

function ratingColor(r) {
  if (r >= 4.5) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
  if (r >= 3.5) return { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500"    };
  if (r >= 2.5) return { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400"   };
  return               { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-400"     };
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ─────────────────────────────────────────────────
   Event Image Banner
───────────────────────────────────────────────── */
function EventBanner({ event, title, totalReviews, avgRating }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = event?.image ? resolveImage(event.image) : null;
  const hasImage = imgSrc && !imgError;

  return (
    <div
      className="fb-event-banner fb-banner-in"
      style={{ height: hasImage ? 220 : "auto" }}
    >
      {hasImage ? (
        <>
          <img
            src={imgSrc}
            alt={title}
            onError={() => setImgError(true)}
          />
          <div className="fb-banner-overlay" />
          <div className="fb-banner-content">
            {avgRating > 0 && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  <FiStar size={10} className="fill-white" />
                  {avgRating.toFixed(1)} · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold text-white leading-snug tracking-tight drop-shadow">
              {title}
            </h2>
            {event && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                {event.location && (
                  <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                    <FiMapPin size={11} />
                    {event.location}
                  </span>
                )}
                {event.startDate && (
                  <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                    <FiCalendar size={11} />
                    {fmtDate(event.startDate)}
                    {event.endDate && event.endDate !== event.startDate
                      ? ` – ${fmtDate(event.endDate)}`
                      : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[20px] p-6 sm:p-7 relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          {avgRating > 0 && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                <FiStar size={10} className="fill-white" />
                {avgRating.toFixed(1)} · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          <h2 className="text-xl font-bold text-white leading-snug tracking-tight">
            {title}
          </h2>

          {event && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {event.location && (
                <span className="flex items-center gap-1 text-white/75 text-xs font-medium">
                  <FiMapPin size={11} />
                  {event.location}
                </span>
              )}
              {event.startDate && (
                <span className="flex items-center gap-1 text-white/75 text-xs font-medium">
                  <FiCalendar size={11} />
                  {fmtDate(event.startDate)}
                  {event.endDate && event.endDate !== event.startDate
                    ? ` – ${fmtDate(event.endDate)}`
                    : ""}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   UserAvatar
───────────────────────────────────────────────── */
function UserAvatar({ user, colorClass }) {
  const [imgErr, setImgErr] = useState(false);
  const src = user?.profileImage ? resolveImage(user.profileImage) : null;

  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={user?.name || ""}
        onError={() => setImgErr(true)}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
      />
    );
  }

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm ring-2 ring-white`}>
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   EventThumb
───────────────────────────────────────────────── */
function EventThumb({ src }) {
  const [err, setErr] = useState(false);
  
  if (src && !err) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setErr(true)}
        className="w-full h-full object-cover"
      />
    );
  }
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <FiImage size={16} className="text-blue-300 mb-0.5" />
      <span className="text-[9px] text-blue-300 font-medium">No img</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────── */
export default function FeedbackSection() {
  const [analytics,        setAnalytics]        = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [eventImagesMap, setEventImagesMap] = useState({});
  const [selectedEvent,    setSelectedEvent]    = useState(null);
  const [fullEvent,        setFullEvent]        = useState(null);
  const [eventAnalytics,   setEventAnalytics]   = useState(null);
  const [feedbacks,        setFeedbacks]        = useState([]);
  const [fbTotal,          setFbTotal]          = useState(0);
  const [fbPage,           setFbPage]           = useState(1);
  const [fbTotalPages,     setFbTotalPages]     = useState(1);
  const [fbLoading,        setFbLoading]        = useState(false);
  const [fbSort,           setFbSort]           = useState("latest");
  const [fbRatingFilter,   setFbRatingFilter]   = useState(null);
  const [fbSearch,         setFbSearch]         = useState("");
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingAnalytics(true);
        const { data } = await getAdminFeedbackAnalytics();
        const analyticsData = data.data;
        setAnalytics(analyticsData);

        const events = analyticsData?.perEvent || [];
        const entries = await Promise.all(
          events.map(async (ev) => {
            try {
              const res = await getEventById(ev.eventId);
              // Backend returns event directly: res.status(200).json(event)
              // res.data IS the event — no nested .data wrapper
              const evt = res.data;
              const img = evt?.image || null;
              return [ev.eventId, img ? resolveImage(img) : null];
            } catch (e) {
              return [ev.eventId, null];
            }
          })
        );
        const map = Object.fromEntries(entries);
        setEventImagesMap(map);
      } catch (err) {
      } finally {
        setLoadingAnalytics(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEvent?.eventId) { setFullEvent(null); return; }
    (async () => {
      try {
        const { data } = await getEventById(selectedEvent.eventId);
        const eventData = data.data || data;
        if (eventData?.image) {
          eventData.image = resolveImage(eventData.image);
        }
        setFullEvent(eventData);
      } catch {
        setFullEvent(null);
      }
    })();
  }, [selectedEvent?.eventId]);

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
  useEffect(() => { setFbPage(1); }, [fbSort, fbRatingFilter]);

  const perEvent = analytics?.perEvent || [];
  const filteredEvents = perEvent.filter((e) =>
    e.eventTitle?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  if (selectedEvent) {
    const bd = eventAnalytics?.ratingBreakdown || {};
    const totalForEvent = eventAnalytics?.totalFeedbacks || 0;
    const avgForEvent   = eventAnalytics?.averageRating   || 0;

    const visibleFeedbacks = fbSearch
      ? feedbacks.filter((f) =>
          f.userId?.name?.toLowerCase().includes(fbSearch.toLowerCase())
        )
      : feedbacks;

    return (
      <>
        <style>{feedbackStyles}</style>
        <div className="space-y-5 px-2 sm:px-0">
          <div className="fb-fade-up" style={{ animationDelay: "0ms" }}>
            <button
              onClick={() => {
                setSelectedEvent(null);
                setFullEvent(null);
                setEventAnalytics(null);
                setFeedbacks([]);
                setFbPage(1);
                setFbRatingFilter(null);
                setFbSearch("");
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-blue-600 transition-colors group"
            >
              <FiArrowLeft
                size={15}
                className="transition-transform group-hover:-translate-x-1"
              />
              All Events
            </button>
          </div>

          <div className="fb-fade-up relative" style={{ animationDelay: "40ms" }}>
            <EventBanner
              event={fullEvent}
              title={selectedEvent.eventTitle}
              totalReviews={totalForEvent}
              avgRating={avgForEvent}
            />
          </div>

          {eventAnalytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fb-fade-up" style={{ animationDelay: "80ms" }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center fb-card">
                <AverageRatingRing value={avgForEvent} total={totalForEvent} />
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm p-5 flex flex-col justify-between fb-card">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-3">
                  <FiMessageSquare size={16} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 fb-fade-up" style={{ animationDelay: "120ms" }}>
                    {totalForEvent}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                    Total Responses
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 fb-card">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiBarChart2 size={12} /> Breakdown
                </p>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((r, i) => (
                    <RatingBar
                      key={r}
                      star={r}
                      count={bd[r] || 0}
                      total={totalForEvent}
                      delay={i * 80}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-white rounded-2xl border border-gray-100 fb-shimmer-line" />
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center fb-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="relative flex-1">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by student name…"
                value={fbSearch}
                onChange={(e) => setFbSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 placeholder-gray-400"
              />
              {fbSearch && (
                <button onClick={() => setFbSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX size={13} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
              {[
                { key: "latest", label: "Latest", icon: <FiCalendar size={11} /> },
                { key: "top",    label: "Top",    icon: <FiTrendingUp size={11} /> },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFbSort(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    fbSort === s.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <FiFilter size={12} className="text-gray-400 flex-shrink-0 mr-0.5" />
              {[5, 4, 3, 2, 1].map((r) => {
                const active = fbRatingFilter === r;
                return (
                  <button
                    key={r}
                    onClick={() => setFbRatingFilter(active ? null : r)}
                    className={`fb-rating-pill px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      active
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm fb-rating-pill active"
                        : "bg-white text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-600"
                    }`}
                  >
                    {r}★
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fb-fade-up" style={{ animationDelay: "160ms" }}>
            {fbLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full fb-shimmer-line" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 fb-shimmer-line w-1/3" />
                        <div className="h-2.5 fb-shimmer-line w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleFeedbacks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FiStar size={22} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No feedback found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {fbSearch || fbRatingFilter
                    ? "Try adjusting your filters"
                    : "No reviews submitted for this event yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleFeedbacks.map((fb, i) => {
                  const rc = ratingColor(fb.rating);
                  const avatarColors = [
                    "from-blue-100 to-indigo-100 text-blue-700 ring-blue-100",
                    "from-violet-100 to-purple-100 text-violet-700 ring-violet-100",
                    "from-emerald-100 to-teal-100 text-emerald-700 ring-emerald-100",
                    "from-rose-100 to-pink-100 text-rose-700 ring-rose-100",
                    "from-amber-100 to-orange-100 text-amber-700 ring-amber-100",
                  ];
                  const avatarColor = avatarColors[i % avatarColors.length];

                  return (
                    <div
                      key={fb._id || i}
                      className="fb-review-row bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm transition-all"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={fb.userId} colorClass={avatarColor} />
                          <div>
                            <p className="text-base font-semibold text-gray-800 leading-tight">
                              {fb.userId?.name || "Student"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Stars value={fb.rating} size={12} />
                              <span className="text-xs text-gray-400">
                                {new Date(fb.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              {fb.isEdited && (
                                <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full">
                                  edited
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="self-start sm:self-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${rc.bg} ${rc.text} ${rc.border}`}>
                            <span className={`w-2 h-2 rounded-full ${rc.dot}`} />
                            {fb.rating}/5
                          </span>
                        </div>
                      </div>

                      {fb.comment && (
                        <div className="mt-4 pl-0 sm:pl-12">
                          <div className="relative bg-gray-50/90 rounded-xl p-4 border border-gray-100">
                            <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-50/90 border-l border-t border-gray-100 transform rotate-45 hidden sm:block" />
                            <p className="text-sm text-gray-600 leading-relaxed italic">
                              "{fb.comment}"
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 pl-0 sm:pl-12">
                        <span className="flex items-center gap-1">
                          <FiClock size={10} />
                          {new Date(fb.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {fbTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 fb-fade-up" style={{ animationDelay: "200ms" }}>
              <p className="text-sm text-gray-400">
                Page <span className="font-semibold text-gray-600">{fbPage}</span> of <span className="font-semibold text-gray-600">{fbTotalPages}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFbPage((p) => Math.max(1, p - 1))}
                  disabled={fbPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FiChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, fbTotalPages) }, (_, i) => {
                  let pn;
                  if (fbTotalPages <= 5) pn = i + 1;
                  else if (fbPage <= 3) pn = i + 1;
                  else if (fbPage >= fbTotalPages - 2) pn = fbTotalPages - 4 + i;
                  else pn = fbPage - 2 + i;
                  return (
                    <button
                      key={pn}
                      onClick={() => setFbPage(pn)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition ${
                        fbPage === pn
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pn}
                    </button>
                  );
                })}
                <button
                  onClick={() => setFbPage((p) => Math.min(fbTotalPages, p + 1))}
                  disabled={fbPage === fbTotalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{feedbackStyles}</style>
      <div className="space-y-5 px-2 sm:px-0">
        <div className="fb-fade-up" style={{ animationDelay: "0ms" }}>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Feedback & Ratings</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Student sentiment across all your events
          </p>
        </div>

        {loadingAnalytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 fb-shimmer-line" />
            ))}
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fb-fade-up" style={{ animationDelay: "60ms" }}>
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm p-5 fb-card">
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-blue-200/30" />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-3">
                  <FiMessageSquare size={16} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.overall.totalFeedbacks}
                </p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                  Total Responses
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 shadow-sm p-5 fb-card">
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-amber-200/30" />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm mb-3">
                  <FiStar size={16} />
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.overall.averageRating.toFixed(1)}
                  </p>
                  <span className="text-sm text-gray-400 font-medium">/ 5.0</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Stars value={Math.round(analytics.overall.averageRating)} size={12} animate />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Avg Rating
                  </span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 shadow-sm p-5 fb-card">
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-emerald-200/30" />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm mb-3">
                  <FiAward size={16} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {perEvent.length}
                </p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                  Events Reviewed
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="fb-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search events…"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 placeholder-gray-400"
              />
              {eventSearch && (
                <button onClick={() => setEventSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Event</span>
            <span className="text-right w-24">Responses</span>
            <span className="text-right w-28">Avg Rating</span>
            <span className="w-5" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingAnalytics ? (
              <div className="divide-y divide-gray-50">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FiBarChart2 size={22} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">
                  {eventSearch ? "No events match your search" : "No feedback received yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {eventSearch
                    ? "Try a different search term"
                    : "Feedback will appear here once students submit reviews"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredEvents.map((ev, i) => {
                  const rc = ratingColor(ev.averageRating);
                  return (
                    <button
                      key={ev.eventId}
                      onClick={() =>
                        setSelectedEvent({
                          eventId: ev.eventId,
                          eventTitle: ev.eventTitle,
                        })
                      }
                      className="fb-event-row w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left fb-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex-shrink-0">
                        <EventThumb src={eventImagesMap[ev.eventId]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                          {ev.eventTitle}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                          <span>{ev.totalFeedbacks} response{ev.totalFeedbacks !== 1 ? "s" : ""}</span>
                          {ev.eventEndDate && (
                            <span>
                              · Ended {new Date(ev.eventEndDate).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center justify-end w-24">
                        <span className="text-sm font-bold text-gray-600">
                          {ev.totalFeedbacks}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center justify-end w-28 gap-2">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${rc.bg} ${rc.text} ${rc.border}`}>
                          <FiStar size={10} className="fill-current flex-shrink-0" />
                          {ev.averageRating.toFixed(1)}
                        </span>
                      </div>

                      <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0">
                        <span className="text-sm font-bold text-amber-600">
                          {ev.averageRating.toFixed(1)}
                        </span>
                        <FiStar size={12} className="fill-amber-400 text-amber-400" />
                      </div>

                      <FiChevronRight size={14} className="text-gray-300 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}