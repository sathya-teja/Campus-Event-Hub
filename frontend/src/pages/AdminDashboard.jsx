// AdminDashboard.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getImageUrl,
  getEventRegistrations,
  getAllRegistrations,
  approveRegistration,
  rejectRegistration,
  getAllUsers,
  getMyEventStudents,
  exportRegistrationsCSV,
  exportRegistrationsExcel,
  exportRegistrationsPDF,
  exportRegistrationsJSON,
  exportAllRegistrationsCSV,
  exportAllRegistrationsExcel,
  exportAllRegistrationsPDF,
  exportAllRegistrationsJSON,
  getEventAttendance,
  scanAttendanceQR,
} from "../services/api";
import Navbar from "../components/Navbar";
import StatsCard from "../components/StatsCard";
import Sidebar from "../components/Sidebar";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/AuthContext";
import FeedbackSection from "../components/FeedbackSection";

import { getAdminLogs, BASE_URL } from "../services/api";
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
  FiDownload,
  FiActivity,
  FiCamera,
  FiZap,
  FiWifi,
  FiSlash,
  FiClock,
  FiPercent,
  FiStar,
  // Add these new icons for logs
  FiMessageSquare,
  FiXCircle,
  FiUser as FiUserIcon,
} from "react-icons/fi";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Remove recharts focus outlines globally
const styleEl = document.createElement("style");
styleEl.textContent = `.recharts-wrapper, .recharts-surface, .recharts-sector { outline: none !important; }`;
if (!document.head.querySelector("[data-recharts-fix]")) {
  styleEl.setAttribute("data-recharts-fix", "true");
  document.head.appendChild(styleEl);
}

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
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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
    error
      ? "border-red-300 bg-red-50 focus:ring-red-100"
      : "border-gray-200 bg-white"
  }`;
}

// ── Scoped CSS for admin dashboard (matching student dashboard style) ──
const adminStyles = `
  @keyframes dash-rise {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dash-card-in {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes dash-hero-in {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dash-fade-in { animation: dash-rise 0.4s cubic-bezier(.22,.68,0,1) forwards; }
  .dash-hero    { animation: dash-hero-in 0.45s cubic-bezier(.22,.68,0,1) forwards; }
  .dash-card {
    animation: dash-card-in 0.4s cubic-bezier(.22,.68,0,1.1) both;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .dash-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.07);
  }

  /* Chart panels */
  .chart-panel {
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(12px);
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.9);
    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
    padding: 20px;
    transition: box-shadow 0.2s ease;
  }
  .chart-panel:hover {
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  }
  .chart-header {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 700;
    color: #374151;
    margin-bottom: 12px;
    letter-spacing: 0.01em;
  }
  .chart-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Widget shell */
  .dash-widget > div {
    border-radius: 20px !important;
    border: 1px solid rgba(255,255,255,0.9) !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.05) !important;
    background: rgba(255,255,255,0.85) !important;
    backdrop-filter: blur(12px) !important;
    transition: box-shadow 0.2s ease !important;
  }
  .dash-widget > div:hover {
    box-shadow: 0 8px 32px rgba(0,0,0,0.08) !important;
  }
