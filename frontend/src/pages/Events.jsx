import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getEvents, getImageUrl } from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import EventFilters from "../components/EventFilters";
import {
  FiSearch,
  FiCalendar,
  FiMapPin,
  FiArrowRight,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiClock,
  FiTag,
} from "react-icons/fi";

const EVENTS_PER_PAGE = 6;
const CATEGORIES = ["All", "Tech", "Cultural", "Sports", "Workshop"];

/* ── Category styling ── */
const CAT_STYLES = {
  Tech:     { active: "bg-blue-600 text-white border-blue-600",     badge: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  Cultural: { active: "bg-purple-600 text-white border-purple-600", badge: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  Sports:   { active: "bg-green-600 text-white border-green-600",   badge: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500" },
  Workshop: { active: "bg-amber-500 text-white border-amber-500",   badge: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500" },
  All:      { active: "bg-blue-600 text-white border-blue-600",     badge: "bg-blue-50 text-blue-600",                      dot: "bg-blue-600" },
};

const STATUS_STYLES = {
  Upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  Ongoing:  "bg-green-50 text-green-700 border-green-200",
  Past:     "bg-gray-100 text-gray-500 border-gray-200",
};

/* ── Helpers ── */
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(date) {
  const d = new Date(date);
  // Only show time if it's not midnight (i.e., time was explicitly set)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateWithTime(date) {
  const d = new Date(date);
  const dateStr = formatDate(d);
  const timeStr = formatTime(d);
  return { dateStr, timeStr };
}

function getStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Past";
}

function toCardProps(event) {
  const { dateStr: startDateStr, timeStr: startTimeStr } = formatDateWithTime(event.startDate);
  const { dateStr: endDateStr, timeStr: endTimeStr }     = formatDateWithTime(event.endDate);

  const isSameDay = startDateStr === endDateStr;

  let dateDisplay;
  if (isSameDay) {
    dateDisplay = startDateStr;
  } else {
    dateDisplay = `${startDateStr} – ${endDateStr}`;
  }

  return {
    ...event,
    _id: event._id,
    dateDisplay,
    startDateStr,
    endDateStr,
    startTimeStr,
    endTimeStr,
    isSameDay,
    college: event.createdBy?.college || event.createdBy?.name || "Campus",
    imageUrl: event.image
      ? getImageUrl(event.image)
      : `https://placehold.co/800x500/e8edf7/2563eb?text=${encodeURIComponent(event.title)}`,
    status: getStatus(event.startDate, event.endDate),
  };
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function Events() {
  const { user } = useAuth();
  const isStudent = !user || user.role === "student";

  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Upcoming");
  const [sortBy, setSortBy] = useState("date-asc");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");

  /* ── Fetch ── */
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getEvents();
      setAllEvents(data);
    } catch {
      setError("Unable to load events. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);
  useEffect(() => { setPage(1); }, [search, activeCategory, statusFilter, sortBy, dateFrom, dateTo, timeFrom, timeTo]);

  const hasAdvancedFilters = statusFilter !== "All" || dateFrom || dateTo || timeFrom || timeTo;

  const clearAllFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setStatusFilter("All");
    setSortBy("date-asc");
    setDateFrom("");
    setDateTo("");
    setTimeFrom("");
    setTimeTo("");
  };

  /* ── Filter + Sort ── */
  const filtered = allEvents
    .filter((ev) => {
      const q = search.toLowerCase();
      const matchSearch =
        ev.title.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q) ||
        ev.createdBy?.college?.toLowerCase().includes(q);
      const matchCat = activeCategory === "All" || ev.category === activeCategory;
      const status = getStatus(ev.startDate, ev.endDate);
      const matchStatus = statusFilter === "All" || status === statusFilter;
      const matchFrom = !dateFrom || new Date(ev.startDate) >= new Date(dateFrom);
      const matchTo   = !dateTo   || new Date(ev.startDate) <= new Date(dateTo);
      // Time range filter: compare only HH:MM portion of startDate
      const evTime = `${String(new Date(ev.startDate).getHours()).padStart(2,"0")}:${String(new Date(ev.startDate).getMinutes()).padStart(2,"0")}`;
      const matchTimeFrom = !timeFrom || evTime >= timeFrom;
      const matchTimeTo   = !timeTo   || evTime <= timeTo;
      return matchSearch && matchCat && matchStatus && matchFrom && matchTo && matchTimeFrom && matchTimeTo;
    })
    .sort((a, b) => {
      if (sortBy === "date-asc")    return new Date(a.startDate) - new Date(b.startDate);
      if (sortBy === "date-desc")   return new Date(b.startDate) - new Date(a.startDate);
      if (sortBy === "time-asc") {
        // Sort by time of day (hour + minute only)
        const aTime = new Date(a.startDate).getHours() * 60 + new Date(a.startDate).getMinutes();
        const bTime = new Date(b.startDate).getHours() * 60 + new Date(b.startDate).getMinutes();
        return aTime - bTime;
      }
      if (sortBy === "time-desc") {
        const aTime = new Date(a.startDate).getHours() * 60 + new Date(a.startDate).getMinutes();
        const bTime = new Date(b.startDate).getHours() * 60 + new Date(b.startDate).getMinutes();
        return bTime - aTime;
      }
      if (sortBy === "title-asc")  return a.title.localeCompare(b.title);
      if (sortBy === "title-desc") return b.title.localeCompare(a.title);
      return 0;
    });

  /* ── Featured + Pagination ── */
  const featuredIndex = (() => {
    const activeIdx = filtered.findIndex((ev) => {
      const s = getStatus(ev.startDate, ev.endDate);
      return s === "Upcoming" || s === "Ongoing";
    });
    return activeIdx !== -1 ? activeIdx : (filtered.length > 0 ? 0 : -1);
  })();
  const featured = featuredIndex !== -1 ? toCardProps(filtered[featuredIndex]) : null;
  const rest = filtered.filter((_, i) => i !== featuredIndex).map(toCardProps);
  const totalPages = Math.max(1, Math.ceil(rest.length / EVENTS_PER_PAGE));
  const paginated = rest.slice((page - 1) * EVENTS_PER_PAGE, page * EVENTS_PER_PAGE);

  /* ── Stats ── */
  const upcomingCount = allEvents.filter((e) => new Date(e.startDate) > new Date()).length;
  const uniqueCategories = [...new Set(allEvents.map((e) => e.category))].length;

  /* ── Pagination range (smart: show max 5 page buttons) ── */
  const getPaginationRange = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    const range = [1];
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    range.push(totalPages);
    return range;
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 pt-16">

        {/* ══════════════════════════════
            HERO
        ══════════════════════════════ */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-px bg-blue-300" />
                <span className="text-blue-200 text-xs font-bold tracking-[0.2em] uppercase">
                  CampusEventHub
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                Campus Events,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
                  All in One Place
                </span>
              </h1>

              <p className="text-blue-200 mt-4 text-sm sm:text-base max-w-lg leading-relaxed">
                Discover hackathons, cultural fests, workshops, and sports events happening across every campus.
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mt-8 max-w-2xl relative"
            >
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by event name, location, or keyword..."
                className="w-full pl-11 pr-12 py-3.5 bg-white rounded-xl text-sm text-gray-800 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                >
                  <FiX size={15} />
                </button>
              )}
            </motion.div>

            {/* Stats */}
            {!loading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-6 mt-8"
              >
                <HeroStat value={allEvents.length} label="Total Events" />
                <div className="w-px h-7 bg-white/20" />
                <HeroStat value={upcomingCount} label="Upcoming" />
                <div className="w-px h-7 bg-white/20" />
                <HeroStat value={uniqueCategories} label="Categories" />
              </motion.div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════
            FILTER / CONTROLS BAR
        ══════════════════════════════ */}
        <EventFilters
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          timeFrom={timeFrom}
          setTimeFrom={setTimeFrom}
          timeTo={timeTo}
          setTimeTo={setTimeTo}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          search={search}
          clearAllFilters={clearAllFilters}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          hasAdvancedFilters={hasAdvancedFilters}
        />

        {/* ══════════════════════════════
            BODY
        ══════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

          {/* Loading */}
          {loading && <LoadingSkeleton viewMode={viewMode} />}

          {/* Error */}
          {!loading && error && <ErrorState message={error} onRetry={fetchEvents} />}

          {/* Upcoming-only hint banner */}
          {!loading && !error && statusFilter === "Upcoming" && filtered.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-xs text-blue-700">
              <span>📅 Showing upcoming events only.</span>
              <button
                onClick={() => setStatusFilter("All")}
                className="font-semibold underline underline-offset-2 hover:text-blue-900 transition-colors flex-shrink-0"
              >
                Show all events
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              onClear={clearAllFilters}
              isUpcomingDefault={statusFilter === "Upcoming"}
              onShowAll={() => setStatusFilter("All")}
            />
          )}

          {/* Content */}
          {!loading && !error && filtered.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeCategory}-${search}-${page}-${viewMode}-${sortBy}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* ── Featured event (page 1 only) ── */}
                {featured && page === 1 && (
                  <div className="mb-12">
                    <SectionLabel icon="✦" text="Featured Event" />
                    <FeaturedCard event={featured} isStudent={isStudent} />
                  </div>
                )}

                {/* ── Event grid / list ── */}
                {paginated.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-5">
                      <SectionLabel
                        icon={<FiGrid size={13} />}
                        text={activeCategory === "All" ? "All Events" : `${activeCategory} Events`}
                        count={rest.length}
                      />
                      {/* Page info */}
                      {totalPages > 1 && (
                        <span className="text-xs text-gray-400 font-medium">
                          Page {page} of {totalPages} · Showing {(page - 1) * EVENTS_PER_PAGE + 1}–{Math.min(page * EVENTS_PER_PAGE, rest.length)} of {rest.length}
                        </span>
                      )}
                    </div>

                    {viewMode === "grid" ? (
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {paginated.map((event, i) => (
                          <GridCard key={event._id} event={event} index={i} isStudent={isStudent} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {paginated.map((event, i) => (
                          <ListCard key={event._id} event={event} index={i} isStudent={isStudent} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3 mt-10">
                    {/* Page count label */}
                    <p className="text-xs text-gray-400">
                      Showing {(page - 1) * EVENTS_PER_PAGE + 1}–{Math.min(page * EVENTS_PER_PAGE, rest.length)} of {rest.length} events
                    </p>

                    <div className="flex items-center gap-2">
                      {/* Prev */}
                      <button
                        disabled={page === 1}
                        onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:border-blue-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft size={14} /> Prev
                      </button>

                      {/* Page numbers (smart range) */}
                      {getPaginationRange().map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="w-9 text-center text-gray-400 text-sm">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                              page === p
                                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-600 hover:text-blue-600"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}

                      {/* Next */}
                      <button
                        disabled={page === totalPages}
                        onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:border-blue-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Next <FiChevronRight size={14} />
                      </button>
                    </div>

                    {/* Jump to page (when many pages) */}
                    {totalPages > 7 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Jump to page:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          defaultValue={page}
                          key={page}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(e.target.value);
                              if (val >= 1 && val <= totalPages) {
                                setPage(val);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            }
                          }}
                          className="w-16 text-center px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-600 bg-white text-gray-700"
                        />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

/* ══════════════════════════════════════════════
   FEATURED CARD
══════════════════════════════════════════════ */
function FeaturedCard({ event, isStudent }) {
  const navigate = useNavigate();
  const catStyle = CAT_STYLES[event.category] || CAT_STYLES.All;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-lg shadow-gray-200/60 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300"
    >
      <div className="flex flex-col lg:flex-row min-h-[300px]">

        {/* Image */}
        <div className="relative lg:w-[50%] h-56 sm:h-72 lg:h-auto flex-shrink-0 overflow-hidden bg-gray-100">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${catStyle.badge}`}>
              {event.category}
            </span>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[event.status]}`}>
              {event.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-7 sm:p-9 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-blue-600 mb-3 flex items-center gap-1.5">
              <span className="w-4 h-px bg-blue-600" /> Featured Event
            </p>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight mb-3 group-hover:text-blue-600 transition-colors duration-300">
              {event.title}
            </h2>

            {event.description && (
              <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-6">
                {event.description}
              </p>
            )}

            <div className="flex flex-col gap-2.5 mb-7">
              {/* Date + time display */}
              <div className="flex flex-col gap-1">
                <MetaRow
                  icon={<FiCalendar size={13} />}
                  text={event.dateDisplay}
                />
                {(event.startTimeStr || event.endTimeStr) && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 ml-5">
                    <FiClock size={12} className="flex-shrink-0" />
                    <span className="font-semibold">
                      {event.startTimeStr}
                      {!event.isSameDay && event.endTimeStr ? ` – ${event.endTimeStr}` : ""}
                      {event.isSameDay && event.endTimeStr && event.startTimeStr !== event.endTimeStr
                        ? ` – ${event.endTimeStr}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
              {event.location && <MetaRow icon={<FiMapPin size={13} />} text={event.location} />}
              {event.college && <MetaRow icon={<FiTag size={13} />} text={event.college} />}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isStudent && (
              <button
                onClick={() => navigate(`/events/${event._id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-900/20 group/btn"
              >
                Register Now
                <FiArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            )}
            <button
              onClick={() => navigate(`/events/${event._id}`)}
              className="border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   GRID CARD
══════════════════════════════════════════════ */
function GridCard({ event, index, isStudent }) {
  const navigate = useNavigate();
  const catStyle = CAT_STYLES[event.category] || CAT_STYLES.All;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => navigate(`/events/${event._id}`)}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100 flex-shrink-0">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${catStyle.badge}`}>
            {event.category}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[event.status]}`}>
            {event.status}
          </span>
        </div>

        {/* Time badge on image if time exists */}
        {event.startTimeStr && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            <FiClock size={10} />
            {event.startTimeStr}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-1.5 mb-4">
          {/* Date row */}
          <MetaRow icon={<FiCalendar size={11} />} text={event.dateDisplay} small />
          {/* Time row (only if time set) */}
          {event.startTimeStr && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
              <FiClock size={11} className="flex-shrink-0" />
              <span>
                {event.startTimeStr}
                {event.endTimeStr && event.startTimeStr !== event.endTimeStr
                  ? ` – ${event.endTimeStr}`
                  : ""}
              </span>
            </div>
          )}
          {event.location && <MetaRow icon={<FiMapPin size={11} />} text={event.location} small />}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {event.college && (
            <span className="text-xs text-gray-400 font-medium truncate mr-2">{event.college}</span>
          )}
          {isStudent ? (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
              className="flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group/link"
            >
              Register <FiArrowRight size={11} className="group-hover/link:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
              className="flex-shrink-0 text-xs font-semibold text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              View Details <FiArrowRight size={11} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   LIST CARD
══════════════════════════════════════════════ */
function ListCard({ event, index, isStudent }) {
  const navigate = useNavigate();
  const catStyle = CAT_STYLES[event.category] || CAT_STYLES.All;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      onClick={() => navigate(`/events/${event._id}`)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-blue-100/30 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      <div className="flex gap-0">
        {/* Image thumbnail */}
        <div className="relative w-40 sm:w-52 flex-shrink-0 overflow-hidden bg-gray-100 hidden sm:block">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Time overlay on image */}
          {event.startTimeStr && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <FiClock size={9} />
              {event.startTimeStr}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${catStyle.badge}`}>
                {event.category}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[event.status]}`}>
                {event.status}
              </span>
            </div>

            <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-blue-600 transition-colors truncate">
              {event.title}
            </h3>

            {event.description && (
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-3">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* Date */}
              <MetaRow icon={<FiCalendar size={11} />} text={event.dateDisplay} small />
              {/* Time — shown inline with blue tint */}
              {event.startTimeStr && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                  <FiClock size={11} className="flex-shrink-0" />
                  <span>
                    {event.startTimeStr}
                    {event.endTimeStr && event.startTimeStr !== event.endTimeStr
                      ? ` – ${event.endTimeStr}`
                      : ""}
                  </span>
                </div>
              )}
              {event.location && <MetaRow icon={<FiMapPin size={11} />} text={event.location} small />}
              {event.college && <MetaRow icon={<FiTag size={11} />} text={event.college} small />}
            </div>
            {isStudent ? (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
                className="flex-shrink-0 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Register <FiArrowRight size={11} />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
                className="flex-shrink-0 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-blue-600 hover:text-blue-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                View Details <FiArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   HELPERS / MICRO-COMPONENTS
══════════════════════════════════════════════ */
function MetaRow({ icon, text, small }) {
  return (
    <div className={`flex items-center gap-1.5 text-gray-500 ${small ? "text-xs" : "text-sm"}`}>
      <span className="text-blue-600 flex-shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-extrabold text-white tabular-nums">{value}</span>
      <span className="text-xs text-blue-200 font-medium">{label}</span>
    </div>
  );
}

function SectionLabel({ icon, text, count }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-blue-600 text-xs">{icon}</span>
      <p className="text-xs font-extrabold tracking-[0.15em] uppercase text-gray-400">
        {text}
        {count !== undefined && (
          <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal">
            ({count} event{count !== 1 ? "s" : ""})
          </span>
        )}
      </p>
    </div>
  );
}

/* ── Loading Skeleton ── */
function LoadingSkeleton({ viewMode }) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse h-28 flex">
            <div className="w-52 bg-gray-100 flex-shrink-0 hidden sm:block" />
            <div className="flex-1 p-5 space-y-3">
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 animate-pulse mb-12 h-64 lg:h-72" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse shadow-sm">
            <div className="h-44 bg-gray-100" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-px bg-gray-100 my-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Error State ── */
function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5 shadow-sm">
        <FiAlertCircle size={28} className="text-red-400" />
      </div>
      <p className="text-gray-800 font-bold text-base mb-1">{message}</p>
      <p className="text-gray-400 text-sm mb-7">Check your connection and try again.</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-900/20"
      >
        <FiRefreshCw size={13} /> Try Again
      </button>
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ onClear, isUpcomingDefault, onShowAll }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5 text-4xl">
        🗓️
      </div>
      <p className="text-gray-900 font-extrabold text-xl mb-1">
        {isUpcomingDefault ? "No upcoming events" : "No events found"}
      </p>
      <p className="text-gray-400 text-sm mb-7 max-w-xs">
        {isUpcomingDefault
          ? "There are no upcoming events right now. Check back later or view past events."
          : "Try a different keyword or browse all categories."}
      </p>
      <div className="flex items-center gap-3">
        {isUpcomingDefault && (
          <button
            onClick={onShowAll}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-900/20"
          >
            Show all events
          </button>
        )}
        <button
          onClick={onClear}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isUpcomingDefault
              ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-900/20"
          }`}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}