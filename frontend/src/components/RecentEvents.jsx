import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents, getImageUrl } from "../services/api";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const CATEGORY_STYLES = {
  Tech:     "bg-sky-50 text-sky-700",
  Workshop: "bg-amber-50 text-amber-700",
  Cultural: "bg-rose-50 text-rose-700",
  Sports:   "bg-violet-50 text-violet-700",
};

const STATUS_STYLES = {
  Upcoming: "bg-blue-50 text-blue-600",
  Ongoing:  "bg-green-50 text-green-600",
  Past:     "bg-gray-100 text-gray-500",
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
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function RecentEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getEvents();
        // Sort by most recently created, take top 5
        const sorted = [...data]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setEvents(sorted);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
        <h3 className="font-semibold text-gray-800">Recent Events</h3>
        <button
          onClick={() => navigate("/events")}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No events found</p>
        ) : (
          events.map((event) => {
            const status   = getStatus(event.startDate, event.endDate);
            const catStyle = CATEGORY_STYLES[event.category] || "bg-gray-100 text-gray-600";
            const stStyle  = STATUS_STYLES[status];
            const timeStr  = formatTime(event.startDate);

            return (
              <div
                key={event._id}
                onClick={() => navigate(`/events/${event._id}`)}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition group"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {event.image ? (
                    <img
                      src={getImageUrl(event.image)}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={10} className="text-blue-400" />
                      {formatDate(event.startDate)}
                    </span>
                    {timeStr && (
                      <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                        <Clock size={10} />
                        {timeStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catStyle}`}>
                    {event.category}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stStyle}`}>
                    {status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}