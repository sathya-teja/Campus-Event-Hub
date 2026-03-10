import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiLogOut,
  FiChevronDown,
  FiMenu,
  FiUser,
  FiHome,
  FiCalendar,
  FiLayout,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../services/api";
import toast from "react-hot-toast";
import NotificationBell from "./NotificationBell"; // 🔔 NEW

export default function Navbar({ toggleSidebar, setSidebarOpen }) {
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isGuest = !user;
  const name = user?.name || "";
  const role = user?.role || "";
  const email = user?.email || "";

  const formattedRole = role
    ? role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "";

  const roleBadgeColor = {
    student:       "text-blue-600 bg-blue-50 border-blue-100",
    college_admin: "text-amber-600 bg-amber-50 border-amber-100",
    super_admin:   "text-red-600 bg-red-50 border-red-100",
  }[role] || "text-gray-600 bg-gray-50 border-gray-200";

  const roleDot = {
    student:       "bg-blue-500",
    college_admin: "bg-amber-500",
    super_admin:   "bg-red-500",
  }[role] || "bg-gray-400";

  useEffect(() => {
    setImgError(false);
  }, [user?.profileImage]);

  const avatarSrc =
    user?.profileImage && !imgError
      ? `${BASE_URL}/uploads/${user.profileImage}`
      : null;

  const getDashboardPath = () => {
    switch (role) {
      case "student":       return "/dashboard/student";
      case "college_admin": return "/dashboard/collegeadmin";
      case "super_admin":   return "/dashboard/superadmin";
      default:              return "/";
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const handleToggle = toggleSidebar || setSidebarOpen;

  /* ── Avatar ── */
  const Avatar = ({ size = "w-8 h-8", textSize = "text-sm" }) => (
    <div className={`${size} rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm`}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full bg-blue-600 text-white flex items-center justify-center font-semibold ${textSize}`}>
          {name?.[0]?.toUpperCase() || "U"}
        </div>
      )}
    </div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm h-16">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <h1
            onClick={() => navigate("/")}
            className="text-xl font-bold text-blue-600 cursor-pointer tracking-tight"
          >
            CampusEventHub
          </h1>
          {handleToggle && !isGuest && (
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition"
              onClick={() => handleToggle(true)}
            >
              <FiMenu size={22} className="text-gray-600" />
            </button>
          )}
        </div>

        {/* CENTER NAV */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => navigate("/")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isActive("/") ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <FiHome size={15} /> Home
          </button>
          <button
            onClick={() => navigate("/events")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isActive("/events") ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <FiCalendar size={15} /> Events
          </button>
        </nav>

        {/* RIGHT */}
        {isGuest ? (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
              >
                Register
              </button>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-md hover:bg-gray-100 transition text-gray-600"
            >
              {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </>
        ) : (
          /* ── Authenticated ── */
          <div className="flex items-center gap-2">

            {/* 🔔 Notification Bell */}
            <NotificationBell user={user} />

            {/* ── Avatar dropdown trigger ── */}
            <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border transition-all duration-150
                ${open
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
                }`}
            >
              <Avatar />
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-[13px] font-semibold text-gray-800 leading-none">{name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{formattedRole}</p>
              </div>
              <FiChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ml-0.5 ${open ? "rotate-180 text-blue-500" : ""}`}
              />
            </button>

            {open && (
              <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden z-50">

                {/* ── User card header ── */}
                <div className="px-4 py-3.5 bg-gradient-to-br from-blue-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar size="w-11 h-11" textSize="text-base" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate mb-1.5">{email}</p>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadgeColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${roleDot}`} />
                        {formattedRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Mobile nav links ── */}
                <div className="md:hidden px-2 pt-2 pb-1 border-b border-gray-200">
                  {[
                    { path: "/",       icon: <FiHome size={14} />,     label: "Home" },
                    { path: "/events", icon: <FiCalendar size={14} />, label: "Events" },
                  ].map(({ path, icon, label }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition mb-0.5
                        ${isActive(path) ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      <span className={isActive(path) ? "text-blue-600" : "text-gray-400"}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Menu items ── */}
                <div className="px-2 py-2">
                  {[
                    { path: "/profile",         icon: <FiUser size={14} />,   label: "Profile" },
                    { path: getDashboardPath(), icon: <FiLayout size={14} />, label: "Dashboard" },
                  ].map(({ path, icon, label }) => (
                    <button
                      key={label}
                      onClick={() => { navigate(path); setOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition mb-0.5
                        ${isActive(path)
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                    >
                      <span className={isActive(path) ? "text-blue-500" : "text-gray-400"}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Logout ── */}
                <div className="px-2 pb-2 border-t border-gray-200 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <FiLogOut size={14} className="text-red-400" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div> {/* closes dropdownRef */}
          </div> 
        )}
      </div>

      {/* Mobile dropdown for guest */}
      {isGuest && mobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-1 shadow-sm">
          <button
            onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/") ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
          >
            <FiHome size={15} /> Home
          </button>
          <button
            onClick={() => { navigate("/events"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/events") ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
          >
            <FiCalendar size={15} /> Events
          </button>
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
            <button
              onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition text-left"
            >
              Login
            </button>
            <button
              onClick={() => { navigate("/register"); setMobileMenuOpen(false); }}
              className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Register
            </button>
          </div>
        </div>
      )}
    </header>
  );
}