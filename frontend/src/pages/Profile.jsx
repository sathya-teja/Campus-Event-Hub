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
  FiMapPin,
  FiLogOut,
  FiCheckCircle,
  FiCamera,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { updateProfile, deleteAccount, BASE_URL } from "../services/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    college: user?.college || "",
    phone: user?.phone || "",
  });
  const [phoneError, setPhoneError] = useState("");

  const name = user?.name || "User";
  const role = user?.role || "";
  const email = user?.email || "";
  const college = user?.college || "—";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const savedImage = user?.profileImage
    ? user.profileImage.startsWith("http")
      ? user.profileImage
      : `${BASE_URL}/uploads/${user.profileImage}`
    : null;
  const avatarSrc = imagePreview || savedImage || null;

  const formattedRole = role
    ? role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "Member";

  const roleConfig = {
    student: {
      classes: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-100",
      dot: "bg-sky-500",
    },
    college_admin: {
      classes: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100",
      dot: "bg-amber-500",
    },
    super_admin: {
      classes: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-100",
      dot: "bg-rose-500",
    },
  }[role] || { classes: "bg-gray-50 text-gray-600 border-gray-200 ring-gray-100", dot: "bg-gray-400" };

  const roleIcon = {
    student: <FiUser size={11} />,
    college_admin: <FiShield size={11} />,
    super_admin: <FiShield size={11} />,
  }[role] || <FiUser size={11} />;

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
      if (form.name) formData.append("name", form.name);
      if (form.college) formData.append("college", form.college);
      formData.append("phone", form.phone ?? "");
      if (imageFile) formData.append("profileImage", imageFile);

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Sora:wght@600;700&display=swap');

        .profile-root { font-family: 'DM Sans', sans-serif; }
        .profile-heading { font-family: 'Sora', sans-serif; }

        /* Phone Input Styles */
        .PhoneInput { display: flex; align-items: center; gap: 8px; width: 100%; }
        .PhoneInputCountry {
          position: relative; display: flex; align-items: center; gap: 4px;
          padding: 0 12px; height: 44px;
          background: #f8fafc; border: 1.5px solid #e2e8f0;
          border-radius: 10px; cursor: pointer; flex-shrink: 0;
          transition: border-color 0.15s;
        }
        .PhoneInputCountry:hover { border-color: #94a3b8; }
        .PhoneInputCountrySelect {
          position: absolute; inset: 0; width: 100%; height: 100%;
          opacity: 0; cursor: pointer;
        }
        .PhoneInputCountrySelectArrow {
          width: 5px; height: 5px;
          border-right: 1.5px solid #64748b;
          border-bottom: 1.5px solid #64748b;
          transform: rotate(45deg); margin-left: 2px; margin-top: -3px;
        }
        .PhoneInputInput {
          flex: 1; padding: 11px 14px;
          border-radius: 10px; border: 1.5px solid #e2e8f0;
          background: #f8fafc; font-size: 0.875rem; color: #1e293b;
          outline: none; transition: all 0.15s; width: 100%;
          font-family: 'DM Sans', sans-serif;
        }
        .PhoneInputInput:focus {
          border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: white;
        }
        .PhoneInputInput::placeholder { color: #94a3b8; }

        /* Edit mode phone */
        .phone-editing .PhoneInputCountry {
          background: white; border-color: #c7d2fe;
        }
        .phone-editing .PhoneInputCountry:hover { border-color: #818cf8; }
        .phone-editing .PhoneInputInput {
          background: white; border-color: #c7d2fe;
        }
        .phone-editing .PhoneInputInput:focus {
          border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        /* Read-only state */
        .phone-readonly .PhoneInputCountry {
          background: #f8fafc; border-color: #e2e8f0;
          pointer-events: none; cursor: default;
        }
        .phone-readonly .PhoneInputInput {
          background: #f8fafc; border-color: #e2e8f0;
          color: #475569; pointer-events: none; cursor: default;
        }

        /* Banner mesh */
        .banner-mesh {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #818cf8 80%, #a5b4fc 100%);
        }

        /* Input focus ring for edit mode */
        .field-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
          background: white !important;
        }
      `}</style>

      <div className="profile-root min-h-screen bg-slate-50 overflow-x-hidden">
        <Navbar />

        <div className="pt-16">

          {/* ── HERO BANNER ── */}
          <div className="relative h-36 sm:h-52 banner-mesh">
            {/* Clipping wrapper only for decorative layers */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute top-4 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 right-1/4 w-56 h-56 bg-indigo-900/20 rounded-full blur-2xl" />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)",
                }}
              />
            </div>
            {/* Decorative geometric layers */}
            <div
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* ── AVATAR ── */}
            <div className="absolute -bottom-12 sm:-bottom-16 left-0 right-0 max-w-5xl mx-auto px-4 sm:px-8">
              <div className="flex flex-col items-start">
                <div
                  onClick={handleAvatarClick}
                  title={editing ? "Click to change photo" : ""}
                  className={`group relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-2xl flex-shrink-0 overflow-hidden select-none
                    ${editing ? "cursor-pointer ring-4 ring-indigo-200 ring-offset-2" : "cursor-default"}`}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                      <span className="profile-heading text-3xl sm:text-4xl font-bold text-white tracking-tight">{initials}</span>
                    </div>
                  )}

                  {editing && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      <FiCamera className="text-white" size={20} />
                      <span className="text-white text-[9px] font-bold tracking-[0.15em] uppercase">Change</span>
                    </div>
                  )}

                  {imageFile && (
                    <div className="absolute inset-0 rounded-full ring-2 ring-indigo-400 ring-offset-0 pointer-events-none" />
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <AnimatePresence>
                  {imageFile && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="mt-2.5 text-[11px] text-indigo-600 font-semibold flex items-center gap-1.5 bg-white/90 px-2.5 py-1 rounded-full shadow-sm"
                    >
                      <FiCheckCircle size={11} /> New photo staged — click Save to upload
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── PAGE BODY ── */}
          <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-20 sm:pt-24">

            {/* ── NAME + ACTIONS ROW ── */}
            <div className="flex flex-col gap-4 mb-7 sm:flex-row sm:items-end sm:justify-between">
              <motion.div {...fadeUp(0)} className="min-w-0">
                <h1 className="profile-heading text-2xl sm:text-3xl font-bold text-slate-900 leading-tight truncate">
                  {name}
                </h1>
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roleConfig.classes}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${roleConfig.dot}`} />
                    {roleIcon}
                    {formattedRole}
                  </span>
                  {college !== "—" && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[220px]">
                      <FiMapPin size={11} className="flex-shrink-0 text-slate-400" />
                      <span className="truncate">{college}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <FiMail size={11} />
                    <span className="truncate max-w-[180px]">{email}</span>
                  </span>
                </div>
              </motion.div>

              <motion.div {...fadeUp(0.08)} className="flex gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-200"
                    >
                      <FiSave size={14} />
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-sm font-semibold transition-all shadow-sm"
                    >
                      <FiX size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-200 transition-all shadow-sm"
                    >
                      <FiEdit2 size={14} className="text-indigo-500" /> Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-slate-600 hover:text-red-600 text-sm font-semibold border border-slate-200 hover:border-red-200 transition-all shadow-sm"
                    >
                      <FiLogOut size={14} /> Logout
                    </button>
                  </>
                )}
              </motion.div>
            </div>

            {/* ── PROFILE DETAILS CARD ── */}
            <motion.div {...fadeUp(0.12)} className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 rounded-full bg-indigo-500" />
                  <h2 className="profile-heading text-sm font-bold text-slate-800 tracking-tight">Personal Information</h2>
                </div>
                {editing && (
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    Editing mode
                  </span>
                )}
              </div>

              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">

                <Field
                  label="Full Name"
                  icon={<FiUser size={13} />}
                  value={form.name}
                  editing={editing}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="Your full name"
                />

                <Field
                  label="Email Address"
                  icon={<FiMail size={13} />}
                  value={email}
                  editing={false}
                  onChange={() => {}}
                  placeholder="your@email.com"
                  type="email"
                  disabled
                />

                <Field
                  label="College / Institution"
                  icon={<FiMapPin size={13} />}
                  value={form.college}
                  editing={editing}
                  onChange={(v) => setForm({ ...form, college: v })}
                  placeholder="Your college name"
                />

                {/* ── PHONE WITH COUNTRY CODE ── */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    Phone Number
                  </label>

                  <div className={editing ? "phone-editing" : "phone-readonly"}>
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
                    <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                      <FiX size={11} /> {phoneError}
                    </p>
                  )}
                  {editing && form.phone && isValidPhoneNumber(form.phone) && !phoneError && (
                    <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1 font-medium">
                      <FiCheckCircle size={11} /> Valid number
                    </p>
                  )}
                </div>

                {/* Role — always read-only */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
                    <FiShield size={12} /> Role
                  </label>
                  <div className={`px-3.5 py-2.5 rounded-xl text-sm border truncate flex items-center gap-2 ${roleConfig.classes} font-medium`}>
                    {roleIcon}
                    {formattedRole}
                  </div>
                </div>

              </div>
            </motion.div>

            {/* ── DANGER ZONE ── */}
            <motion.div {...fadeUp(0.24)} className="bg-white rounded-2xl border border-red-100 shadow-sm mb-12 overflow-hidden">
              <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-red-400" />
                <h2 className="profile-heading text-sm font-bold text-red-600 tracking-tight">Danger Zone</h2>
              </div>
              <div className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Permanently remove your account and all associated data. This action cannot be undone.
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
                        className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-md shadow-red-100"
                      >
                        {deleting ? "Deleting…" : "Confirm Delete"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all"
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
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 active:bg-red-100 transition-all flex-shrink-0"
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
      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
        {icon} {label}
      </label>
      {editing && !disabled ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field-input w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      ) : (
        <div
          className={`px-3.5 py-2.5 rounded-xl text-sm border truncate font-medium ${
            disabled
              ? "bg-slate-50 border-slate-200 text-slate-400"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          {value || <span className="text-slate-400 italic font-normal">Not provided</span>}
        </div>
      )}
    </div>
  );
}