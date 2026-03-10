// AdminDashboard.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { getMyEvents, createEvent, updateEvent, deleteEvent, getImageUrl, getEventRegistrations, approveRegistration, rejectRegistration, getAllUsers } from "../services/api";
import Navbar from "../components/Navbar";
import StatsCard from "../components/StatsCard";
import Sidebar from "../components/Sidebar";
import EventCard from "../components/EventCard";
import {
  FiUsers,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiUser,
  FiCalendar,
  FiHome,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiAlertCircle,
  FiUploadCloud,
  FiType,
  FiMapPin,
  FiCheckSquare,
  FiSave,
  FiTag,
  FiInfo,
} from "react-icons/fi";

const EVENTS_PER_PAGE = 6;
const CATEGORIES = ["Tech", "Cultural", "Sports", "Workshop"];

const CATEGORY_MAP = {
  Tech: "Technical",
  Technical: "Technical",
  Cultural: "Cultural",
  Sports: "Sports",
  Workshop: "Workshop",
};

const CATEGORY_COLORS = {
  Tech: "bg-blue-100 text-blue-700 border-blue-200",
  Cultural: "bg-purple-100 text-purple-700 border-purple-200",
  Sports: "bg-green-100 text-green-700 border-green-200",
  Workshop: "bg-amber-100 text-amber-700 border-amber-200",
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function hasTime(dateStr) {
  // Returns true if the stored date has a non-midnight time
  const d = new Date(dateStr);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

function getEventStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Past";
}

function toCardProps(event) {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  const dateStr = start === end ? start : `${start} – ${end}`;
  return {
    title: event.title,
    description: event.description,
    category: CATEGORY_MAP[event.category] || "Technical",
    date: dateStr,
    location: event.location,
    college: event.createdBy?.college || event.createdBy?.name || "",
    image: event.image
      ? getImageUrl(event.image)
      : "https://placehold.co/600x400?text=No+Image",
  };
}

function inputCls(error) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 ${
    error ? "border-red-300 bg-red-50 focus:ring-red-100" : "border-gray-200 bg-white"
  }`;
}

/* ================================================
   ROOT DASHBOARD
================================================ */
export default function AdminDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "overview"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar toggleSidebar={() => setMobileOpen(true)} />

      <div className="flex flex-1 pt-16 overflow-hidden">
        <Sidebar
          title="Admin Panel"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          items={[
            { key: "overview", label: "Overview", icon: <FiHome /> },
            { key: "users", label: "User Management", icon: <FiUsers /> },
            { key: "events", label: "Event Management", icon: <FiCalendar /> },
            { key: "registrations", label: "Registrations", icon: <FiCheckCircle /> },
            { key: "logs", label: "Admin Logs", icon: <FiFileText /> },
          ]}
        />

        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 transition-all duration-300 ${
            collapsed ? "md:ml-[68px]" : "md:ml-64"
          }`}
        >
          <div className="p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800">
              Admin Dashboard
            </h2>

            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatsCard title="Total Events" value="24" color="#16a34a" icon={<FiFileText size={22} />} />
                  <StatsCard title="Active Users" value="320" color="#2563eb" icon={<FiUsers size={22} />} />
                  <StatsCard title="Registrations" value="890" color="#f59e0b" icon={<FiCheckCircle size={22} />} />
                  <StatsCard title="Pending Reviews" value="6" color="#dc2626" icon={<FiAlertTriangle size={22} />} />
                </div>
                <OverviewSection />
              </>
            )}

            {activeTab === "users" && <UserManagement />}
            {activeTab === "events" && <EventManagement />}
            {activeTab === "registrations" && <Registrations />}
            {activeTab === "logs" && <AdminLogs />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================================================
   EVENT MANAGEMENT
================================================ */
function EventManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [editTarget, setEditTarget] = useState(null);

  const [showCreate, setShowCreate] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getMyEvents();
      setEvents(data);
    } catch {
      setError("Failed to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setDeleteError("");
      await deleteEvent(deleteTarget._id);
      setEvents((prev) => prev.filter((e) => e._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete event");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = events
    .filter((ev) => {
      const matchSearch =
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        ev.location?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "All" || ev.category === categoryFilter;
      const status = getEventStatus(ev.startDate, ev.endDate);
      const matchStatus = statusFilter === "All" || status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // latest first

  const totalPages = Math.max(1, Math.ceil(filtered.length / EVENTS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * EVENTS_PER_PAGE,
    page * EVENTS_PER_PAGE
  );

  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Event Management</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${filtered.length} event${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <FiPlus size={16} />
          Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FiFilter size={14} className="text-gray-400 flex-shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
          >
            {["All", "Tech", "Cultural", "Sports", "Workshop"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
        >
          {["All", "Upcoming", "Ongoing", "Past"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <EventsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEvents} />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasFilters={search || categoryFilter !== "All" || statusFilter !== "All"}
          onClear={() => { setSearch(""); setCategoryFilter("All"); setStatusFilter("All"); }}
          onCreate={() => setShowCreate(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginated.map((event, i) => (
              <AdminEventCard
                key={event._id}
                event={event}
                index={i}
                onEdit={() => setEditTarget(event)}
                onDelete={() => { setDeleteTarget(event); setDeleteError(""); }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      page === p ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          event={deleteTarget}
          loading={deleteLoading}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Edit Event Modal */}
      {editTarget && (
        <EditEventModal
          event={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            fetchEvents(); // refetch so createdBy is fully populated
            setEditTarget(null);
          }}
        />
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            fetchEvents(); // refetch so createdBy is fully populated
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

/* ================================================
   CREATE EVENT MODAL
================================================ */
function CreateEventModal({ onClose, onCreated }) {
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "18:00",
    location: "",
    description: "",
    maxParticipants: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: "Image must be under 5MB" }));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, image: "" }));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!formData.title.trim() || formData.title.trim().length < 3)
      e.title = "Title must be at least 3 characters";
    if (!formData.category) e.category = "Please select a category";
    if (!formData.location.trim()) e.location = "Location is required";
    if (!formData.startDate) e.startDate = "Start date is required";
    if (!formData.startTime) e.startTime = "Start time is required";
    if (!formData.endDate) e.endDate = "End date is required";
    if (!formData.endTime) e.endTime = "End time is required";
    if (formData.startDate && formData.endDate) {
      const start = new Date(`${formData.startDate}T${formData.startTime || "00:00"}`);
      const end   = new Date(`${formData.endDate}T${formData.endTime || "00:00"}`);
      if (start >= end) e.endTime = "End must be after start date & time";
    }
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.maxParticipants || isNaN(formData.maxParticipants) || Number(formData.maxParticipants) < 1)
      e.maxParticipants = "Must be at least 1";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) { setApiError("Unauthorized. Please login again."); return; }

    // Combine date + time into ISO datetime strings
    const payload = new FormData();
    const { startDate, startTime, endDate, endTime, ...rest } = formData;
    payload.append("startDate", new Date(`${startDate}T${startTime}`).toISOString());
    payload.append("endDate",   new Date(`${endDate}T${endTime}`).toISOString());
    Object.entries(rest).forEach(([key, val]) => payload.append(key, val));
    if (imageFile) payload.append("image", imageFile);

    try {
      setLoading(true);
      setApiError("");
      const { data } = await createEvent(payload);
      setSuccess(true);
      setTimeout(() => onCreated(data.event), 1200);
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Create New Event</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details to publish a new event</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckSquare size={30} className="text-green-600" />
            </div>
            <p className="text-base font-semibold text-gray-800">Event Created!</p>
            <p className="text-sm text-gray-400">The new event has been added to your list.</p>
          </div>
        ) : (
          <>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <form id="create-event-form" onSubmit={handleSubmit} noValidate>

                {apiError && (
                  <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2">
                    <FiAlertCircle size={15} className="flex-shrink-0" />
                    {apiError}
                  </div>
                )}

                {/* Basic Info */}
                <ModalSection icon={<FiType size={14} />} title="Basic Information">
                  <div className="grid grid-cols-1 gap-4">
                    <Field label="Event Title" error={errors.title}>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Inter-College Hackathon 2025"
                        className={inputCls(errors.title)}
                      />
                    </Field>

                    <Field label="Category" error={errors.category}>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormData((p) => ({ ...p, category: cat }));
                              setErrors((p) => ({ ...p, category: "" }));
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              formData.category === cat
                                ? CATEGORY_COLORS[cat] + " ring-2 ring-offset-1 ring-current"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </ModalSection>

                {/* Date & Location */}
                <ModalSection icon={<FiCalendar size={14} />} title="Date & Location">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Start Date + Time */}
                    <Field label="Start Date" error={errors.startDate}>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split("T")[0]}
                        className={inputCls(errors.startDate)}
                      />
                    </Field>
                    <Field label="Start Time" error={errors.startTime}>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className={inputCls(errors.startTime)}
                      />
                    </Field>
                    {/* End Date + Time */}
                    <Field label="End Date" error={errors.endDate}>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        min={formData.startDate || new Date().toISOString().split("T")[0]}
                        className={inputCls(errors.endDate)}
                      />
                    </Field>
                    <Field label="End Time" error={errors.endTime}>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className={inputCls(errors.endTime)}
                      />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Location" error={errors.location}>
                        <div className="relative">
                          <FiMapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Main Auditorium, Block A"
                            className={`${inputCls(errors.location)} pl-9`}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>
                </ModalSection>

                {/* Description */}
                <ModalSection icon={<FiFileText size={14} />} title="Description">
                  <Field label="Event Description" error={errors.description}>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the event, agenda, speakers, prizes..."
                      className={`${inputCls(errors.description)} resize-none`}
                    />
                  </Field>
                </ModalSection>

                {/* Max Participants */}
                <ModalSection icon={<FiUsers size={14} />} title="Capacity">
                  <Field label="Max Participants" error={errors.maxParticipants}>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={formData.maxParticipants}
                      onChange={handleChange}
                      min={1}
                      placeholder="e.g. 100"
                      className={inputCls(errors.maxParticipants)}
                    />
                  </Field>
                </ModalSection>

                {/* Banner Image */}
                <ModalSection icon={<FiUploadCloud size={14} />} title="Event Banner" optional>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 group h-36">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={removeImage}
                          className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg"
                        >
                          <FiX size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="modalImageUpload"
                      className={`flex items-center gap-4 border-2 border-dashed rounded-xl px-5 py-4 cursor-pointer transition-colors ${
                        errors.image
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200 bg-gray-50 hover:border-blue-600 hover:bg-blue-50/40"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <FiUploadCloud size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Click to upload banner</p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP — max 5MB</p>
                      </div>
                    </label>
                  )}
                  <input
                    id="modalImageUpload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {errors.image && <p className="text-xs text-red-500 mt-1.5">{errors.image}</p>}
                </ModalSection>

              </form>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-event-form"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[130px] justify-center"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <><FiPlus size={15} /> Create Event</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Modal Section ── */
function ModalSection({ icon, title, optional, children }) {
  return (
    <div className="px-6 py-5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-600">{icon}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        {optional && <span className="text-xs text-gray-400">(optional)</span>}
      </div>
      {children}
    </div>
  );
}

/* ── Field ── */
function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}


/* ================================================
   EDIT EVENT MODAL
================================================ */
function EditEventModal({ event, onClose, onUpdated }) {
  const fileInputRef = useRef(null);

  const toDateInput = (dateStr) =>
    dateStr ? new Date(dateStr).toISOString().split("T")[0] : "";

  const toTimeInput = (dateStr) => {
    if (!dateStr) return "09:00";
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const [formData, setFormData] = useState({
    title: event.title || "",
    category: event.category || "",
    startDate: toDateInput(event.startDate),
    startTime: toTimeInput(event.startDate),
    endDate: toDateInput(event.endDate),
    endTime: toTimeInput(event.endDate),
    location: event.location || "",
    description: event.description || "",
    maxParticipants: event.maxParticipants || "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    event.image ? getImageUrl(event.image) : null
  );
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: "Image must be under 5MB" }));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, image: "" }));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!formData.title.trim() || formData.title.trim().length < 3)
      e.title = "Title must be at least 3 characters";
    if (!formData.category) e.category = "Please select a category";
    if (!formData.location.trim()) e.location = "Location is required";
    if (!formData.startDate) e.startDate = "Start date is required";
    if (!formData.startTime) e.startTime = "Start time is required";
    if (!formData.endDate) e.endDate = "End date is required";
    if (!formData.endTime) e.endTime = "End time is required";
    if (formData.startDate && formData.endDate) {
      const start = new Date(`${formData.startDate}T${formData.startTime || "00:00"}`);
      const end   = new Date(`${formData.endDate}T${formData.endTime || "00:00"}`);
      if (start >= end) e.endTime = "End must be after start date & time";
    }
    if (!formData.description.trim()) e.description = "Description is required";
    if (!formData.maxParticipants || isNaN(formData.maxParticipants) || Number(formData.maxParticipants) < 1)
      e.maxParticipants = "Must be at least 1";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) { setApiError("Unauthorized. Please login again."); return; }

    // Combine date + time into ISO datetime strings
    const payload = new FormData();
    const { startDate, startTime, endDate, endTime, ...rest } = formData;
    payload.append("startDate", new Date(`${startDate}T${startTime}`).toISOString());
    payload.append("endDate",   new Date(`${endDate}T${endTime}`).toISOString());
    Object.entries(rest).forEach(([key, val]) => payload.append(key, val));
    if (imageFile) payload.append("image", imageFile);

    try {
      setLoading(true);
      setApiError("");
      const { data } = await updateEvent(event._id, payload);
      setSuccess(true);
      setTimeout(() => onUpdated(data), 1200);
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FiEdit2 size={15} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Edit Event</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckSquare size={30} className="text-green-600" />
            </div>
            <p className="text-base font-semibold text-gray-800">Event Updated!</p>
            <p className="text-sm text-gray-400">Your changes have been saved successfully.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <form id="edit-event-form" onSubmit={handleSubmit} noValidate>

                {apiError && (
                  <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2">
                    <FiAlertCircle size={15} className="flex-shrink-0" />
                    {apiError}
                  </div>
                )}

                {/* Basic Info */}
                <ModalSection icon={<FiType size={14} />} title="Basic Information">
                  <div className="grid grid-cols-1 gap-4">
                    <Field label="Event Title" error={errors.title}>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Inter-College Hackathon 2025"
                        className={inputCls(errors.title)}
                      />
                    </Field>

                    <Field label="Category" error={errors.category}>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormData((p) => ({ ...p, category: cat }));
                              setErrors((p) => ({ ...p, category: "" }));
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              formData.category === cat
                                ? CATEGORY_COLORS[cat] + " ring-2 ring-offset-1 ring-current"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </ModalSection>

                {/* Date & Location */}
                <ModalSection icon={<FiCalendar size={14} />} title="Date & Location">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Start Date" error={errors.startDate}>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className={inputCls(errors.startDate)}
                      />
                    </Field>
                    <Field label="Start Time" error={errors.startTime}>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className={inputCls(errors.startTime)}
                      />
                    </Field>
                    <Field label="End Date" error={errors.endDate}>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        min={formData.startDate}
                        className={inputCls(errors.endDate)}
                      />
                    </Field>
                    <Field label="End Time" error={errors.endTime}>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className={inputCls(errors.endTime)}
                      />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Location" error={errors.location}>
                        <div className="relative">
                          <FiMapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Main Auditorium, Block A"
                            className={`${inputCls(errors.location)} pl-9`}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>
                </ModalSection>

                {/* Description */}
                <ModalSection icon={<FiFileText size={14} />} title="Description">
                  <Field label="Event Description" error={errors.description}>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the event, agenda, speakers, prizes..."
                      className={`${inputCls(errors.description)} resize-none`}
                    />
                  </Field>
                </ModalSection>

                {/* Max Participants */}
                <ModalSection icon={<FiUsers size={14} />} title="Capacity">
                  <Field label="Max Participants" error={errors.maxParticipants}>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={formData.maxParticipants}
                      onChange={handleChange}
                      min={1}
                      placeholder="e.g. 100"
                      className={inputCls(errors.maxParticipants)}
                    />
                  </Field>
                </ModalSection>

                {/* Banner Image */}
                <ModalSection icon={<FiUploadCloud size={14} />} title="Event Banner" optional>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 group h-36">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={removeImage}
                          className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg"
                        >
                          <FiX size={12} /> Change Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="editModalImageUpload"
                      className="flex items-center gap-4 border-2 border-dashed rounded-xl px-5 py-4 cursor-pointer transition-colors border-gray-200 bg-gray-50 hover:border-blue-600 hover:bg-blue-50/40"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <FiUploadCloud size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Click to upload banner</p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP — max 5MB</p>
                      </div>
                    </label>
                  )}
                  <input
                    id="editModalImageUpload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {errors.image && <p className="text-xs text-red-500 mt-1.5">{errors.image}</p>}
                </ModalSection>

              </form>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-event-form"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <><FiSave size={15} /> Save Changes</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================
   ADMIN EVENT CARD
================================================ */
function AdminEventCard({ event, onEdit, onDelete }) {
  const status = getEventStatus(event.startDate, event.endDate);
  const cardProps = toCardProps(event);

  const statusColors = {
    Upcoming: "bg-blue-50 text-blue-600 border-blue-100",
    Ongoing:  "bg-green-50 text-green-600 border-green-100",
    Past:     "bg-gray-100 text-gray-500 border-gray-200",
  };

  const categoryColor = CATEGORY_COLORS[event.category] || "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Image */}
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        <img
          src={cardProps.image}
          alt={cardProps.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = "https://placehold.co/600x400?text=No+Image"; }}
        />
        {/* Status badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
          {status}
        </span>
        {/* Category badge */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${categoryColor}`}>
          {event.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">
          {event.title}
        </h4>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
          {event.description}
        </p>

        <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3 mb-3">
          <div className="flex items-center gap-2">
            <FiCalendar size={12} className="flex-shrink-0 text-gray-400" />
            <span>
              {formatDate(event.startDate)}
              {hasTime(event.startDate) && (
                <span className="text-blue-500 ml-1">{formatTime(event.startDate)}</span>
              )}
              {formatDate(event.startDate) !== formatDate(event.endDate) && (
                <>
                  {" – "}
                  {formatDate(event.endDate)}
                  {hasTime(event.endDate) && (
                    <span className="text-blue-500 ml-1">{formatTime(event.endDate)}</span>
                  )}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FiMapPin size={12} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{event.location}</span>
          </div>
          {cardProps.college && (
            <div className="flex items-center gap-2">
              <FiUser size={12} className="flex-shrink-0 text-gray-400" />
              <span className="truncate">{cardProps.college}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <FiEdit2 size={13} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-100 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <FiTrash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Modal ── */
function DeleteModal({ event, loading, error, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <FiAlertCircle size={22} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Delete Event</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-700">"{event.title}"</span>?
              This action cannot be undone.
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
            ) : (
              <><FiTrash2 size={14} /> Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse shadow-sm">
          <div className="h-48 bg-gray-100" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-px bg-gray-100 my-3" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-white border border-red-100 rounded-xl p-10 text-center">
      <FiAlertCircle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-gray-700 font-medium">{message}</p>
      <button onClick={onRetry} className="mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
        Retry
      </button>
    </div>
  );
}

function EmptyState({ hasFilters, onClear, onCreate }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
      <FiCalendar size={36} className="text-gray-300 mx-auto mb-3" />
      <p className="text-gray-700 font-semibold text-base">
        {hasFilters ? "No events match your filters" : "No events yet"}
      </p>
      <p className="text-sm text-gray-400 mt-1 mb-5">
        {hasFilters ? "Try adjusting the search or filters." : "Create your first event to get started."}
      </p>
      {hasFilters ? (
        <button onClick={onClear} className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
          Clear Filters
        </button>
      ) : (
        <button onClick={onCreate} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          + Create Event
        </button>
      )}
    </div>
  );
}

/* ================================================
   OVERVIEW
================================================ */
function OverviewSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
      {/* Recent Events */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FiCalendar size={15} />
            </div>
            <h3 className="font-semibold text-gray-800">Recent Events</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">This month</span>
        </div>
        <div className="divide-y divide-gray-50">
          <EventItem title="Inter-College Hackathon 2024" participants={127} category="Tech" />
          <EventItem title="Cultural Fest - Harmony 2024" participants={342} category="Cultural" />
          <EventItem title="Basketball Championship" participants={160} category="Sports" />
          <EventItem title="Web Development Workshop" participants={65} category="Workshop" />
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <FiCheckCircle size={15} />
            </div>
            <h3 className="font-semibold text-gray-800">System Health</h3>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </span>
        </div>
        <div className="px-6 py-2 divide-y divide-gray-50">
          <HealthRow label="Server Status" value="Healthy" good />
          <HealthRow label="Database" value="Connected" good />
          <HealthRow label="API Response" value="152ms" good />
          <HealthRow label="Uptime" value="99.9%" good />
        </div>
      </div>
    </div>
  );
}

const CATEGORY_TAG_COLORS = {
  Tech:     "bg-blue-50 text-blue-600 border-blue-100",
  Cultural: "bg-purple-50 text-purple-600 border-purple-100",
  Sports:   "bg-green-50 text-green-600 border-green-100",
  Workshop: "bg-amber-50 text-amber-600 border-amber-100",
};

function EventItem({ title, participants, category }) {
  const tagColor = CATEGORY_TAG_COLORS[category] || "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <div className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
        <FiCalendar size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
        <p className="text-xs text-gray-400">{participants} participants</p>
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${tagColor}`}>
        {category}
      </span>
    </div>
  );
}

function HealthRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${good ? "bg-green-500" : "bg-red-500"}`} />
        <span className={`text-sm font-semibold ${good ? "text-green-600" : "text-red-600"}`}>{value}</span>
      </div>
    </div>
  );
}

/* ================================================
   USER MANAGEMENT
================================================ */
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getAllUsers({ role: "student" });
      setUsers(data);
    } catch {
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.college?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Student Management</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${filtered.length} student${filtered.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
        <div className="relative">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-red-100 rounded-xl p-10 text-center">
          <FiAlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error}</p>
          <button onClick={fetchUsers} className="mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <FiUsers size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">
            {search ? "No students match your search" : "No students registered yet"}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-4 px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Student</span>
            <span>College</span>
            <span>Joined</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          {filtered.map((user, i) => (
            <div
              key={user._id || i}
              className="flex flex-col sm:grid sm:grid-cols-[2fr_2fr_1fr_1fr] gap-2 sm:gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors"
            >
              {/* Student info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                  {user.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* College */}
              <div className="flex items-center sm:min-w-0 pl-12 sm:pl-0">
                <span className="text-sm text-gray-500 truncate">{user.college || "—"}</span>
              </div>

              {/* Joined */}
              <div className="flex items-center pl-12 sm:pl-0">
                <span className="text-xs text-gray-400">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center pl-12 sm:pl-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  user.status === "approved" ? "bg-green-100 text-green-700" :
                  user.status === "pending"  ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================
   REGISTRATIONS
================================================ */
function Registrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionId, setActionId]           = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [statusTab, setStatusTab]         = useState("all");
  const [search, setSearch]               = useState("");
  const [events, setEvents]               = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data: myEvents } = await getMyEvents();
      setEvents(myEvents);
      const allRegs = await Promise.all(
        myEvents.map(async (ev) => {
          try {
            const { data } = await getEventRegistrations(ev._id);
            return data.map((r) => ({ ...r, eventTitle: ev.title }));
          } catch { return []; }
        })
      );
      setRegistrations(allRegs.flat());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (id) => {
    try {
      setActionId(id);
      await approveRegistration(id);
      setRegistrations((prev) =>
        prev.map((r) => r._id === id ? { ...r, status: "approved" } : r)
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve");
    } finally { setActionId(null); }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this registration?")) return;
    try {
      setActionId(id);
      await rejectRegistration(id);
      setRegistrations((prev) =>
        prev.map((r) => r._id === id ? { ...r, status: "rejected" } : r)
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject");
    } finally { setActionId(null); }
  };

  const counts = {
    all:      registrations.length,
    pending:  registrations.filter((r) => r.status === "pending").length,
    approved: registrations.filter((r) => r.status === "approved").length,
    rejected: registrations.filter((r) => r.status === "rejected").length,
  };

  const filtered = registrations.filter((r) => {
    const matchEvent  = selectedEvent === "all" || r.eventTitle === selectedEvent;
    const matchStatus = statusTab === "all" || r.status === statusTab;
    const matchSearch = !search ||
      r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.eventTitle?.toLowerCase().includes(search.toLowerCase());
    return matchEvent && matchStatus && matchSearch;
  });

  const statusConfig = {
    pending:  { label: "Pending",  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400" },
    approved: { label: "Approved", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500" },
    rejected: { label: "Rejected", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-400"   },
  };

  if (loading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Registrations</h3>
            <p className="text-sm text-gray-500 mt-0.5">Loading registrations...</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {[1,2,3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-gray-50 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                <div className="h-3 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="h-6 w-24 bg-gray-100 rounded-full" />
              <div className="h-8 w-20 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Registrations</h3>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} registration{filtered.length !== 1 ? "s" : ""} found</p>
        </div>
        {/* Event filter */}
        {events.length > 0 && (
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 bg-white self-start sm:self-auto"
          >
            <option value="all">All Events</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev.title}>{ev.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              statusTab === tab
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab !== "all" && (
              <span className={`w-2 h-2 rounded-full ${statusTab === tab ? "bg-white" : statusConfig[tab]?.dot}`} />
            )}
            <span className="capitalize">{tab === "all" ? "All" : statusConfig[tab].label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              statusTab === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
        <div className="relative">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, email or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <FiCheckCircle size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">No registrations found</p>
          <p className="text-sm text-gray-400 mt-1">Try changing the filters or search term.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.map((reg, i) => {
            const student  = reg.userId;
            const isActing = actionId === reg._id;
            const sc       = statusConfig[reg.status] || statusConfig.pending;
            return (
              <div
                key={reg._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors"
              >
                {/* Left — student info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                    {student?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{student?.name || "Unknown"}</p>
                    <p className="text-xs text-gray-400 truncate">{student?.email}</p>
                    {student?.college && (
                      <p className="text-xs text-gray-400 truncate">{student.college}</p>
                    )}
                  </div>
                </div>

                {/* Middle — event name */}
                <div className="hidden md:flex items-center min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiCalendar size={13} className="text-gray-300 flex-shrink-0" />
                    <span className="text-sm text-gray-500 truncate">{reg.eventTitle}</span>
                  </div>
                </div>

                {/* Right — status + actions */}
                <div className="flex items-center gap-3 flex-shrink-0 pl-13 sm:pl-0">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>

                  {reg.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(reg._id)}
                        disabled={isActing}
                        className="px-3.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isActing ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <FiCheckCircle size={13} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(reg._id)}
                        disabled={isActing}
                        className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isActing ? (
                          <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                          <FiX size={13} />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================
   ADMIN LOGS
================================================ */
function AdminLogs() {
  const logs = [
    { action: "Approved event Hackathon 2024", admin: "Manikanta", time: "2 hours ago" },
    { action: "Rejected registration for Cultural Fest", admin: "Shambhavi", time: "5 hours ago" },
    { action: "Created new event Web Workshop", admin: "Manikanta", time: "1 day ago" },
  ];
  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-5 text-lg font-semibold">Admin Activity Logs</h3>
      {logs.map((log, i) => (
        <div key={i} className="p-4 border-b border-gray-200">
          <div className="font-medium">{log.action}</div>
          <div className="text-sm text-gray-500">By {log.admin} • {log.time}</div>
        </div>
      ))}
    </div>
  );
}