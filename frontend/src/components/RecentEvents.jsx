import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents, getImageUrl } from "../services/api";
import { Calendar, Clock, ArrowRight } from "lucide-react";

// ── Existing logic — untouched ────────────────────────────────────────────────
const CATEGORY_STYLES = {
  Tech:     { pill: "bg-sky-100 text-sky-700",    dot: "bg-sky-500"     },
  Workshop: { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500"  },
  Cultural: { pill: "bg-rose-100 text-rose-700",   dot: "bg-rose-500"   },
  Sports:   { pill: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
};

const STATUS_CONFIG = {
  Upcoming: { pill: "bg-blue-100 text-blue-700",   dot: "bg-blue-500",   pulse: false },
  Ongoing:  { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", pulse: true  },
  Past:     { pill: "bg-gray-100 text-gray-500",   dot: "bg-gray-400",   pulse: false },
};

function getStatus(startDate, endDate) {
  const now = new Date();
  if (now < new Date(startDate)) return "Upcoming";
  if (now <= new Date(endDate))  return "Ongoing";
  return "Past";
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(date) {
  const d = new Date(date);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function RecentEvents() {
  const navigate = useNavigate();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getEvents();
        const sorted = [...data]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setEvents(sorted);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-white/90 shadow-sm overflow-hidden h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-emerald-500" />
          <h3 className="font-bold text-gray-800 text-sm tracking-wide">Recent Events</h3>
        </div>
        <button
          onClick={() => navigate("/events")}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all duration-200"
        >
          View all <ArrowRight size={11} />
        </button>
      </div>

      {/* ── List ── */}
      <div className="flex-1 divide-y divide-gray-50/80">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <div className="h-4 w-14 bg-gray-100 rounded-full" />
                <div className="h-4 w-12 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Calendar size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-400">No events yet</p>
          </div>
        ) : (
          events.map((event, i) => {
            const status    = getStatus(event.startDate, event.endDate);
            const catCfg    = CATEGORY_STYLES[event.category] || { pill: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
            const stCfg     = STATUS_CONFIG[status];
            const timeStr   = formatTime(event.startDate);

            return (
              <div
                key={event._id}
                onClick={() => navigate(`/events/${event._id}`)}
                className="re-row flex items-center gap-3 px-5 py-3 hover:bg-blue-50/40 cursor-pointer transition-all duration-200 group"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 to-slate-100 shadow-sm">
                  {event.image ? (
                    <img
                      src={getImageUrl(event.image)}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar size={16} className="text-blue-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors duration-200">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={10} className="text-blue-400 flex-shrink-0" />
                      {formatDate(event.startDate)}
                    </span>
                    {timeStr && (
                      <span className="flex items-center gap-1 text-xs text-blue-500 font-semibold">
                        <Clock size={10} />
                        {timeStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* Category */}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${catCfg.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${catCfg.dot}`} />
                    {event.category}
                  </span>
                  {/* Status */}
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${stCfg.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stCfg.dot} ${stCfg.pulse ? "animate-pulse" : ""}`} />
                    {status}
                  </span>
                </div>

                {/* Row arrow */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 flex-shrink-0">
                  <ArrowRight size={13} className="text-blue-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes re-row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .re-row {
          animation: re-row-in 0.3s cubic-bezier(.22,.68,0,1) both;
        }
      `}</style>
    </div>
  );
}