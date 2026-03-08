import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  FiEdit2,
  FiSave,
  FiX,
  FiMail,
  FiUser,
  FiShield,
  FiCalendar,
  FiMapPin,
  FiLogOut,
  FiCheckCircle,
  FiClock,
  FiAward,
  FiCamera,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { updateProfile, deleteAccount, BASE_URL } from "../services/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
});


export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Image preview state — null means "use existing or initials"
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    name:    user?.name    || "",
    college: user?.college || "",
    phone:   user?.phone   || "",
  });
  const [phoneError, setPhoneError] = useState("");

  const name     = user?.name    || "User";
  const role     = user?.role    || "";
  const email    = user?.email   || "";
  const college  = user?.college || "—";
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // Resolve avatar: local preview → saved server image → initials fallback
  const savedImage = user?.profileImage ? `${BASE_URL}/uploads/${user.profileImage}` : null;
  const avatarSrc  = imagePreview || savedImage;

  const formattedRole = role
    ? role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Member";

  const roleColor = {
    student:       "bg-blue-50 text-blue-700 border-blue-200",
    college_admin: "bg-amber-50 text-amber-700 border-amber-200",
    super_admin:   "bg-red-50 text-red-700 border-red-200",
  }[role] || "bg-gray-50 text-gray-700 border-gray-200";

  const roleIcon = {
    student:       <FiUser size={12} />,
    college_admin: <FiShield size={12} />,
    super_admin:   <FiShield size={12} />,
  }[role] || <FiUser size={12} />;

  /* ── IMAGE SELECTION ── */
  const handleAvatarClick = () => {
    if (!editing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPEG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /* ── SAVE PROFILE ── */
  const handleSave = async () => {
    if (form.phone && !isValidPhoneNumber(form.phone)) {
      setPhoneError("Please enter a valid phone number");
      return;
    }
    setPhoneError("");
    setSaving(true);

    try {
      const formData = new FormData();
      if (form.name)    formData.append("name",    form.name);
      if (form.college) formData.append("college", form.college);
      formData.append("phone", form.phone ?? "");
      if (imageFile)    formData.append("profileImage", imageFile);

      const res = await updateProfile(formData);

      if (setUser) setUser((prev) => ({ ...prev, ...res.data.user }));

      setImagePreview(null);
      setImageFile(null);
      toast.success("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  /* ── CANCEL EDIT ── */
  const handleCancel = () => {
    setForm({ name: user?.name || "", college: user?.college || "", phone: user?.phone || "" });
    setImagePreview(null);
    setImageFile(null);
    setPhoneError("");
    setEditing(false);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      logout();
      toast.success("Account deleted");
      navigate("/register");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const stats = [
    { label: "Events Joined", value: "12", icon: <FiCalendar size={16} />,    color: "text-blue-600 bg-blue-50" },
    { label: "Completed",     value: "8",  icon: <FiCheckCircle size={16} />, color: "text-emerald-600 bg-emerald-50" },
    { label: "Upcoming",      value: "4",  icon: <FiClock size={16} />,       color: "text-amber-600 bg-amber-50" },
    { label: "Certificates",  value: "3",  icon: <FiAward size={16} />,       color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <>
      {/* Phone input style overrides to match Tailwind design */}
      <style>{`
        .PhoneInput { display: flex; align-items: center; gap: 8px; width: 100%; }

        .PhoneInputCountry {
          position: relative;
          display: flex; align-items: center; gap: 4px;
          padding: 0 10px; height: 42px;
          background: rgba(239,246,255,0.3);
          border: 1px solid #bfdbfe; border-radius: 8px;
          cursor: pointer; flex-shrink: 0;
        }
        .PhoneInputCountrySelect {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          opacity: 0; cursor: pointer;
        }
        .PhoneInputCountrySelectArrow {
          width: 5px; height: 5px;
          border-right: 1.5px solid #6b7280;
          border-bottom: 1.5px solid #6b7280;
          transform: rotate(45deg);
          margin-left: 2px; margin-top: -3px;
        }
        .PhoneInputInput {
          flex: 1; padding: 10px 14px;
          border-radius: 8px; border: 1px solid #bfdbfe;
          background: rgba(239,246,255,0.3);
          font-size: 0.875rem; color: #1f2937;
          outline: none; transition: all 0.15s; width: 100%;
        }
        .PhoneInputInput:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
          background: white;
        }
        .PhoneInputInput::placeholder { color: #9ca3af; }

        /* Read-only state (viewing, not editing) */
        .phone-readonly .PhoneInputCountry {
          background: #f9fafb; border-color: #e5e7eb;
          pointer-events: none; cursor: default;
        }
        .phone-readonly .PhoneInputInput {
          background: #f9fafb; border-color: #e5e7eb;
          color: #374151; pointer-events: none; cursor: default;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <Navbar />

        <div className="pt-16">

          {/* ── HERO BANNER ── */}
          <div className="relative h-32 sm:h-44 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 mb-14 sm:mb-20">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            {/* ── AVATAR ── */}
            <div className="absolute -bottom-10 sm:-bottom-14 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6">
              <div
                onClick={handleAvatarClick}
                title={editing ? "Click to change photo" : ""}
                className={`group relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-xl flex-shrink-0 overflow-hidden select-none
                  ${editing ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Image or initials */}
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-700 flex items-center justify-center">
                    <span className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{initials}</span>
                  </div>
                )}

                {/* Camera overlay — visible on hover when editing */}
                {editing && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <FiCamera className="text-white" size={18} />
                    <span className="text-white text-[10px] font-bold tracking-widest">CHANGE</span>
                  </div>
                )}

                {/* Subtle ring pulse when image file is staged */}
                {imageFile && (
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-400 ring-offset-0 pointer-events-none" />
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Staged photo badge */}
              <AnimatePresence>
                {imageFile && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center gap-1"
                  >
                    <FiCheckCircle size={11} /> New photo ready — click Save to upload
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── PAGE BODY ── */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6">

            {/* ── NAME + ACTIONS ROW ── */}
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between">
              <motion.div {...fadeUp(0)} className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight truncate">{name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColor}`}>
                    {roleIcon} {formattedRole}
                  </span>
                  {college !== "—" && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[200px]">
                      <FiMapPin size={11} className="flex-shrink-0" />
                      <span className="truncate">{college}</span>
                    </span>
                  )}
                </div>
              </motion.div>

              <motion.div {...fadeUp(0.1)} className="flex gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition shadow-sm"
                    >
                      <FiSave size={14} /> {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition"
                    >
                      <FiX size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold border border-gray-200 transition shadow-sm"
                    >
                      <FiEdit2 size={14} /> Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 text-sm font-semibold border border-gray-200 hover:border-red-200 transition shadow-sm"
                    >
                      <FiLogOut size={14} /> Logout
                    </button>
                  </>
                )}
              </motion.div>
            </div>

            {/* ── STATS ROW ── */}
            <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 flex items-center gap-2.5 shadow-sm min-w-0">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-tight">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── PROFILE DETAILS CARD ── */}
            <motion.div {...fadeUp(0.2)} className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
                {editing && <span className="text-xs text-blue-600 font-medium">Editing mode</span>}
              </div>

              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                <Field
                  label="Full Name" icon={<FiUser size={14} />}
                  value={form.name} editing={editing}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="Your full name"
                />

                <Field
                  label="Email Address" icon={<FiMail size={14} />}
                  value={email} editing={false} onChange={() => {}}
                  placeholder="your@email.com" type="email" disabled
                />

                <Field
                  label="College / Institution" icon={<FiMapPin size={14} />}
                  value={form.college} editing={editing}
                  onChange={(v) => setForm({ ...form, college: v })}
                  placeholder="Your college name"
                />

                {/* ── PHONE WITH COUNTRY CODE ── */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    {/* inline phone icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    Phone Number
                  </label>

                  <div className={!editing ? "phone-readonly" : ""}>
                    <PhoneInput
                      international
                      defaultCountry="IN"
                      value={form.phone}
                      onChange={(val) => {
                        setForm({ ...form, phone: val ?? "" });
                        if (phoneError) setPhoneError("");
                      }}
                      placeholder="+91 98765 43210"
                      disabled={!editing}
                    />
                  </div>

                  {phoneError && (
                    <p className="text-xs text-red-500 mt-0.5">{phoneError}</p>
                  )}
                  {editing && form.phone && isValidPhoneNumber(form.phone) && !phoneError && (
                    <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                      <FiCheckCircle size={11} /> Valid number
                    </p>
                  )}
                </div>

                {/* Role — always read-only */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <FiShield size={13} /> Role
                  </label>
                  <div className="px-3.5 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 font-medium truncate">
                    {formattedRole}
                  </div>
                </div>

              </div>
            </motion.div>

            {/* ── DANGER ZONE ── */}
            <motion.div {...fadeUp(0.25)} className="bg-white rounded-2xl border border-red-100 shadow-sm mb-10">
              <div className="px-5 sm:px-6 py-4 border-b border-red-100">
                <h2 className="text-sm font-semibold text-red-600">Danger Zone</h2>
              </div>
              <div className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">Delete Account</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permanently remove your account and all associated data.
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {showDeleteConfirm ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex gap-2 flex-shrink-0"
                    >
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition"
                      >
                        {deleting ? "Deleting…" : "Confirm Delete"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="delete"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition flex-shrink-0"
                    >
                      Delete Account
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}

/* ── REUSABLE FIELD ── */
function Field({ label, icon, value, editing, onChange, placeholder, type = "text", disabled = false }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
        {icon} {label}
      </label>
      {editing && !disabled ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 rounded-lg border border-blue-200 bg-blue-50/30 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition placeholder:text-gray-400"
        />
      ) : (
        <div className={`px-3.5 py-2.5 rounded-lg text-sm border truncate ${
          disabled ? "bg-gray-50 border-gray-200 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-700"
        }`}>
          {value || <span className="text-gray-400 italic">Not provided</span>}
        </div>
      )}
    </div>
  );
}