`;

/* ================================================
   ROOT DASHBOARD
================================================ */
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "overview"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <style>{adminStyles}</style>
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
              {
                key: "events",
                label: "Event Management",
                icon: <FiCalendar />,
              },
              {
                key: "registrations",
                label: "Registrations",
                icon: <FiCheckCircle />,
              },
              { key: "attendance", label: "Attendance", icon: <FiActivity /> },
              { key: "feedback", label: "Feedback", icon: <FiStar /> },
              { key: "logs", label: "Admin Logs", icon: <FiFileText /> },
            ]}
            onLogout={handleLogout}
          />

          <main
            className={`flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ${
              collapsed ? "md:ml-[68px]" : "md:ml-64"
            }`}
            style={{
              background:
                "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)",
            }}
          >
            <div className="p-5 sm:p-8">
              {activeTab === "overview" && <OverviewSection />}

              {activeTab === "users" && <UserManagement />}
              {activeTab === "events" && <EventManagement />}
              {activeTab === "registrations" && <Registrations />}
              {activeTab === "attendance" && <AttendanceSection />}
              {activeTab === "feedback" && <FeedbackSection />}
              {activeTab === "logs" && <AdminLogs />}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ================================================
   OVERVIEW SECTION (Redesigned like Student Dashboard)
================================================ */
function OverviewSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    events: 0,
    students: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentRegs, setRecentRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [eventsRes, studentsRes, regsRes] = await Promise.all([
          getMyEvents(),
          getMyEventStudents(),
          getAllRegistrations(),
        ]);
        const regs = regsRes.data.registrations || [];
        setStats({
          events: eventsRes.data.length,
          students: studentsRes.data.length,
          approved: regs.filter((r) => r.status === "approved").length,
          pending: regs.filter((r) => r.status === "pending").length,
          rejected: regs.filter((r) => r.status === "rejected").length,
          total: regs.length,
        });
        // 4 most recent events
        setRecentEvents(
          [...eventsRes.data]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4)
        );
        // 5 most recent registrations
        setRecentRegs(
          [...regs]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );
        // Registration trend — last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push({
            label: d.toLocaleDateString("en-IN", { month: "short" }),
            year: d.getFullYear(),
            month: d.getMonth(),
            count: 0,
          });
        }
        regs.forEach((reg) => {
          if (!reg.createdAt) return;
          const d = new Date(reg.createdAt);
          const m = months.find(
            (mo) => mo.month === d.getMonth() && mo.year === d.getFullYear()
          );
          if (m) m.count += 1;
        });
        setTrendData(months.map((m) => ({ name: m.label, value: m.count })));
      } catch {
        /* silent — cards stay at 0 */
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const statCards = [
    {
      title: "My Events",
      value: stats.events,
      accent: "#16a34a",
      icon: <FiCalendar size={18} />,
      iconBg: "bg-green-600",
      cardBg: "from-green-50 to-green-100/60",
      trend: "Total created",
    },
    {
      title: "Students",
      value: stats.students,
      accent: "#2563eb",
      icon: <FiUsers size={18} />,
      iconBg: "bg-blue-600",
      cardBg: "from-blue-50 to-blue-100/60",
      trend: "Registered",
    },
    {
      title: "Total Registrations",
      value: stats.total,
      accent: "#7c3aed",
      icon: <FiFileText size={18} />,
      iconBg: "bg-violet-600",
      cardBg: "from-violet-50 to-violet-100/60",
      trend: "All time",
    },
    {
      title: "Pending Reviews",
      value: stats.pending,
      accent: "#dc2626",
      icon: <FiAlertTriangle size={18} />,
      iconBg: "bg-red-500",
      cardBg: "from-red-50 to-red-100/60",
      trend: "Needs action",
    },
  ];

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 dash-fade-in">
      {/* ── Hero Banner ───────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl text-white dash-hero"
        style={{
          background:
            "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0ea5e9 100%)",
          minHeight: 140,
        }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full border border-white/10" />
        <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/5" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">
              Welcome back,
            </p>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              {user?.name || "Admin"} 👋
            </h2>
            <p className="text-blue-100/80 text-sm">
              Here's what's happening with your events today.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && stats.pending > 0 && (
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold text-white">
                  {stats.pending} pending review
                  {stats.pending !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {!loading && stats.total > 0 && (
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <FiCheckCircle size={13} className="text-green-300" />
                <span className="text-xs font-semibold text-white">
                  {approvalRate}% approval rate
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div
            key={s.title}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.cardBg} border border-white/80 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dash-card`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-20"
              style={{ background: s.accent }}
            />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center text-white shadow-sm`}
                >
                  {s.icon}
                </div>
                <span className="text-xs font-medium text-gray-400">
                  {s.trend}
                </span>
              </div>
              {loading ? (
                <div className="h-8 w-12 bg-white/60 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-3xl font-bold text-gray-900 mb-0.5">
                  {s.value}
                </p>
              )}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {s.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Registration Breakdown + Recent Registrations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Approval breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <FiCheckSquare size={15} />
            </div>
            <h3 className="font-semibold text-gray-800">
              Registration Breakdown
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-32 h-32 rounded-full bg-gray-100 animate-pulse" />
            </div>
          ) : stats.total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No registrations yet
            </p>
          ) : (
            <>
              <div style={{ outline: "none" }} tabIndex={-1}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Approved",
                          value: stats.approved,
                          color: "#10b981",
                        },
                        {
                          name: "Pending",
                          value: stats.pending,
                          color: "#f59e0b",
                        },
                        {
                          name: "Rejected",
                          value: stats.rejected,
                          color: "#ef4444",
                        },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={100}
                      animationDuration={800}
                      style={{ outline: "none" }}
                    >
                      {[
                        {
                          name: "Approved",
                          value: stats.approved,
                          color: "#10b981",
                        },
                        {
                          name: "Pending",
                          value: stats.pending,
                          color: "#f59e0b",
                        },
                        {
                          name: "Rejected",
                          value: stats.rejected,
                          color: "#ef4444",
                        },
                      ]
                        .filter((d) => d.value > 0)
                        .map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.color}
                            stroke="none"
                            style={{ outline: "none" }}
                          />
                        ))}
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        fill="#111827"
                        fontSize={22}
                        fontWeight={700}
                      >
                        {approvalRate}%
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize={10}
                        fontWeight={500}
                      >
                        Approval
                      </text>
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        fontSize: 12,
                      }}
                      formatter={(v, n) => [v, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-1 flex-wrap">
                {[
                  { label: "Approved", count: stats.approved, color: "#10b981" },
                  { label: "Pending", count: stats.pending, color: "#f59e0b" },
                  { label: "Rejected", count: stats.rejected, color: "#ef4444" },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: d.color }}
                    />
                    <span className="text-xs text-gray-500 font-medium">
                      {d.label}{" "}
                      <span className="text-gray-800 font-bold">{d.count}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent registrations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FiUsers size={15} />
              </div>
              <h3 className="font-semibold text-gray-800">
                Recent Registrations
              </h3>
            </div>
            <span className="text-xs text-gray-400">Latest 5</span>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3.5 animate-pulse"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentRegs.length === 0 ? (
            <div className="p-10 text-center">
              <FiCheckCircle size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No registrations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentRegs.map((reg) => {
                const sc = {
                  approved: {
                    bg: "bg-green-50",
                    text: "text-green-700",
                    dot: "bg-green-500",
                    label: "Approved",
                  },
                  pending: {
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                    dot: "bg-amber-400",
                    label: "Pending",
                  },
                  rejected: {
                    bg: "bg-red-50",
                    text: "text-red-700",
                    dot: "bg-red-400",
                    label: "Rejected",
                  },
                }[reg.status] || {
                  bg: "bg-gray-50",
                  text: "text-gray-600",
                  dot: "bg-gray-400",
                  label: reg.status,
                };
                return (
                  <div
                    key={reg._id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                      {reg.userId?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {reg.userId?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {reg.eventId?.title || reg.eventTitle || "—"}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} border-transparent flex-shrink-0`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Registration Trend Chart ──────────────────────── */}
      {!loading && trendData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FiActivity size={15} />
            </div>
            <h3 className="font-semibold text-gray-800">Registration Trend</h3>
            <span className="ml-auto text-xs text-gray-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={trendData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  fontSize: 12,
                }}
                formatter={(v) => [v, "Registrations"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#regGrad)"
                dot={{ fill: "#2563eb", r: 4, strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: "#2563eb",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent Events ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <FiCalendar size={15} />
            </div>
            <h3 className="font-semibold text-gray-800">Recent Events</h3>
          </div>
          <span className="text-xs text-gray-400">Latest 4</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-5 animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="p-10 text-center">
            <FiCalendar size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No events created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
            {recentEvents.map((ev) => {
              const status = getEventStatus(ev.startDate, ev.endDate);
              const statusCfg = {
                Upcoming: {
                  bg: "bg-blue-50",
                  text: "text-blue-600",
                  dot: "bg-blue-400",
                },
                Ongoing: {
                  bg: "bg-green-50",
                  text: "text-green-600",
                  dot: "bg-green-500 animate-pulse",
                },
                Past: {
                  bg: "bg-gray-50",
                  text: "text-gray-500",
                  dot: "bg-gray-300",
                },
              }[status];
              const tagColor =
                CATEGORY_TAG_COLORS[ev.category] ||
                "bg-gray-100 text-gray-500 border-gray-200";
              return (
                <div
                  key={ev._id}
                  className="bg-white p-5 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-800 truncate flex-1">
                      {ev.title}
                    </p>
                    <span
                      className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                      />
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tagColor}`}
                    >
                      {ev.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(ev.startDate)}
                    </span>
                    <span className="text-xs text-gray-400">
                      · {ev.currentParticipants ?? 0}/{ev.maxParticipants} seats
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_TAG_COLORS = {
  Tech: "bg-blue-50 text-blue-600 border-blue-100",
  Cultural: "bg-purple-50 text-purple-600 border-purple-100",
  Sports: "bg-green-50 text-green-600 border-green-100",
  Workshop: "bg-amber-50 text-amber-600 border-amber-100",
};

/* ================================================
   EVENT MANAGEMENT (unchanged, but stays consistent)
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

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
      const matchCategory =
        categoryFilter === "All" || ev.category === categoryFilter;
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

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Event Management
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? "Loading..."
              : `${filtered.length} event${filtered.length !== 1 ? "s" : ""} found`}
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
          <FiSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search events or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-gray-50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
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
          hasFilters={
            search || categoryFilter !== "All" || statusFilter !== "All"
          }
          onClear={() => {
            setSearch("");
            setCategoryFilter("All");
            setStatusFilter("All");
          }}
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
                onDelete={() => {
                  setDeleteTarget(event);
                  setDeleteError("");
                }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                        page === p
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
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
   CREATE EVENT MODAL (unchanged)
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
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
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
      const start = new Date(
        `${formData.startDate}T${formData.startTime || "00:00"}`
      );
      const end = new Date(
        `${formData.endDate}T${formData.endTime || "00:00"}`
      );
      if (start >= end) e.endTime = "End must be after start date & time";
    }
    if (!formData.description.trim()) e.description = "Description is required";
    if (
      !formData.maxParticipants ||
      isNaN(formData.maxParticipants) ||
      Number(formData.maxParticipants) < 1
    )
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
    if (!token) {
      setApiError("Unauthorized. Please login again.");
      return;
    }

    // Combine date + time into ISO datetime strings
    const payload = new FormData();
    const { startDate, startTime, endDate, endTime, ...rest } = formData;
    payload.append(
      "startDate",
      new Date(`${startDate}T${startTime}`).toISOString()
    );
    payload.append(
      "endDate",
      new Date(`${endDate}T${endTime}`).toISOString()
    );
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
            <h2 className="text-base font-bold text-gray-900">
              Create New Event
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fill in the details to publish a new event
            </p>
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
            <p className="text-base font-semibold text-gray-800">
              Event Created!
            </p>
            <p className="text-sm text-gray-400">
              The new event has been added to your list.
            </p>
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
                                ? CATEGORY_COLORS[cat] +
                                  " ring-2 ring-offset-1 ring-current"
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
                          <FiMapPin
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
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
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
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
                        <p className="text-sm font-semibold text-gray-700">
                          Click to upload banner
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          PNG, JPG, WEBP — max 5MB
                        </p>
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
                  {errors.image && (
                    <p className="text-xs text-red-500 mt-1.5">{errors.image}</p>
                  )}
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
                  <>
                    <FiPlus size={15} /> Create Event
                  </>
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
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
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
   EDIT EVENT MODAL (unchanged)
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
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
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
      const start = new Date(
        `${formData.startDate}T${formData.startTime || "00:00"}`
      );
      const end = new Date(
        `${formData.endDate}T${formData.endTime || "00:00"}`
      );
      if (start >= end) e.endTime = "End must be after start date & time";
    }
    if (!formData.description.trim()) e.description = "Description is required";
    if (
      !formData.maxParticipants ||
      isNaN(formData.maxParticipants) ||
      Number(formData.maxParticipants) < 1
    )
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
    if (!token) {
      setApiError("Unauthorized. Please login again.");
      return;
    }

    // Combine date + time into ISO datetime strings
    const payload = new FormData();
    const { startDate, startTime, endDate, endTime, ...rest } = formData;
    payload.append(
      "startDate",
      new Date(`${startDate}T${startTime}`).toISOString()
    );
    payload.append(
      "endDate",
      new Date(`${endDate}T${endTime}`).toISOString()
    );
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FiEdit2 size={15} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Edit Event</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                {event.title}
              </p>
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
            <p className="text-base font-semibold text-gray-800">
              Event Updated!
            </p>
            <p className="text-sm text-gray-400">
              Your changes have been saved successfully.
            </p>
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
                                ? CATEGORY_COLORS[cat] +
                                  " ring-2 ring-offset-1 ring-current"
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
                          <FiMapPin
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
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
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
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
                        <p className="text-sm font-semibold text-gray-700">
                          Click to upload banner
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          PNG, JPG, WEBP — max 5MB
                        </p>
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
                  {errors.image && (
                    <p className="text-xs text-red-500 mt-1.5">{errors.image}</p>
                  )}
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
                  <>
                    <FiSave size={15} /> Save Changes
                  </>
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
   ADMIN EVENT CARD (unchanged)
================================================ */
function AdminEventCard({ event, onEdit, onDelete }) {
  const status = getEventStatus(event.startDate, event.endDate);
  const cardProps = toCardProps(event);

  const statusColors = {
    Upcoming: "bg-blue-50 text-blue-600 border-blue-100",
    Ongoing: "bg-green-50 text-green-600 border-green-100",
    Past: "bg-gray-100 text-gray-500 border-gray-200",
  };

  const categoryColor =
    CATEGORY_COLORS[event.category] ||
    "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Image */}
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        <img
          src={cardProps.image}
          alt={cardProps.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://placehold.co/600x400?text=No+Image";
          }}
        />
        {/* Status badge */}
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}
        >
          {status}
        </span>
        {/* Category badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${categoryColor}`}
        >
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
                <span className="text-blue-500 ml-1">
                  {formatTime(event.startDate)}
                </span>
              )}
              {formatDate(event.startDate) !== formatDate(event.endDate) && (
                <>
                  {" – "}
                  {formatDate(event.endDate)}
                  {hasTime(event.endDate) && (
                    <span className="text-blue-500 ml-1">
                      {formatTime(event.endDate)}
                    </span>
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

/* ── Delete Modal (unchanged) ── */
function DeleteModal({ event, loading, error, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <FiAlertCircle size={22} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Delete Event</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-700">
                "{event.title}"
              </span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <FiTrash2 size={14} /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton (unchanged) ── */
function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse shadow-sm"
        >
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
      <button
        onClick={onRetry}
        className="mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
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
        {hasFilters
          ? "Try adjusting the search or filters."
          : "Create your first event to get started."}
      </p>
      {hasFilters ? (
        <button
          onClick={onClear}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Clear Filters
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Create Event
        </button>
      )}
    </div>
  );
}

/* ================================================
   USER MANAGEMENT — Redesigned UI
   Drop-in replacement. All logic/state preserved.
================================================ */


// ── Shared avatar URL helper (mirrors Navbar.jsx) ──
function getAvatarSrc(userObj) {
  const img = userObj?.profileImage;
  if (!img) return null;
  return img.startsWith("http") ? img : `${BASE_URL}/uploads/${img}`;
}
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 10;
 
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getMyEventStudents();
      setUsers(data);
    } catch {
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
 
  const filtered = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.college?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || (u.status || "active").toLowerCase() === roleFilter;
    return matchSearch && matchRole;
  });
 
  useEffect(() => { setPage(1); }, [search, roleFilter]);
 
  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);
 
  const counts = {
    all: users.length,
    active: users.filter((u) => !u.status || u.status === "active").length,
    approved: users.filter((u) => u.status === "approved").length,
    pending: users.filter((u) => u.status === "pending").length,
  };
 
  const TAB_META = [
    { key: "all",      label: "All",      activeBg: "bg-blue-600 text-white"    },
    { key: "active",   label: "Active",   activeBg: "bg-emerald-600 text-white" },
    { key: "approved", label: "Approved", activeBg: "bg-violet-600 text-white"  },
    { key: "pending",  label: "Pending",  activeBg: "bg-amber-500 text-white"   },
  ];
 
  const STATUS_CFG = {
    approved: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", label: "Approved" },
    pending:  { badge: "bg-amber-50 text-amber-700 ring-amber-200",       dot: "bg-amber-400",   label: "Pending"  },
    active:   { badge: "bg-blue-50 text-blue-700 ring-blue-200",          dot: "bg-blue-400",    label: "Active"   },
    default:  { badge: "bg-gray-50 text-gray-600 ring-gray-200",          dot: "bg-gray-300",    label: "Active"   },
  };
 
  const getStatusCfg = (status) =>
    STATUS_CFG[status?.toLowerCase()] || STATUS_CFG.default;
 
  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-100" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/4" />
                <div className="h-2.5 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="h-5 w-24 bg-gray-100 rounded-full" />
              <div className="h-5 w-16 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }
 
  return (
    <div className="space-y-5">
 
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Student Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} {filtered.length === 1 ? "student" : "students"}
            {roleFilter !== "all" && ` · ${TAB_META.find((t) => t.key === roleFilter)?.label}`}
          </p>
        </div>
 
        {/* Summary stat chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm text-xs font-semibold text-gray-500">
            <FiUsers size={13} className="text-blue-500" />
            <span>{users.length} Total</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm text-xs font-semibold text-gray-500">
            <FiCheckCircle size={13} className="text-emerald-500" />
            <span>{counts.approved} Approved</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm text-xs font-semibold text-gray-500">
            <FiAlertCircle size={13} className="text-amber-500" />
            <span>{counts.pending} Pending</span>
          </div>
        </div>
      </div>
 
      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email or college…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 placeholder-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={13} />
            </button>
          )}
        </div>
 
        {/* Status pill tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
          {TAB_META.map(({ key, label, activeBg }) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                roleFilter === key
                  ? `${activeBg} shadow-sm`
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{label}</span>
              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                roleFilter === key ? "bg-white/25 text-white" : "bg-white text-gray-500"
              }`}>
                {counts[key] ?? filtered.length}
              </span>
            </button>
          ))}
        </div>
      </div>
 
      {/* ── Error State ── */}
      {error ? (
        <div className="bg-white border border-red-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={26} className="text-red-400" />
          </div>
          <p className="text-gray-700 font-semibold text-base">{error}</p>
          <button
            onClick={fetchUsers}
            className="mt-5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
 
      /* ── Empty State ── */
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FiUsers size={26} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-semibold text-base">
            {search || roleFilter !== "all" ? "No students match your filters" : "No students registered yet"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search || roleFilter !== "all" ? "Try adjusting your search or filters." : "Students who register for your events will appear here."}
          </p>
          {(search || roleFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setRoleFilter("all"); }}
              className="mt-5 px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
 
      /* ── Table ── */
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* FIX: overflow-x-auto enables horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            {/* FIX: min-w-[340px] prevents columns from squishing below a readable width */}
            <table className="w-full text-base min-w-[340px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">College</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((user, idx) => {
                  const sc = getStatusCfg(user.status);
                  const rowNum = (page - 1) * USERS_PER_PAGE + idx + 1;
                  const initials = user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?";
 
                  return (
                    <tr
                      key={user._id || idx}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Row number */}
                      <td className="px-5 py-4 text-sm text-gray-300 font-mono">{rowNum}</td>
 
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-blue-100">
                            {getAvatarSrc(user) ? (
                              <img
                                src={getAvatarSrc(user)}
                                alt={user.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm"
                              style={{ display: getAvatarSrc(user) ? "none" : "flex" }}
                            >
                              {initials}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate leading-tight">{user.name || "Unknown"}</p>
                            <p className="text-sm text-gray-400 truncate mt-0.5">{user.email || "—"}</p>
                          </div>
                        </div>
                      </td>
 
                      {/* College */}
                      <td className="px-5 py-4 hidden md:table-cell max-w-[200px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FiMapPin size={12} className="text-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-500 truncate">
                            {user.college || <span className="text-gray-300">—</span>}
                          </span>
                        </div>
                      </td>
 
                      {/* Joined */}
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar size={12} className="text-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-400 whitespace-nowrap">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </td>
 
                      {/* Status — FIX: smaller badge on mobile, normal on sm+ */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold ring-1 ${sc.badge}`}>
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
 
          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              <p className="text-sm text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-600">{(page - 1) * USERS_PER_PAGE + 1}</span>
                –
                <span className="font-semibold text-gray-600">{Math.min(page * USERS_PER_PAGE, filtered.length)}</span>
                {" "}of{" "}
                <span className="font-semibold text-gray-600">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FiChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn;
                  if (totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return (
                    <button
                      key={pn}
                      onClick={() => setPage(pn)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition ${
                        page === pn
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pn}
                    </button>
                  );
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================
   REGISTRATIONS — Redesigned UI
   Drop-in replacement for the Registrations()
   function in AdminDashboard.jsx
   All logic/state/props are preserved exactly.
================================================ */

function Registrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState([]);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const REGS_PER_PAGE = 10;

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getAllRegistrations();
      // Log the admin id and name
      

      console.log("Fetched registrations data:", data); // Debug log to inspect the raw data structure
      setEvents(data.events);
      // FIX 1: backend already populates eventId, so just use r.eventId?.title directly.
      // The old eventMap[r.eventId] fallback was broken because r.eventId is a populated
      // object, not a plain string ID, so the map lookup always missed.
      setRegistrations(
        data.registrations.map((r) => ({
          ...r,
          eventTitle: r.eventId?.title || "Unknown",
        }))
      );
    } catch (err) {
      // FIX 2: replaced silent catch — now surfaces the real error so you can diagnose it.
      toast.error(err.response?.data?.message || "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (id) => {
    try {
      setActionId(id);
      await approveRegistration(id);
      setRegistrations((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: "approved" } : r))
      );
      toast.success("Registration approved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this registration?")) return;
    try {
      setActionId(id);
      await rejectRegistration(id);
      setRegistrations((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: "rejected" } : r))
      );
      toast.success("Registration rejected");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionId(null);
    }
  };

  const handleExportRegistrations = async () => {
    try {
      setExporting(true);
      let response, filename;
      if (selectedEvent === "all") {
        switch (exportFormat) {
          case "csv":   response = await exportAllRegistrationsCSV();   filename = `all_registrations_${Date.now()}.csv`;  break;
          case "excel": response = await exportAllRegistrationsExcel(); filename = `all_registrations_${Date.now()}.xlsx`; break;
          case "pdf":   response = await exportAllRegistrationsPDF();   filename = `all_registrations_${Date.now()}.pdf`;  break;
          case "json":  response = await exportAllRegistrationsJSON();  filename = `all_registrations_${Date.now()}.json`; break;
          default: return;
        }
      } else {
        // FIX 3: selectedEvent is now an _id, so find by _id directly instead of by title.
        const selectedEventObj = events.find((ev) => ev._id === selectedEvent);
        if (!selectedEventObj) { toast.error("Please select an event first"); return; }
        const evTitle = selectedEventObj.title;
        switch (exportFormat) {
          case "csv":   response = await exportRegistrationsCSV(selectedEventObj._id);   filename = `registrations_${evTitle}_${Date.now()}.csv`;  break;
          case "excel": response = await exportRegistrationsExcel(selectedEventObj._id); filename = `registrations_${evTitle}_${Date.now()}.xlsx`; break;
          case "pdf":   response = await exportRegistrationsPDF(selectedEventObj._id);   filename = `registrations_${evTitle}_${Date.now()}.pdf`;  break;
          case "json":  response = await exportRegistrationsJSON(selectedEventObj._id);  filename = `registrations_${evTitle}_${Date.now()}.json`; break;
          default: return;
        }
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Export successful");
    } catch {
      toast.error("Failed to export registrations");
    } finally {
      setExporting(false);
    }
  };

  const counts = {
    all:      registrations.length,
    pending:  registrations.filter((r) => r.status === "pending").length,
    approved: registrations.filter((r) => r.status === "approved").length,
    rejected: registrations.filter((r) => r.status === "rejected").length,
  };

  const filtered = registrations.filter((r) => {
    // FIX 3 (cont): filter now compares r.eventId?._id against selectedEvent (_id string)
    // instead of comparing eventTitle strings, which was fragile and could mis-match.
    const matchEvent  = selectedEvent === "all" || r.eventId?._id === selectedEvent;
    const matchStatus = statusTab === "all" || r.status === statusTab;
    const matchSearch =
      !search ||
      r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.eventTitle?.toLowerCase().includes(search.toLowerCase());
    return matchEvent && matchStatus && matchSearch;
  });

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, selectedEvent, statusTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REGS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * REGS_PER_PAGE, page * REGS_PER_PAGE);

  /* ── status badge config ── */
  const STATUS = {
    pending:  { label: "Pending",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-amber-200"       },
    approved: { label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    rejected: { label: "Rejected", dot: "bg-red-400",     badge: "bg-red-50 text-red-600 ring-red-200"             },
  };

  const TAB_META = [
    { key: "all",      label: "All",      color: "text-gray-600",    activeBg: "bg-blue-600 text-white"    },
    { key: "pending",  label: "Pending",  color: "text-amber-600",   activeBg: "bg-amber-500 text-white"   },
    { key: "approved", label: "Approved", color: "text-emerald-600", activeBg: "bg-emerald-600 text-white" },
    { key: "rejected", label: "Rejected", color: "text-red-500",     activeBg: "bg-red-500 text-white"     },
  ];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-100" />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/4" />
                <div className="h-2.5 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="h-5 w-24 bg-gray-100 rounded-full" />
              <div className="h-6 w-20 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Registrations</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {statusTab !== "all" && ` · ${TAB_META.find(t => t.key === statusTab)?.label}`}
          </p>
        </div>

        {/* Export controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {events.length > 0 && (
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 min-w-[140px]"
            >
              <option value="all">All Events</option>
              {/* FIX 3: use ev._id as option value instead of ev.title */}
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>{ev.title}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-1 py-1">
            {["csv","excel","pdf","json"].map(fmt => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all uppercase tracking-wide ${
                  exportFormat === fmt
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportRegistrations}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            {exporting
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <FiDownload size={14} />
            }
            Export
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student, email or event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={13} />
            </button>
          )}
        </div>

        {/* Status pill tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
          {TAB_META.map(({ key, label, activeBg }) => (
            <button
              key={key}
              onClick={() => setStatusTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                statusTab === key
                  ? `${activeBg} shadow-sm`
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{label}</span>
              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                statusTab === key ? "bg-white/25 text-white" : "bg-white text-gray-500"
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle size={26} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-semibold text-base">No registrations found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search term.</p>
          {(search || statusTab !== "all" || selectedEvent !== "all") && (
            <button
              onClick={() => { setSearch(""); setStatusTab("all"); setSelectedEvent("all"); }}
              className="mt-5 px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Event</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">College</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Applied</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((reg, idx) => {
                  const student  = reg.userId;
                  const isActing = actionId === reg._id;
                  const sc       = STATUS[reg.status] || STATUS.pending;
                  const rowNum   = (page - 1) * REGS_PER_PAGE + idx + 1;

                  return (
                    <tr
                      key={reg._id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Row number */}
                      <td className="px-5 py-4 text-sm text-gray-300 font-mono">{rowNum}</td>

                      {/* Student — avatar + name + email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-blue-100">
                            {getAvatarSrc(student) ? (
                              <img
                                src={getAvatarSrc(student)}
                                alt={student?.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm"
                              style={{ display: getAvatarSrc(student) ? "none" : "flex" }}
                            >
                              {student?.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate leading-tight">
                              {student?.name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-400 truncate mt-0.5">{student?.email || "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="px-5 py-4 hidden md:table-cell max-w-[220px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FiCalendar size={12} className="text-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-600 truncate">{reg.eventTitle || "—"}</span>
                        </div>
                      </td>

                      {/* College */}
                      <td className="px-5 py-4 hidden lg:table-cell max-w-[180px]">
                        <span className="text-sm text-gray-500 truncate block">
                          {student?.college || <span className="text-gray-300">—</span>}
                        </span>
                      </td>

                      {/* Applied date */}
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                          {reg.createdAt ? formatDate(reg.createdAt) : "—"}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-1 ${sc.badge}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {reg.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(reg._id)}
                              disabled={isActing}
                              title="Approve"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-emerald-100"
                            >
                              {isActing
                                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <FiCheckCircle size={14} />
                              }
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(reg._id)}
                              disabled={isActing}
                              title="Reject"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                              {isActing
                                ? <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                                : <FiX size={14} />
                              }
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300 pr-1">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              <p className="text-sm text-gray-400">
                Showing <span className="font-semibold text-gray-600">{(page - 1) * REGS_PER_PAGE + 1}</span>–<span className="font-semibold text-gray-600">{Math.min(page * REGS_PER_PAGE, filtered.length)}</span> of <span className="font-semibold text-gray-600">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FiChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn;
                  if (totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return (
                    <button
                      key={pn}
                      onClick={() => setPage(pn)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition ${
                        page === pn
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pn}
                    </button>
                  );
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/* ================================================
   ATTENDANCE SECTION (unchanged)
================================================ */

const NATIVE_SUPPORTED =
  typeof window !== "undefined" && "BarcodeDetector" in window;

/* ── Download helper ── */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Pure-JS Excel builder (no library needed) ──
   Produces a valid .xlsx with a styled header row.
   Uses the Open XML SpreadsheetML format which Excel,
   Google Sheets, and LibreOffice all open natively.    ── */
function buildExcel(eventTitle, rows) {
  const cols = ["Student Name", "Email", "College", "Attended", "Attended At"];
  const fields = ["name", "email", "college", "attended", "attendedAt"];

  const colLetter = (i) => String.fromCharCode(65 + i); // A, B, C …

  const escXml = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  // Shared strings table
  const strings = [];
  const si = (v) => {
    const s = escXml(v);
    const i = strings.indexOf(s);
    if (i !== -1) return i;
    strings.push(s);
    return strings.length - 1;
  };

  // Pre-register all strings
  cols.forEach(si);
  rows.forEach((r) => fields.forEach((f) => si(r[f])));

  // Sheet rows XML
  const headerCells = cols
    .map(
      (c, i) =>
        `<c r="${colLetter(i)}1" t="s" s="1"><v>${si(c)}</v></c>`
    )
    .join("");

  const dataRows = rows
    .map((r, ri) => {
      const cells = fields
        .map(
          (f, ci) =>
            `<c r="${colLetter(ci)}${ri + 2}" t="s"><v>${si(r[f])}</v></c>`
        )
        .join("");
      return `<row r="${ri + 2}">${cells}</row>`;
    })
    .join("");

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><selection activeCell="A1"/></sheetView></sheetViews>
  <cols>
    <col min="1" max="1" width="28" bestFit="1" customWidth="1"/>
    <col min="2" max="2" width="32" bestFit="1" customWidth="1"/>
    <col min="3" max="3" width="28" bestFit="1" customWidth="1"/>
    <col min="4" max="4" width="12" bestFit="1" customWidth="1"/>
    <col min="5" max="5" width="24" bestFit="1" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
</worksheet>`;

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map((s) => `<si><t xml:space="preserve">${s}</t></si>`).join("\n")}
</sst>`;

  // Bold style for header row (style index 1)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts><font><sz val="11"/></font><font><b/><sz val="11"/></font></fonts>
  <fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escXml(eventTitle.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"              ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"     ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml"         ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml"                ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const topRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // Pack into ZIP (xlsx is a ZIP)
  const files = {
    "[Content_Types].xml": contentTypesXml,
    "_rels/.rels": topRelsXml,
    "xl/workbook.xml": workbookXml,
    "xl/_rels/workbook.xml.rels": relsXml,
    "xl/worksheets/sheet1.xml": sheetXml,
    "xl/sharedStrings.xml": sharedStringsXml,
    "xl/styles.xml": stylesXml,
  };

  return zipFiles(files);
}

/* ── Minimal ZIP builder ── */
function zipFiles(files) {
  const enc = new TextEncoder();
  const parts = [];

  const crc32 = (bytes) => {
    let c = 0xffffffff;
    const table =
      crc32.t ||
      (crc32.t = (() => {
        const t = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let n = i;
          for (let j = 0; j < 8; j++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
          t[i] = n;
        }
        return t;
      })());
    for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const u16 = (n) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

  const centralDir = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(content);
    const crc = crc32(data);
    const size = data.length;

    const local = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // local file header sig
      20, 0, // version needed
      0, 0, // flags
      0, 0, // compression (stored)
      0, 0, 0, 0, // mod time/date
      ...u32(crc),
      ...u32(size),
      ...u32(size), // compressed = uncompressed
      ...u16(nameBytes.length),
      0, 0,
      ...nameBytes,
    ]);

    parts.push(local, data);

    centralDir.push(
      new Uint8Array([
        0x50, 0x4b, 0x01, 0x02,
        20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ...u32(crc),
        ...u32(size),
        ...u32(size),
        ...u16(nameBytes.length),
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ...u32(offset),
        ...nameBytes,
      ])
    );

    offset += local.length + size;
  }

  const cdSize = centralDir.reduce((s, b) => s + b.length, 0);
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0,
    ...u16(centralDir.length),
    ...u16(centralDir.length),
    ...u32(cdSize),
    ...u32(offset),
    0, 0,
  ]);

  const total =
    parts.reduce((s, b) => s + b.length, 0) +
    centralDir.reduce((s, b) => s + b.length, 0) +
    eocd.length;

  const out = new Uint8Array(total);
  let pos = 0;
  for (const b of [...parts, ...centralDir, eocd]) {
    out.set(b, pos);
    pos += b.length;
  }

  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function AttendanceSection() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [search, setSearch] = useState("");
  const [attendedFilter, setAttendedFilter] = useState("all");
  const [exporting, setExporting] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeResult, setCodeResult] = useState(null); // { success, message }

  const handleVerifyCode = async () => {
    if (!codeInput.trim() || codeInput.trim().length !== 6 || !selectedEventId) return;
    try {
      setCodeLoading(true);
      setCodeResult(null);
      const res = await fetch(
        (await import("../services/api")).BASE_URL + "/api/registrations/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ code: codeInput.trim(), eventId: selectedEventId }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setCodeResult({ success: true, message: `✅ ${data.student?.name} marked present` });
        setCodeInput("");
        // refresh attendance list
        const { data: updated } = await getEventAttendance(selectedEventId);
        setAttendance(updated);
      } else {
        setCodeResult({ success: false, message: data.message || "Invalid code" });
      }
    } catch {
      setCodeResult({ success: false, message: "Failed to verify code. Try again." });
    } finally {
      setCodeLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getMyEvents();
        setEvents(data);
        if (data.length > 0) setSelectedEventId(data[0]._id);
      } catch {
        /**/
      } finally {
        setLoadingEvents(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setAttendance(null);
      return;
    }
    const load = async () => {
      try {
        setLoadingReport(true);
        setAttendance(null);
        const { data } = await getEventAttendance(selectedEventId);
        setAttendance(data);
      } catch {
        setAttendance(null);
      } finally {
        setLoadingReport(false);
      }
    };
    load();
  }, [selectedEventId]);

  const handleExport = async (format = "csv") => {
    if (!attendance) return;
    try {
      setExporting(format);

      const rows = attendance.registrations.map((r) => ({
        name: r.student?.name || "",
        email: r.student?.email || "",
        college: r.student?.college || "",
        attended: r.attended ? "Yes" : "No",
        attendedAt: r.attendedAt
          ? new Date(r.attendedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "",
      }));

      const title = attendance.eventTitle.replace(/\s+/g, "_");
      const filename = `attendance_${title}_${Date.now()}`;

      if (format === "csv") {
        const header = ["Student Name", "Email", "College", "Attended", "Attended At"];
        const lines = [
          header,
          ...rows.map((r) => [
            r.name,
            r.email,
            r.college,
            r.attended,
            r.attendedAt,
          ]),
        ];
        const csv = lines
          .map((row) =>
            row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");
        triggerDownload(new Blob([csv], { type: "text/csv" }), filename + ".csv");
      }

      if (format === "excel") {
        const blob = buildExcel(attendance.eventTitle, rows);
        triggerDownload(blob, filename + ".xlsx");
      }
    } catch {
      /**/
    } finally {
      setExporting(null);
    }
  };

  const filteredRows = (attendance?.registrations || []).filter((r) => {
    const matchSearch =
      !search ||
      r.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.student?.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      attendedFilter === "all" ||
      (attendedFilter === "attended" && r.attended) ||
      (attendedFilter === "absent" && !r.attended);
    return matchSearch && matchFilter;
  });

  const attendedPct =
    attendance && attendance.totalApproved > 0
      ? Math.round((attendance.totalAttended / attendance.totalApproved) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Attendance</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Scan student QR codes and track event attendance
          </p>
        </div>
        {attendance && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleExport("excel")}
              disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-emerald-200"
            >
              {exporting === "excel" ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiDownload size={15} />
              )}
              Export Excel
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-60 active:scale-95 text-gray-700 text-sm font-semibold rounded-xl transition-all border border-gray-200"
            >
              {exporting === "csv" ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <FiDownload size={15} />
              )}
              CSV
            </button>
          </div>
        )}
      </div>

      {/* ── Event Selector ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
          Select event
        </label>
        {loadingEvents ? (
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-full sm:w-80" />
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-400">No events found. Create an event first.</p>
        ) : (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full sm:w-96 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 bg-white text-gray-800 font-medium transition-all"
          >
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Scan Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 p-5 sm:p-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
            <FiCamera size={24} color="#fff" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-gray-800">
              Scan QR codes at the event
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Open the check-in scanner on your phone or tablet at the venue entrance.
              It runs independently — no dashboard navigation, just point and scan.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard/collegeadmin/check-in")}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-200 whitespace-nowrap flex-shrink-0"
          >
            <FiCamera size={15} />
            Open Scanner
          </button>
        </div>
      </div>

      {/* ── Code Verification Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FiCheckSquare size={16} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-800">
                Manual Code Entry
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Use when QR scan fails — enter the 6-digit code from student's ticket
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.replace(/\D/g, ""));
                setCodeResult(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
              placeholder="Enter 6-digit code"
              className="flex-1 text-center text-xl font-bold tracking-[0.4em] border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-gray-50 transition-all placeholder:text-gray-300 placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
              disabled={codeLoading || !selectedEventId}
            />
            <button
              onClick={handleVerifyCode}
              disabled={codeInput.length !== 6 || codeLoading || !selectedEventId}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              {codeLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiCheckCircle size={15} />
              )}
              Verify Code
            </button>
          </div>
          {codeResult && (
            <div
              className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                codeResult.success
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              {codeResult.message}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {attendance && !loadingReport && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Approved */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FiUsers size={14} />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-base sm:text-xl font-bold text-gray-800 leading-none">
                {attendance.totalApproved}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Approved</p>
            </div>
          </div>
          {/* Attended */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-2.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <FiCheckCircle size={14} />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-base sm:text-xl font-bold text-gray-800 leading-none">
                {attendance.totalAttended}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Attended</p>
            </div>
          </div>
          {/* Rate */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-2.5 sm:p-4">
            <div className="flex justify-between items-center mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Rate</p>
              <p className="text-[10px] sm:text-xs font-bold text-gray-700">
                {attendedPct}%
              </p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${attendedPct}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
              {attendance.totalApproved - attendance.totalAttended} absent
            </p>
          </div>
        </div>
      )}

      {/* ── Attendance Table ── */}
      {loadingReport ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-50 animate-pulse"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : attendance ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <div className="relative flex-1">
              <FiSearch
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
              />
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 bg-gray-50 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
                >
                  <FiX size={13} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  value: "all",
                  label: "All",
                  count: attendance.registrations.length,
                },
                {
                  value: "attended",
                  label: "Present",
                  count: attendance.totalAttended,
                },
                {
                  value: "absent",
                  label: "Absent",
                  count: attendance.totalApproved - attendance.totalAttended,
                },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setAttendedFilter(f.value)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    attendedFilter === f.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                  <span
                    className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      attendedFilter === f.value
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rows */}
          {filteredRows.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FiUsers size={20} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No results match your filters</p>
            </div>
          ) : (
            filteredRows.map((row, i) => (
              <div
                key={row.registrationId || i}
                className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* ✅ Profile image with initials fallback */}
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                    {getAvatarSrc(row.student) ? (
                      <img
                        src={getAvatarSrc(row.student)}
                        alt={row.student?.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex items-center justify-center font-bold text-sm transition-colors ${
                        row.attended
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                      style={{ display: getAvatarSrc(row.student) ? "none" : "flex" }}
                    >
                      {row.student?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate leading-snug">
                      {row.student?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{row.student?.email}</p>
                  </div>
                </div>

                {/* Attended at — desktop only */}
                <div className="hidden lg:block flex-shrink-0 text-right">
                  {row.attended && row.attendedAt ? (
                    <p className="text-xs text-gray-400">
                      {new Date(row.attendedAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-200">—</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  {row.attended ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      Absent
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : !loadingEvents && selectedEventId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiAlertCircle size={20} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">
            Could not load attendance data for this event.
          </p>
        </div>
      ) : null}
    </div>
  );
}
/* ================================================
   ADMIN LOGS (unchanged)
================================================ */
/* ================================================
   ADMIN LOGS — Fixed version
   • Avatar image: uses same src logic as Navbar.jsx
       (startsWith("http") ? url : BASE_URL + "/uploads/" + path)
   • Details column: wraps fully, never truncates
   • User data from useAuth() — no extra fetch
   • Indigo color scheme throughout, no dark buttons
   
   Replace the entire AdminLogs() function in AdminDashboard.jsx.
   Ensure these are imported at the top of AdminDashboard.jsx:
     import { useAuth } from "../context/AuthContext";
     import { getAdminLogs, BASE_URL } from "../services/api";
================================================ */
function AdminLogs() {
  const { user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [entities, setEntities] = useState([]);
  const [stats, setStats] = useState({
    total: 0, created: 0, updated: 0, deleted: 0, approved: 0, rejected: 0,
  });

  const LOGS_PER_PAGE = 10;

  /* ─────────────────────────────────────────
     AVATAR HELPER — mirrors Navbar.jsx exactly:
       if profileImage starts with "http" → use as-is (Google OAuth / CDN)
       otherwise → prepend BASE_URL/uploads/
     Returns null if no image so we fall back to initials.
  ───────────────────────────────────────── */
  const getAvatarSrc = (adminObj) => {
    const img = adminObj?.profileImage;
    if (!img) return null;
    return img.startsWith("http") ? img : `${BASE_URL}/uploads/${img}`;
  };

  /* ── Fetch logs ── */
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res  = await getAdminLogs();
        const data = res.data || [];
        setLogs(data);
        setFilteredLogs(data);
        setStats({
          total:    data.length,
          created:  data.filter((l) => l.action?.includes("CREATED")).length,
          updated:  data.filter((l) => l.action?.includes("UPDATED")).length,
          deleted:  data.filter((l) => l.action?.includes("DELETED")).length,
          approved: data.filter((l) => l.action?.includes("APPROVED")).length,
          rejected: data.filter((l) => l.action?.includes("REJECTED")).length,
        });
        const entitySet = new Set();
        data.forEach((log) => { if (log.targetEntityType) entitySet.add(log.targetEntityType); });
        setEntities(Array.from(entitySet).sort());
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setError("Failed to load admin logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  /* ── Filter logic ── */
  useEffect(() => {
    if (!logs.length) { setFilteredLogs([]); return; }
    let temp = [...logs];
    if (search) {
      const s = search.toLowerCase();
      temp = temp.filter((log) =>
        (log.action || "").toLowerCase().includes(s) ||
        (log.adminId?.name || "").toLowerCase().includes(s) ||
        (log.targetEntityType || "").toLowerCase().includes(s) ||
        JSON.stringify(log.details || "").toLowerCase().includes(s)
      );
    }
    if (actionFilter !== "ALL") temp = temp.filter((l) => l.action?.includes(actionFilter));
    if (entityFilter !== "ALL") temp = temp.filter((l) => l.targetEntityType === entityFilter);
    if (dateRange.start) {
      const d = new Date(dateRange.start); d.setHours(0, 0, 0, 0);
      temp = temp.filter((l) => l.createdAt && new Date(l.createdAt) >= d);
    }
    if (dateRange.end) {
      const d = new Date(dateRange.end); d.setHours(23, 59, 59, 999);
      temp = temp.filter((l) => l.createdAt && new Date(l.createdAt) <= d);
    }
    setFilteredLogs(temp);
    setPage(1);
  }, [search, actionFilter, entityFilter, dateRange.start, dateRange.end, logs]);

  /* ── Badge helpers ── */
  const getActionStyle = (action) => {
    if (!action) return "bg-gray-100 text-gray-500 ring-gray-200";
    if (action.includes("CREATED"))  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (action.includes("UPDATED"))  return "bg-amber-50 text-amber-700 ring-amber-200";
    if (action.includes("DELETED"))  return "bg-red-50 text-red-600 ring-red-200";
    if (action.includes("APPROVED")) return "bg-teal-50 text-teal-700 ring-teal-200";
    if (action.includes("REJECTED")) return "bg-rose-50 text-rose-600 ring-rose-200";
    return "bg-gray-100 text-gray-500 ring-gray-200";
  };

  const getActionDot = (action) => {
    if (!action) return "bg-gray-300";
    if (action.includes("CREATED"))  return "bg-emerald-500";
    if (action.includes("UPDATED"))  return "bg-amber-400";
    if (action.includes("DELETED"))  return "bg-red-400";
    if (action.includes("APPROVED")) return "bg-teal-500";
    if (action.includes("REJECTED")) return "bg-rose-400";
    return "bg-gray-300";
  };

  const getEntityIcon = (type) => ({
    Event:        <FiCalendar size={11} />,
    User:         <FiUser size={11} />,
    Registration: <FiCheckCircle size={11} />,
    Discussion:   <FiMessageSquare size={11} />,
  }[type] || <FiFileText size={11} />);

  const getEntityBadgeStyle = (type) => ({
    Event:        "bg-blue-50 text-blue-600 ring-blue-100",
    User:         "bg-violet-50 text-violet-600 ring-violet-100",
    Registration: "bg-teal-50 text-teal-600 ring-teal-100",
    Discussion:   "bg-orange-50 text-orange-600 ring-orange-100",
  }[type] || "bg-gray-50 text-gray-500 ring-gray-200");

  /* ─────────────────────────────────────────
     DETAILS HELPER — returns an array of
     { label, value } pairs so we can render
     each detail on its own line, fully visible.
  ───────────────────────────────────────── */
  const getDetailItems = (log) => {
    const items = [];
    const d = log.details || {};

    if (d.title)       items.push({ label: "Title",   value: d.title });
    if (d.name)        items.push({ label: "Name",    value: d.name });
    if (d.email)       items.push({ label: "Email",   value: d.email });
    if (d.eventId)     items.push({ label: "Event",   value: d.eventId });
    if (d.location)    items.push({ label: "Location",value: d.location });
    if (d.category)    items.push({ label: "Category",value: d.category });
    if (d.description) items.push({ label: "Desc",    value: d.description });

    // Catch-all: any other keys not handled above
    const handled = new Set(["title","name","email","eventId","location","category","description"]);
    Object.entries(d).forEach(([k, v]) => {
      if (!handled.has(k) && v !== null && v !== undefined && v !== "") {
        items.push({ label: k.charAt(0).toUpperCase() + k.slice(1), value: String(v) });
      }
    });

    // Fallback to targetEntityId if nothing else
    if (!items.length && log.targetEntityId)
      items.push({ label: "ID", value: log.targetEntityId });

    return items;
  };

  const formatLogDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return "—"; }
  };

  const formatRelativeTime = (date) => {
    if (!date) return "—";
    try {
      const ms    = Date.now() - new Date(date);
      const mins  = Math.floor(ms / 60000);
      const hours = Math.floor(ms / 3600000);
      const days  = Math.floor(ms / 86400000);
      if (mins  < 1)  return "Just now";
      if (mins  < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days  < 7)  return `${days}d ago`;
      return formatLogDate(date);
    } catch { return "—"; }
  };

  const clearFilters = () => {
    setSearch(""); setActionFilter("ALL"); setEntityFilter("ALL");
    setDateRange({ start: "", end: "" });
  };

  const handleExportCSV = () => {
    const rows = [
      ["Action", "Entity Type", "Details", "Admin", "Admin Email", "Time"],
      ...filteredLogs.map((log) => {
        const detailStr = getDetailItems(log).map((i) => `${i.label}: ${i.value}`).join(" | ");
        return [
          log.action || "",
          log.targetEntityType || "",
          detailStr,
          log.adminId?.name || "Admin",
          log.adminId?.email || "",
          formatLogDate(log.createdAt),
        ];
      }),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `admin_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const totalPages    = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);
  const hasFilters    = search || actionFilter !== "ALL" || entityFilter !== "ALL" || dateRange.start || dateRange.end;

  /* ── Stat cards ── */
  const statCards = [
    { label: "Total Logs",             value: stats.total,                        icon: <FiFileText size={15} />,   iconCls: "text-indigo-500", bg: "bg-indigo-50",  ring: "ring-indigo-100"  },
    { label: "Modifications",          value: stats.created+stats.updated+stats.deleted, icon: <FiEdit2 size={15} />, iconCls: "text-amber-500",  bg: "bg-amber-50",   ring: "ring-amber-100"   },
    { label: "Approvals / Rejections", value: stats.approved+stats.rejected,      icon: <FiCheckCircle size={15} />, iconCls: "text-teal-500", bg: "bg-teal-50",    ring: "ring-teal-100"    },
  ];

  /* ── Action pill tabs ── */
  const ACTION_TABS = [
    { key: "ALL",      label: "All",      count: stats.total,    activeBg: "bg-indigo-600 text-white"  },
    { key: "CREATED",  label: "Created",  count: stats.created,  activeBg: "bg-emerald-600 text-white" },
    { key: "UPDATED",  label: "Updated",  count: stats.updated,  activeBg: "bg-amber-500 text-white"   },
    { key: "DELETED",  label: "Deleted",  count: stats.deleted,  activeBg: "bg-red-500 text-white"     },
    { key: "APPROVED", label: "Approved", count: stats.approved, activeBg: "bg-teal-600 text-white"    },
    { key: "REJECTED", label: "Rejected", count: stats.rejected, activeBg: "bg-rose-500 text-white"    },
  ];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-52 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-100" />
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 animate-pulse">
              <div className="w-6 h-4 bg-gray-100 rounded" />
              <div className="w-24 h-6 rounded-full bg-gray-100" />
              <div className="w-16 h-5 rounded-full bg-gray-100" />
              <div className="flex-1 h-4 bg-gray-100 rounded" />
              <div className="w-32 h-9 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="w-20 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Admin Activity Logs</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
            {user?.name ? ` · Viewing as ${user.name}` : ""}
          </p>
        </div>
        {filteredLogs.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 whitespace-nowrap"
          >
            <FiDownload size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center flex-shrink-0 ${s.iconCls}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide leading-none mb-1.5">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800 leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search action, admin, entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-gray-50 placeholder-gray-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <FiX size={13} />
              </button>
            )}
          </div>
          {/* Entity */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            disabled={entities.length === 0}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50 text-gray-700 min-w-[130px] disabled:opacity-40 transition-all"
          >
            <option value="ALL">All Entities</option>
            {entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {/* Date range */}
          <div className="flex gap-2">
            <input type="date" value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            <input type="date" value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>
        {/* Action tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {ACTION_TABS.map(({ key, label, count, activeBg }) => (
            <button
              key={key}
              onClick={() => setActionFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                actionFilter === key ? `${activeBg} shadow-sm` : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span>{label}</span>
              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                actionFilter === key ? "bg-white/25 text-white" : "bg-white text-gray-500"
              }`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                <FiSearch size={10} /> "{search}"
                <button onClick={() => setSearch("")} className="ml-0.5 hover:text-indigo-900">×</button>
              </span>
            )}
            {entityFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <FiTag size={10} /> {entityFilter}
                <button onClick={() => setEntityFilter("ALL")} className="ml-0.5 hover:text-blue-900">×</button>
              </span>
            )}
            {dateRange.start && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                <FiCalendar size={10} /> From: {dateRange.start}
                <button onClick={() => setDateRange({ ...dateRange, start: "" })} className="ml-0.5 hover:text-gray-900">×</button>
              </span>
            )}
            {dateRange.end && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                <FiCalendar size={10} /> To: {dateRange.end}
                <button onClick={() => setDateRange({ ...dateRange, end: "" })} className="ml-0.5 hover:text-gray-900">×</button>
              </span>
            )}
          </div>
          <button onClick={clearFilters} className="text-xs font-semibold text-red-500 hover:text-red-600 transition">Clear All</button>
        </div>
      )}

      {/* ── Error ── */}
      {error ? (
        <div className="bg-white border border-red-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle size={26} className="text-red-400" />
          </div>
          <p className="text-gray-700 font-semibold">{error}</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-all">
            Try Again
          </button>
        </div>

      /* ── Empty ── */
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FiFileText size={26} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-semibold text-base">No logs found</p>
          <p className="text-sm text-gray-400 mt-1">
            {hasFilters ? "Try adjusting your filters or search term." : "No admin activity has been logged yet."}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="mt-5 px-5 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-all">
              Clear Filters
            </button>
          )}
        </div>

      /* ── Table ── */
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Entity</th>
                  {/* Details — no max-w cap, no truncate, text wraps fully */}
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Details</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedLogs.map((log, idx) => {
                  const rowNum        = (page - 1) * LOGS_PER_PAGE + idx + 1;
                  const isCurrentAdmin = user?._id && log.adminId?._id === user._id;
                  const adminAvatarSrc = getAvatarSrc(log.adminId);   // ✅ image from profileImage field
                  const adminInitial   = log.adminId?.name ? log.adminId.name.charAt(0).toUpperCase() : "A";
                  const detailItems    = getDetailItems(log);

                  return (
                    <tr
                      key={log._id}
                      className={`transition-colors group align-top ${
                        isCurrentAdmin ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-gray-50/60"
                      }`}
                    >
                      {/* # */}
                      <td className="px-5 py-4 text-sm text-gray-300 font-mono">{rowNum}</td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-1 ${getActionStyle(log.action)}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getActionDot(log.action)}`} />
                          {log.action ? log.action.replace(/_/g, " ") : "Unknown"}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${getEntityBadgeStyle(log.targetEntityType)}`}>
                          {getEntityIcon(log.targetEntityType)}
                          {log.targetEntityType || "—"}
                        </span>
                      </td>

                      {/* ── Details ──────────────────────────────────────
                          Each detail on its own line as "Label: value".
                          No truncation — long IDs and titles display fully.
                          break-all on value ensures very long strings (like
                          Mongo ObjectIds) wrap instead of overflowing.
                      ─────────────────────────────────────────────────── */}
                      <td className="px-5 py-4 hidden lg:table-cell min-w-[220px] max-w-[320px]">
                        {detailItems.length > 0 ? (
                          <div className="space-y-1">
                            {detailItems.map((item, i) => (
                              <div key={i} className="flex gap-1.5 items-start">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap mt-0.5 flex-shrink-0">
                                  {item.label}:
                                </span>
                                <span className="text-sm text-gray-600 break-all leading-snug">
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>

                      {/* ── Admin ──────────────────────────────────────
                          Avatar uses getAvatarSrc() — same logic as Navbar.
                          Falls back to gradient + initial if no image.
                      ─────────────────────────────────────────────────── */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-indigo-100">
                            {adminAvatarSrc ? (
                              <img
                                src={adminAvatarSrc}
                                alt={log.adminId?.name || "Admin"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // If image fails to load, hide it and show fallback
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            {/* Fallback initials div — shown when no image or image fails */}
                            <div
                              className="w-full h-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-bold text-sm"
                              style={{ display: adminAvatarSrc ? "none" : "flex" }}
                            >
                              {adminInitial}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate leading-tight">
                              {log.adminId?.name || "Admin"}
                              {isCurrentAdmin && (
                                <span className="ml-1.5 text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full align-middle">You</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-400 truncate mt-0.5">{log.adminId?.email || "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-sm font-medium text-gray-600 whitespace-nowrap">{formatRelativeTime(log.createdAt)}</p>
                        <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{formatLogDate(log.createdAt)}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              <p className="text-sm text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-600">{(page - 1) * LOGS_PER_PAGE + 1}</span>–<span className="font-semibold text-gray-600">{Math.min(page * LOGS_PER_PAGE, filteredLogs.length)}</span>
                {" "}of{" "}
                <span className="font-semibold text-gray-600">{filteredLogs.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <FiChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn;
                  if (totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return (
                    <button key={pn} onClick={() => setPage(pn)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition ${
                        page === pn ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}>
                      {pn}
                    </button>
                  );
                })}
                <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}