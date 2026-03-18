import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents, getImageUrl } from "../services/api";
import { Calendar, ArrowRight, Zap } from "lucide-react";

// ── Existing logic — untouched ────────────────────────────────────────────────
const CATEGORY_STYLES = {
  Tech:     { accent: "#0ea5e9", bg: "bg-sky-50",     text: "text-sky-600"     },
  Workshop: { accent: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-600"   },
  Cultural: { accent: "#f43f5e", bg: "bg-rose-50",    text: "text-rose-600"    },
  Sports:   { accent: "#8b5cf6", bg: "bg-violet-50",  text: "text-violet-600"  },
};

const STATUS_CONFIG = {
  Upcoming: { label: "Upcoming", color: "text-blue-500",    dot: "bg-blue-400",    pulse: false },
  Ongoing:  { label: "Live",     color: "text-emerald-500", dot: "bg-emerald-400", pulse: true  },
  Past:     { label: "Past",     color: "text-gray-400",    dot: "bg-gray-300",    pulse: false },
};

function getStatus(startDate, endDate) {
  const now = new Date();
  if (now < new Date(startDate)) return "Upcoming";
  if (now <= new Date(endDate))  return "Ongoing";
  return "Past";
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function RecentEvents() {
  const navigate = useNavigate();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getEvents();
        const sorted = [...data]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setEvents(sorted);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-white/90 shadow-sm overflow-hidden h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-emerald-500" />
          <h3 className="font-bold text-gray-800 text-sm tracking-wide">Recent Events</h3>
        </div>
        <button
          onClick={() => navigate("/events")}
          className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors duration-150"
        >
          View all <ArrowRight size={11} />
        </button>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
                </div>
                <div className="h-3 w-14 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center">
              <Calendar size={18} className="text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400">No events yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50/80">
            {events.map((event, i) => {
              const status  = getStatus(event.startDate, event.endDate);
              const catCfg  = CATEGORY_STYLES[event.category] || { accent: "#94a3b8", bg: "bg-slate-50", text: "text-slate-500" };
              const stCfg   = STATUS_CONFIG[status];

              return (
                <div
                  key={event._id}
                  onClick={() => navigate(`/events/${event._id}`)}
                  className="re-row group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 cursor-pointer transition-colors duration-150"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Thumbnail with category-colored ring */}
                  <div
                    className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-offset-1 transition-transform duration-200 group-hover:scale-105"
                    style={{ ringColor: catCfg.accent, boxShadow: `0 0 0 2px ${catCfg.accent}30` }}
                  >
                    {event.image ? (
                      <img
                        src={getImageUrl(event.image)}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${catCfg.accent}15` }}
                      >
                        <Calendar size={14} style={{ color: catCfg.accent }} />
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate leading-snug group-hover:text-blue-600 transition-colors duration-150">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${catCfg.text}`}>
                        {event.category}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Calendar size={9} className="flex-shrink-0" />
                        {formatDate(event.startDate)}
                      </span>
                    </div>
                  </div>

                  {/* Status — dot + label only */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stCfg.dot} ${stCfg.pulse ? "animate-pulse" : ""}`} />
                    <span className={`text-[10px] font-semibold ${stCfg.color}`}>{stCfg.label}</span>
                  </div>

                  {/* Hover arrow */}
                  <div className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150 flex-shrink-0">
                    <ArrowRight size={12} className="text-blue-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes re-row-in {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .re-row {
          animation: re-row-in 0.25s cubic-bezier(.22,.68,0,1) both;
        }
      `}</style>
    </div>
  );
}