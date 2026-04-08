import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../services/api";
import Navbar from "../components/Navbar";
import {
  FiUploadCloud,
  FiX,
  FiCalendar,
  FiMapPin,
  FiTag,
  FiFileText,
  FiType,
  FiArrowLeft,
  FiCheckCircle,
} from "react-icons/fi";

const CATEGORIES = ["Tech", "Cultural", "Sports", "Workshop"];

const CATEGORY_COLORS = {
  Tech: "bg-blue-100 text-blue-700 border-blue-200",
  Cultural: "bg-purple-100 text-purple-700 border-purple-200",
  Sports: "bg-green-100 text-green-700 border-green-200",
  Workshop: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function CreateEvent() {
  const navigate = useNavigate();
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
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { type: "success"|"error", text }
  const [loading, setLoading] = useState(false);

  /* ---------- Handlers ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be under 5MB" }));
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 3)
      newErrors.title = "Title must be at least 3 characters";
    if (!formData.category) newErrors.category = "Please select a category";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.startTime) newErrors.startTime = "Start time is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (!formData.endTime) newErrors.endTime = "End time is required";
    if (formData.startDate && formData.endDate) {
      const start = new Date(`${formData.startDate}T${formData.startTime || "00:00"}`);
      const end   = new Date(`${formData.endDate}T${formData.endTime || "00:00"}`);
      if (start >= end) newErrors.endTime = "End must be after start date & time";
    }
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage({ type: "error", text: "Unauthorized. Please login again." });
      return;
    }

    // Combine date + time and build multipart form data
    const payload = new FormData();
    const { startDate, startTime, endDate, endTime, ...rest } = formData;
    payload.append("startDate", new Date(`${startDate}T${startTime}`).toISOString());
    payload.append("endDate",   new Date(`${endDate}T${endTime}`).toISOString());
    Object.entries(rest).forEach(([key, val]) => payload.append(key, val));
    if (imageFile) payload.append("image", imageFile);

    try {
      setLoading(true);
      setMessage(null);

      await createEvent(payload);

      setMessage({ type: "success", text: "Event created successfully!" });

      // Redirect to admin dashboard events tab after short delay
      setTimeout(() => {
        navigate("/dashboard/collegeadmin", { state: { activeTab: "events" } });
      }, 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to create event",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F3C88] transition-colors"
            >
              <FiArrowLeft size={16} />
              Back
            </button>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
            <p className="text-sm text-gray-500 mt-1">
              Fill in the details below to publish a new event for your college.
            </p>
          </div>

          {/* Toast Message */}
          {message && (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium border ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <FiCheckCircle size={17} className="flex-shrink-0" />
              ) : (
                <FiX size={17} className="flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* ── Section: Basic Info ── */}
              <SectionHeader icon={<FiType />} title="Basic Information" />
              <div className="p-6 grid grid-cols-1 gap-5">

                <Field label="Event Title" error={errors.title}>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Inter-College Hackathon 2025"
                    className={inputCls(errors.title)}
                  />
                </Field>

                {/* Category Pills */}
                <Field label="Category" error={errors.category}>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, category: cat }));
                          setErrors((p) => ({ ...p, category: "" }));
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
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

              <Divider />

              {/* ── Section: Date & Location ── */}
              <SectionHeader icon={<FiCalendar />} title="Date & Location" />
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

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

                <div className="sm:col-span-2">
                  <Field label="Location" error={errors.location} icon={<FiMapPin size={15} className="text-gray-400" />}>
                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Main Auditorium, Block A"
                      className={inputCls(errors.location)}
                    />
                  </Field>
                </div>

              </div>

              <Divider />

              {/* ── Section: Description ── */}
              <SectionHeader icon={<FiFileText />} title="Description" />
              <div className="p-6">
                <Field label="Event Description" error={errors.description}>
                  <textarea
                    name="description"
                    rows={5}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the event, agenda, speakers, prizes..."
                    className={`${inputCls(errors.description)} resize-none`}
                  />
                </Field>
              </div>

              <Divider />

              {/* ── Section: Image ── */}
              <SectionHeader icon={<FiUploadCloud />} title="Event Banner" optional />
              <div className="p-6">
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-52 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={removeImage}
                        className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg"
                      >
                        <FiX size={14} /> Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="imageUpload"
                    className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
                      errors.image
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50 hover:border-[#1F3C88] hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#1F3C88]">
                      <FiUploadCloud size={22} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">
                        Click to upload banner image
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG, WEBP — max 5MB
                      </p>
                    </div>
                  </label>
                )}

                <input
                  id="imageUpload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {errors.image && (
                  <p className="text-xs text-red-500 mt-2">{errors.image}</p>
                )}
              </div>

              {/* ── Footer Buttons ── */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1F3C88] hover:bg-[#162d6b] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[130px] justify-center"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* ── Helpers ── */

function SectionHeader({ icon, title, optional }) {
  return (
    <div className="px-6 py-4 flex items-center gap-2.5 border-b border-gray-100">
      <span className="text-[#1F3C88] text-base">{icon}</span>
      <span className="font-semibold text-gray-800 text-sm">{title}</span>
      {optional && (
        <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
      )}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100" />;
}

function inputCls(error) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#1F3C88]/20 focus:border-[#1F3C88] ${
    error ? "border-red-300 bg-red-50 focus:ring-red-100" : "border-gray-200 bg-white"
  }`;
}