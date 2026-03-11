import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiGrid, FiList } from "react-icons/fi";
import { Calendar, Clock, MapPin, X, SlidersHorizontal, Check, AlertTriangle } from "lucide-react";

import {
  getMyRegistrations,
  cancelRegistration,
  getImageUrl,
} from "../services/api";

import EventCard from "../components/EventCard";

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

const STATUS_STYLES = {
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const CATEGORY_STYLES = {
  Tech:     "bg-sky-50 text-sky-700",
  Workshop: "bg-amber-50 text-amber-700",
  Cultural: "bg-rose-50 text-rose-700",
  Sports:   "bg-violet-50 text-violet-700",
};

const STATUSES   = ["all", "approved", "pending", "rejected"];
const CATEGORIES = [
  { label: "All",      value: "all" },
  { label: "Tech",     value: "Tech" },
  { label: "Workshop", value: "Workshop" },
  { label: "Cultural", value: "Cultural" },
  { label: "Sports",   value: "Sports" },
];

export default function MyRegistrations() {
  const navigate = useNavigate();

  const [registrations, setRegistrations]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [viewMode, setViewMode]             = useState("grid");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sheetOpen, setSheetOpen]           = useState(false);
  const [confirmId, setConfirmId]           = useState(null); // id to cancel, null = modal closed
  const [cancelling, setCancelling]         = useState(false);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0);

  /* ---------------- FETCH ---------------- */
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const { data } = await getMyRegistrations();
      setRegistrations(data);
    } catch {
      toast.error("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegistrations(); }, []);

  /* ---------------- CANCEL ---------------- */
  const handleCancel = (id) => setConfirmId(id);   // just opens modal

  const confirmCancel = async () => {
    try {
      setCancelling(true);
      await cancelRegistration(confirmId);
      toast.success("Registration cancelled");
      setRegistrations((prev) => prev.filter((r) => r._id !== confirmId));
      setConfirmId(null);
    } catch {
      toast.error("Failed to cancel registration");
    } finally {
      setCancelling(false);
    }
  };

  /* ---------------- FILTER ---------------- */
  const filteredRegistrations = registrations.filter((reg) => {
    const event = reg.eventId;
    if (!event) return false;
    const statusMatch   = statusFilter   === "all" || reg.status     === statusFilter;
    const categoryMatch = categoryFilter === "all" || event.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse shadow-sm">
            <div className="h-48 bg-gray-100" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---------------- EMPTY ---------------- */
  if (registrations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">You haven't registered for any events yet</p>
        <button
          onClick={() => navigate("/events")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Browse Events
        </button>
      </div>
    );
  }

  /* ─── shared filter content ─── */
  const FilterContent = () => (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-sm capitalize transition ${
                statusFilter === status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1 rounded-md text-sm transition ${
                categoryFilter === cat.value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>

      {/* ── CANCEL CONFIRM MODAL ── */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !cancelling && setConfirmId(null)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
            </div>
            {/* Text */}
            <h4 className="text-center text-lg font-semibold text-gray-900 mb-1">
              Cancel Registration?
            </h4>
            <p className="text-center text-sm text-gray-500 mb-6">
              This action cannot be undone. You may not be able to re-register if spots are full.
            </p>
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cancelling
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : "Yes, Cancel"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ROW ── */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-3">My Registrations</h3>
        <div className="flex items-center justify-between gap-2">

          {/* Filters button — mobile only */}
          <button
            onClick={() => setSheetOpen(true)}
            className="md:hidden relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="hidden md:block" />

          {/* Grid / List toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FiGrid size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FiList size={16} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

        </div>
      </div>

      {/* ── FILTER BAR — desktop only ── */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 mr-1 whitespace-nowrap">Status:</span>
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md text-sm capitalize transition ${
                  statusFilter === status ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 mr-1 whitespace-nowrap">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3 py-1 rounded-md text-sm transition ${
                  categoryFilter === cat.value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SHEET — mobile only ── */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl md:hidden">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-base">Filters</span>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-5">
              <FilterContent />
            </div>
            <div className="px-5 pb-6 pt-2">
              <button
                onClick={() => setSheetOpen(false)}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Check size={16} /> Apply Filters
              </button>
            </div>
          </div>
        </>
      )}

      {/* NO RESULTS */}
      {filteredRegistrations.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No registrations match the selected filters.
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === "grid" && filteredRegistrations.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegistrations.map((reg, i) => {
            const event = reg.eventId;
            if (!event) return null;
            return (
              <EventCard
                key={reg._id}
                event={{ ...event, image: getImageUrl(event.image) }}
                index={i}
                registration={reg}
                onCancel={handleCancel}
              />
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && filteredRegistrations.length > 0 && (
        <div className="space-y-3">
          {filteredRegistrations.map((reg) => {
            const event = reg.eventId;
            if (!event) return null;

            const startDate  = event.startDate ? formatDate(event.startDate) : null;
            const timeStr    = event.startDate ? formatTime(event.startDate) : null;
            const endTimeStr = event.endDate   ? formatTime(event.endDate)   : null;
            const isSameDay  = event.startDate && event.endDate
              ? new Date(event.startDate).toDateString() === new Date(event.endDate).toDateString()
              : true;
            const catStyle = CATEGORY_STYLES[event.category] || "bg-gray-100 text-gray-600";

            return (
              <div
                key={reg._id}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row">
                  <div
                    className="relative h-44 sm:h-auto sm:w-36 w-full flex-shrink-0 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/events/${event._id}`)}
                  >
                    <img
                      src={getImageUrl(event.image)}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-transparent to-black/10" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 flex-1 min-w-0">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/events/${event._id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${catStyle}`}>
                          {event.category}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[reg.status] || STATUS_STYLES.pending}`}>
                          {reg.status}
                        </span>
                      </div>

                      <h4 className="font-semibold text-gray-900 text-base truncate group-hover:text-blue-600 transition-colors mb-2">
                        {event.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {startDate && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={11} className="text-blue-400 flex-shrink-0" />
                            {startDate}
                            {!isSameDay && event.endDate ? ` – ${formatDate(event.endDate)}` : ""}
                          </span>
                        )}
                        {timeStr && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                            <Clock size={11} className="flex-shrink-0" />
                            {timeStr}{isSameDay && endTimeStr && endTimeStr !== timeStr ? ` – ${endTimeStr}` : ""}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={11} className="text-blue-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{event.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {reg.status !== "rejected" && (
                      <button
                        onClick={() => handleCancel(reg._id)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-200 w-fit"
                      >
                        <X size={12} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}