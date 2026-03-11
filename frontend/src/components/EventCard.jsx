import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { Calendar, Clock, MapPin } from "lucide-react";

const categoryColors = {
  Technical:        { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
  Workshop:         { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  Cultural:         { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500" },
  Entrepreneurship: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Sports:           { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500" },
  Tech:             { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
};

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

export default function EventCard({ event, index = 0, registration, onCancel }) {
  const navigate = useNavigate();
  const colors = categoryColors[event.category] || categoryColors["Technical"];

  const handleNavigate = () => {
    if (event._id) navigate(`/events/${event._id}`);
  };

  const getStatusStyle = (status) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const startDate  = event.startDate ? formatDate(event.startDate) : event.date ?? null;
  const timeStr    = event.startDate ? formatTime(event.startDate) : null;
  const endTimeStr = event.endDate   ? formatTime(event.endDate)   : null;
  const isSameDay  = event.startDate && event.endDate
    ? new Date(event.startDate).toDateString() === new Date(event.endDate).toDateString()
    : true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleNavigate}
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-48 flex-shrink-0">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Category badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} shadow-sm backdrop-blur-sm`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {event.category}
        </div>

        {/* Registration status badge */}
        {registration && (
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusStyle(registration.status)}`}>
              {registration.status}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-base text-slate-900 tracking-tight mb-3 group-hover:text-sky-700 transition-colors duration-200 line-clamp-2">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Meta — date / time / location */}
        <div className="mt-auto flex flex-col gap-1.5 mb-4">
          {/* Date */}
          {startDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3 h-3 text-sky-500 flex-shrink-0" />
              <span>
                {startDate}
                {!isSameDay && event.endDate ? ` – ${formatDate(event.endDate)}` : ""}
              </span>
            </div>
          )}

          {/* Time */}
          {timeStr && (
            <div className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>
                {timeStr}
                {isSameDay && endTimeStr && endTimeStr !== timeStr ? ` – ${endTimeStr}` : ""}
              </span>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="w-3 h-3 text-sky-500 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {/* College fallback */}
          {event.college && !event.location && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="w-3 h-3 text-sky-500 flex-shrink-0" />
              <span className="truncate">{event.college}</span>
            </div>
          )}
        </div>

        {/* Cancel button — only in registration context */}
        {registration && registration.status !== "rejected" && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(registration._id); }}
            className="mb-3 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition w-fit"
          >
            Cancel Registration
          </button>
        )}

        {/* Divider */}
        <div className="my-2 h-px bg-slate-100" />

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
          className="flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors group/btn w-fit"
        >
          View Details
          <FiArrowRight
            size={14}
            className="translate-x-0 group-hover/btn:translate-x-1 transition-transform duration-200"
          />
        </button>
      </div>
    </motion.div>
  );
}