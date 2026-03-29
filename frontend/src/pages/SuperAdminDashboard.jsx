// SuperAdminDashboard.jsx
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

import {
  FiUsers,
  FiShield,
  FiSettings,
  FiActivity,
  FiHome,
  FiSearch,
  FiDownload,
  FiUserCheck,
  FiFileText,
  FiTrendingUp,
  FiRefreshCw,
  FiCalendar,
  FiCheckCircle,
  FiAlertTriangle,
  FiUser,
  FiEdit2,
  FiXCircle,
  FiMessageSquare,
  FiTag,
  FiChevronLeft,
  FiChevronRight,
    FiZap,           // ← add this

} from "react-icons/fi";
import { useEffect, useState } from "react";
import API, { getAllUsers, getEvents, BASE_URL } from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import toast from "react-hot-toast";
import { getAdminLogs } from "../services/api";

// ── Scoped CSS for super admin dashboard ──
const superAdminStyles = `
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
`;

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <style>{superAdminStyles}</style>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setMobileOpen(true)} />

        <div className="flex flex-1 pt-16 overflow-hidden">
          <Sidebar
            title="Super Admin"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            items={[
              { key: "overview", label: "Overview", icon: <FiHome /> },
              { key: "admins", label: "Manage Admins", icon: <FiUserCheck /> },
              { key: "users", label: "All Users", icon: <FiUsers /> },
              {
                key: "settings",
                label: "Platform Settings",
                icon: <FiSettings />,
              },
              { key: "logs", label: "System Logs", icon: <FiFileText /> },
            ]}
          />

          <main
            className={`flex-1 overflow-y-auto transition-all duration-300 ${
              collapsed ? "md:ml-[68px]" : "md:ml-64"
            }`}
            style={{
              background:
                "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)",
            }}
          >
            <div className="p-5 sm:p-8">
              {activeTab === "overview" && <OverviewSection />}
              {activeTab === "admins" && <ManageAdmins />}
              {activeTab === "users" && <AllUsers />}
              {activeTab === "settings" && <PlatformSettings />}
              {activeTab === "logs" && <SystemLogs />}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ================= OVERVIEW SECTION (Improved) ================= */
/* ================= OVERVIEW SECTION (Fixed Admin Approval Graph) ================= */
function OverviewSection() {
  const { user } = useAuth();
  const [adminStats, setAdminStats] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [eventTrend, setEventTrend] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [totalStats, setTotalStats] = useState({
    totalAdmins: 0,
    totalStudents: 0,
    totalEvents: 0,
    totalRegistrations: 0,
  });

  const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);

    // Fetch all users - Super Admin has access
    let users = [];
    let events = [];

    try {
      const usersRes = await getAllUsers({ limit: 1000 });
      users = usersRes.data || [];
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load user data");
    }

    // Fetch events - Public endpoint
    try {
      const eventsRes = await getEvents();
      events = eventsRes.data || [];
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }

    // Filter college admins (role === "college_admin")
    const collegeAdmins = users.filter((u) => u.role === "college_admin");
    const students = users.filter((u) => u.role === "student");

    // Admin status breakdown
    const approvedCount = collegeAdmins.filter((a) => a.status === "approved").length;
    const pendingCount = collegeAdmins.filter((a) => a.status === "pending").length;
    const rejectedCount = collegeAdmins.filter((a) => a.status === "rejected").length;
    
    setAdminStats({
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
    });

    // Total stats
    setTotalStats({
      totalAdmins: collegeAdmins.length,
      totalStudents: students.length,
      totalEvents: events.length,
      totalRegistrations: events.reduce(
        (sum, event) => sum + (event.currentParticipants || 0),
        0
      ),
    });

    // Events per month — based on startDate (12 months: 6 past + 6 future)
    const months = [];
    for (let i = 5; i >= -6; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0,
      });
    }
    events.forEach((ev) => {
      if (!ev.startDate) return;
      const d = new Date(ev.startDate);
      const m = months.find(
        (mo) => mo.month === d.getMonth() && mo.year === d.getFullYear()
      );
      if (m) m.count += 1;
    });
    setEventTrend(months.map((m) => ({ name: m.label, value: m.count })));

    // Category distribution from events
    const categoryCount = {};
    events.forEach((event) => {
      const cat = event.category || "Other";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const categoryColors = {
      Tech: "#3b82f6",
      Cultural: "#a855f7",
      Sports: "#10b981",
      Workshop: "#f59e0b",
      Other: "#6b7280",
    };
    setCategoryData(
      Object.entries(categoryCount).map(([name, count]) => ({
        name,
        count,
        color: categoryColors[name] || "#6b7280",
      }))
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    setError("Failed to load dashboard data");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast.success("Dashboard refreshed");
  };

  const totalAdmins = adminStats.approved + adminStats.pending + adminStats.rejected;
  const approvalRate = totalAdmins > 0 ? Math.round((adminStats.approved / totalAdmins) * 100) : 0;

  const donutData = [
    { name: "Approved", value: adminStats.approved, color: "#10b981" },
    { name: "Pending", value: adminStats.pending, color: "#f59e0b" },
    { name: "Rejected", value: adminStats.rejected, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const statCards = [
    {
      title: "College Admins",
      value: totalStats.totalAdmins,
      accent: "#dc2626",
      icon: <FiShield size={18} />,
      iconBg: "bg-red-600",
      cardBg: "from-red-50 to-red-100/60",
      trend: "Active",
    },
    {
      title: "Total Students",
      value: totalStats.totalStudents,
      accent: "#2563eb",
      icon: <FiUsers size={18} />,
      iconBg: "bg-blue-600",
      cardBg: "from-blue-50 to-blue-100/60",
      trend: "Registered",
    },
    {
      title: "Total Events",
      value: totalStats.totalEvents,
      accent: "#10b981",
      icon: <FiActivity size={18} />,
      iconBg: "bg-emerald-600",
      cardBg: "from-emerald-50 to-emerald-100/60",
      trend: "Platform-wide",
    },
    {
      title: "Total Registrations",
      value: totalStats.totalRegistrations,
      accent: "#8b5cf6",
      icon: <FiTrendingUp size={18} />,
      iconBg: "bg-purple-600",
      cardBg: "from-purple-50 to-purple-100/60",
      trend: "All time",
    },
  ];

  return (
    <div className="space-y-6 dash-fade-in">
      {/* ── Hero Banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl text-white dash-hero"
        style={{
          background:
            "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #6d28d9 100%)",
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
            <p className="text-purple-200 text-sm font-medium mb-1">
              Super Admin Control Panel
            </p>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              {user?.name?.split(" ")[0] || "Super Admin"} 👋
            </h2>
            <p className="text-purple-100/80 text-sm">
              Platform-wide overview — all systems operational.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2 hover:bg-white/25 transition-all"
            >
              <FiRefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="text-xs font-semibold text-white">Refresh</span>
            </button>
            {!loading && adminStats.pending > 0 && (
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold text-white">
                  {adminStats.pending} pending admin
                  {adminStats.pending !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {!loading && totalStats.totalRegistrations > 0 && (
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <FiTrendingUp size={13} className="text-green-300" />
                <span className="text-xs font-semibold text-white">
                  {totalStats.totalRegistrations} total registrations
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <FiAlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <p className="text-xs text-red-600 mt-0.5">
              Some data may be limited. Please try refreshing.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
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

      {/* ── Admin Approval Donut Chart (Fixed) ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <FiShield size={15} />
          </div>
          <h3 className="font-semibold text-gray-800">Admin Approval Status</h3>
          {!loading && totalAdmins > 0 && (
            <span className="ml-auto text-xs text-gray-400">
              Total: {totalAdmins} admin{totalAdmins !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-44">
            <div className="w-32 h-32 rounded-full bg-gray-100 animate-pulse" />
          </div>
        ) : totalAdmins === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <FiShield size={32} className="text-gray-300" />
            <p className="text-sm text-gray-400">No college admins registered yet</p>
            <p className="text-xs text-gray-400">Admins will appear here once they register</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div style={{ outline: "none" }} tabIndex={-1} className="w-full">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    animationBegin={100}
                    animationDuration={800}
                    style={{ outline: "none" }}
                  >
                    {donutData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                        style={{ outline: "none" }}
                      />
                    ))}
                  </Pie>
                  <text
                    x="50%"
                    y="48%"
                    textAnchor="middle"
                    fill="#111827"
                    fontSize={26}
                    fontWeight={700}
                  >
                    {approvalRate}%
                  </text>
                  <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={11}
                    fontWeight={500}
                  >
                    Approval Rate
                  </text>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [`${value} admin${value !== 1 ? "s" : ""}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-3 flex-wrap">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-xs font-medium text-gray-600">
                    {d.name}
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1 — Events by Month Bar Chart */}
          <div className="chart-panel">
            <div className="chart-header">
              <div className="chart-dot bg-purple-500" />
              <span>Events by Month</span>
            </div>
            {eventTrend.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={eventTrend}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  barSize={28}
                >
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
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    formatter={(v) => [v, "Events"]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    animationBegin={150}
                    animationDuration={800}
                    fill="#7c3aed"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-gray-400">No event data available</p>
              </div>
            )}
          </div>

          {/* Chart 2 — Events by Category */}
          <div className="chart-panel">
            <div className="chart-header">
              <div className="chart-dot bg-emerald-500" />
              <span>Events by Category</span>
            </div>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={categoryData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      fontSize: 12,
                    }}
                    formatter={(v) => [v, "Events"]}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} animationDuration={800}>
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-gray-400">No event category data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Stats Footer ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <FiCalendar size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {loading ? "—" : totalStats.totalEvents}
            </p>
            <p className="text-xs text-gray-400">Total Events</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FiTrendingUp size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {loading ? "—" : totalStats.totalRegistrations}
            </p>
            <p className="text-xs text-gray-400">Total Registrations</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FiUsers size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {loading ? "—" : totalStats.totalStudents}
            </p>
            <p className="text-xs text-gray-400">Total Students</p>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ================= MANAGE ADMINS ================= */
function AdminSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border border-gray-100 rounded-xl mb-3">
      <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        <div className="h-8 w-20 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h4 className="text-base font-semibold text-gray-800 mb-2">{title}</h4>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm text-white transition ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDetailModal({ admin, onClose }) {
  if (!admin) return null;
  const initials = admin.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-800">{admin.name}</h4>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {admin.status}
            </span>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-800 font-medium">{admin.email}</span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-500">College</span>
            <span className="text-gray-800 font-medium">{admin.college || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-50 pb-2">
            <span className="text-gray-500">Phone</span>
            <span className="text-gray-800 font-medium">{admin.phone || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Registered</span>
            <span className="text-gray-800 font-medium">
              {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ManageAdmins() {
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingAdmins = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/pending-admins");
      setPendingAdmins(res.data);
      setFiltered(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendingAdmins(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      pendingAdmins.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.college?.toLowerCase().includes(q)
      )
    );
  }, [search, pendingAdmins]);

  const handleConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === "approve") {
        await API.put(`/admin/approve/${confirm.id}`);
        toast.success(`${confirm.name} approved successfully`);
      } else {
        await API.put(`/users/reject-admin/${confirm.id}`);
        toast.success(`${confirm.name} rejected successfully`);
      }
      setConfirm(null);
      fetchPendingAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getAvatarSrc = (userObj) => {
    const img = userObj?.profileImage;
    if (!img) return null;
    return img.startsWith("http") ? img : `${BASE_URL}/uploads/${img}`;
  };
  const getInitials = (name) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarColors = ["bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500"];
  const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === "approve" ? "Approve Admin?" : "Reject Admin?"}
        message={
          confirm?.type === "approve"
            ? `Are you sure you want to approve ${confirm?.name}? They will get full college admin access.`
            : `Are you sure you want to reject ${confirm?.name}? This action can be reviewed later.`
        }
        confirmLabel={actionLoading ? "Processing..." : confirm?.type === "approve" ? "Yes, Approve" : "Yes, Reject"}
        confirmColor={confirm?.type === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
      <AdminDetailModal admin={selectedAdmin} onClose={() => setSelectedAdmin(null)} />

      <div className="space-y-5 dash-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manage College Admins</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Review and action pending college admin registration requests
            </p>
          </div>
          <button
            onClick={fetchPendingAdmins}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-all whitespace-nowrap"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Pending Requests", value: loading ? "—" : pendingAdmins.length, icon: <FiUserCheck size={15} />, bg: "bg-amber-50", ring: "ring-amber-100", iconCls: "text-amber-500" },
            { label: "Shown in Search", value: loading ? "—" : filtered.length, icon: <FiSearch size={15} />, bg: "bg-purple-50", ring: "ring-purple-100", iconCls: "text-purple-500" },
            { label: "Actions Available", value: loading ? "—" : filtered.length * 2, icon: <FiCheckCircle size={15} />, bg: "bg-teal-50", ring: "ring-teal-100", iconCls: "text-teal-500" },
          ].map((s, i) => (
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

        {/* ── Search + Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email or college…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                  <FiXCircle size={13} />
                </button>
              )}
            </div>
            {!loading && pendingAdmins.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {pendingAdmins.length} pending
              </span>
            )}
          </div>

          {error && (
            <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <FiAlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <AdminSkeleton key={i} />)}
            </div>
          )}

          {/* Empty states */}
          {!loading && !error && pendingAdmins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
                <FiCheckCircle size={26} className="text-green-500" />
              </div>
              <p className="text-gray-700 font-semibold text-base">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No pending college admin requests at the moment.</p>
            </div>
          )}

          {!loading && !error && pendingAdmins.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <FiSearch size={20} className="text-gray-300" />
              </div>
              <p className="text-gray-600 font-medium">No results found</p>
              <p className="text-sm text-gray-400 mt-1">No admins match "{search}"</p>
              <button onClick={() => setSearch("")} className="mt-4 px-4 py-2 rounded-xl border border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-all">
                Clear Search
              </button>
            </div>
          )}

          {/* Admin rows */}
          {!loading && !error && filtered.length > 0 && (
            <div className="divide-y divide-gray-50">
              {filtered.map((admin) => {
                const avatarSrc = getAvatarSrc(admin);
                return (
                  <div
                    key={admin._id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm bg-gray-100">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={admin.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentNode.querySelector(".avatar-fallback").style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`avatar-fallback w-full h-full items-center justify-center text-white font-bold text-sm ${getColor(admin.name)}`}
                        style={{ display: avatarSrc ? "none" : "flex" }}
                      >
                        {getInitials(admin.name)}
                      </div>
                    </div>

                    {/* Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedAdmin(admin)}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-gray-800 text-sm group-hover:text-purple-600 transition leading-tight truncate">
                          {admin.name}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Pending
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                      {admin.college && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          🏫 {admin.college}
                        </span>
                      )}
                    </div>

                    {/* Registered date — desktop */}
                    {admin.createdAt && (
                      <div className="hidden lg:flex flex-col items-end flex-shrink-0 gap-0.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Registered</p>
                        <p className="text-xs font-medium text-gray-600">
                          {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setConfirm({ type: "approve", id: admin._id, name: admin.name })}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition text-xs font-semibold shadow-sm"
                      >
                        <FiCheckCircle size={12} /> Approve
                      </button>
                      <button
                        onClick={() => setConfirm({ type: "reject", id: admin._id, name: admin.name })}
                        className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition text-xs font-semibold shadow-sm"
                      >
                        <FiXCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================= ALL USERS ================= */
function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 12;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (roleFilter) params.role = roleFilter;
        const res = await API.get("/users/all-users", { params });
        setUsers(res.data);
        setPage(1);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearch, roleFilter]);

  const roleBadge = (role) => {
    const map = {
      super_admin:   { cls: "bg-purple-50 text-purple-700 ring-1 ring-purple-200", label: "Super Admin" },
      college_admin: { cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",       label: "College Admin" },
      student:       { cls: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",      label: "Student" },
    };
    const { cls, label } = map[role] || { cls: "bg-gray-100 text-gray-600 ring-1 ring-gray-200", label: role };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  const statusBadge = (status) => {
    const map = {
      approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      pending:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      rejected: "bg-red-50 text-red-600 ring-1 ring-red-200",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize inline-flex items-center gap-1.5 ${map[status] || "bg-gray-100 text-gray-600 ring-1 ring-gray-200"}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === "approved" ? "bg-emerald-500" : status === "pending" ? "bg-amber-400" : "bg-red-400"}`} />
        {status}
      </span>
    );
  };

  const getAvatarSrc = (userObj) => {
    const img = userObj?.profileImage;
    if (!img) return null;
    return img.startsWith("http") ? img : `${BASE_URL}/uploads/${img}`;
  };
  const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarColors = ["bg-blue-500","bg-violet-500","bg-rose-500","bg-amber-500","bg-teal-500","bg-indigo-500"];
  const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  const roleCount = (r) => users.filter((u) => u.role === r).length;
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const paginatedUsers = users.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  return (
    <div className="space-y-5 dash-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">All Platform Users</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {!loading && `${users.length} user${users.length !== 1 ? "s" : ""} across the platform`}
          </p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Users",     value: users.length,                icon: <FiUsers size={15} />,     bg: "bg-blue-50",   ring: "ring-blue-100",   iconCls: "text-blue-500"   },
            { label: "College Admins",  value: roleCount("college_admin"),  icon: <FiShield size={15} />,    bg: "bg-purple-50", ring: "ring-purple-100", iconCls: "text-purple-500" },
            { label: "Students",        value: roleCount("student"),         icon: <FiUser size={15} />,      bg: "bg-teal-50",   ring: "ring-teal-100",   iconCls: "text-teal-500"   },
          ].map((s, i) => (
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
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50 placeholder-gray-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiXCircle size={13} />
            </button>
          )}
        </div>
        {/* Role filter pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1 flex-wrap">
          {[
            { value: "",              label: "All Roles" },
            { value: "student",       label: "Students" },
            { value: "college_admin", label: "Admins" },
            { value: "super_admin",   label: "Super Admin" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                roleFilter === opt.value ? "bg-purple-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-white border border-red-100 rounded-2xl p-8 text-center shadow-sm">
          <FiAlertTriangle size={28} className="text-red-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-100" />
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="w-20 h-5 rounded-full bg-gray-100" />
              <div className="w-16 h-5 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && users.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FiUsers size={26} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-semibold text-base">No users found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or role filter.</p>
          {(search || roleFilter) && (
            <button onClick={() => { setSearch(""); setRoleFilter(""); }}
              className="mt-5 px-5 py-2.5 rounded-xl border border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-all">
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && users.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">College</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedUsers.map((u, idx) => {
                  const rowNum = (page - 1) * USERS_PER_PAGE + idx + 1;
                  const avatarSrc = getAvatarSrc(u);
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/60 transition-colors align-middle">
                      <td className="px-5 py-4 text-sm text-gray-300 font-mono">{rowNum}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                         

<div className="w-9 h-9 rounded-full overflow-hidden flex-shr-0 ring-1 ring-blue-100">
  {avatarSrc ? (
    <img
      src={avatarSrc}
      alt={u.name}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      }}
    />
  ) : null}
  <div
    className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm"
    style={{ display: avatarSrc ? "none" : "flex" }}
  >
    {getInitials(u.name)}
  </div>
</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate leading-tight">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">{roleBadge(u.role)}</td>
                      <td className="px-5 py-4 hidden lg:table-cell text-sm text-gray-500">{u.college || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-4">{statusBadge(u.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
              <p className="text-sm text-gray-400">
                Showing <span className="font-semibold text-gray-600">{(page - 1) * USERS_PER_PAGE + 1}</span>–<span className="font-semibold text-gray-600">{Math.min(page * USERS_PER_PAGE, users.length)}</span> of <span className="font-semibold text-gray-600">{users.length}</span>
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
                        page === pn ? "bg-purple-600 text-white shadow-sm shadow-purple-200" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
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

/* ================= PLATFORM SETTINGS ================= */
function PlatformSettings() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/health/status");
      setHealthData(res.data);
      setLastCheck(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch platform health");
    } finally {
      setLoading(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await API.post("/health/check");
      toast.success(`Health check completed! Status: ${res.data.status}`);
      await fetchHealthStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Health check failed");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    let interval;
    if (autoRefresh) interval = setInterval(fetchHealthStatus, 30000);
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh]);

  const getOverallGradient = (status) => {
    if (status === "healthy") return "from-emerald-500 via-teal-500 to-cyan-600";
    if (status === "degraded") return "from-amber-500 via-orange-500 to-yellow-600";
    return "from-red-500 via-rose-500 to-pink-600";
  };

  const getServiceMeta = (key, service) => {
    const operational =
      service?.status === "operational" ||
      service?.status === "healthy" ||
      service?.connected === true;

    const icons = {
      api:           { icon: <FiActivity size={16} />,    bg: "bg-blue-50",    text: "text-blue-600",    label: "API Server"       },
      auth:          { icon: <FiShield size={16} />,      bg: "bg-violet-50",  text: "text-violet-600",  label: "Auth Service"     },
      database:      { icon: <FiSettings size={16} />,    bg: "bg-emerald-50", text: "text-emerald-600", label: "Database"         },
      events:        { icon: <FiCalendar size={16} />,    bg: "bg-indigo-50",  text: "text-indigo-600",  label: "Events"           },
      notifications: { icon: <FiActivity size={16} />,    bg: "bg-amber-50",   text: "text-amber-600",   label: "Notifications"    },
      fileUpload:    { icon: <FiDownload size={16} />,    bg: "bg-rose-50",    text: "text-rose-600",    label: "File Upload"      },
    };

    return { ...(icons[key] || { icon: <FiSettings size={16} />, bg: "bg-gray-50", text: "text-gray-600", label: key }), operational };
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const statCards = healthData ? [
    { label: "Total Users",    value: healthData.stats?.users         || 0, icon: <FiUsers size={16} />,     color: "text-violet-600", bg: "bg-violet-50",  ring: "ring-violet-100" },
    { label: "Total Events",   value: healthData.stats?.events        || 0, icon: <FiCalendar size={16} />,  color: "text-blue-600",   bg: "bg-blue-50",    ring: "ring-blue-100"   },
    { label: "Registrations",  value: healthData.stats?.registrations || 0, icon: <FiFileText size={16} />,  color: "text-teal-600",   bg: "bg-teal-50",    ring: "ring-teal-100"   },
    { label: "Pending Admins", value: healthData.stats?.pendingAdmins || 0, icon: <FiUserCheck size={16} />, color: "text-amber-600",  bg: "bg-amber-50",   ring: "ring-amber-100"  },
  ] : [];

  const serviceDetails = (key, service) => {
    if (key === "api")           return [{ k: "Latency", v: service?.latency || "—" }, { k: "Uptime", v: formatUptime(service?.uptime) }];
    if (key === "auth")          return [{ k: "Last Check", v: service?.lastChecked ? new Date(service.lastChecked).toLocaleTimeString() : "—" }];
    if (key === "database")      return [{ k: "Connected", v: service?.connected ? "Yes" : "No" }, { k: "Status", v: service?.status || "—" }];
    if (key === "events")        return [{ k: "Total", v: service?.totalEvents || 0 }, { k: "Active", v: service?.activeEvents || 0 }];
    if (key === "notifications")  return [{ k: "SSE", v: service?.sseSupported ? "Supported" : "Not Supported" }];
    if (key === "fileUpload")    return [{ k: "Storage", v: service?.storage || "—" }];
    return [];
  };

  return (
    <div className="space-y-6 dash-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Platform Health</h2>
          <p className="text-sm text-gray-400 mt-0.5">Real-time system status and service monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle — pill style */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
              autoRefresh
                ? "bg-purple-50 border-purple-200 text-purple-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-purple-500 animate-pulse" : "bg-gray-300"}`} />
            {autoRefresh ? "Live" : "Paused"}
          </button>

          <button
            onClick={fetchHealthStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-40"
          >
            <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={handleRunHealthCheck}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-purple-200"
          >
            <FiZap size={13} className={checking ? "animate-pulse" : ""} />
            {checking ? "Checking..." : "Run Check"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <p className="text-xs text-red-500 mt-0.5">Unable to reach the health endpoint.</p>
          </div>
          <button onClick={fetchHealthStatus} className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !healthData && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 h-32 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white rounded-xl border border-gray-100 h-28 animate-pulse" />)}
          </div>
        </div>
      )}

      {healthData && (
        <>
          {/* ── Overall Status Banner ── */}
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getOverallGradient(healthData.status)} p-px`}>
            <div className="relative rounded-2xl bg-white/95 backdrop-blur-sm px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Status pill */}
              <div className={`flex items-center gap-3 flex-1`}>
                <div className={`relative flex-shrink-0`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    healthData.status === "healthy" ? "bg-emerald-50" :
                    healthData.status === "degraded" ? "bg-amber-50" : "bg-red-50"
                  }`}>
                    <div className={`w-4 h-4 rounded-full ${
                      healthData.status === "healthy" ? "bg-emerald-500" :
                      healthData.status === "degraded" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                  </div>
                  {healthData.status === "healthy" && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">System Status</p>
                  <p className={`text-xl font-bold capitalize ${
                    healthData.status === "healthy" ? "text-emerald-700" :
                    healthData.status === "degraded" ? "text-amber-700" : "text-red-700"
                  }`}>
                    {healthData.status || "Unknown"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-gray-100" />

              {/* Timestamps */}
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Last Refreshed</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{lastCheck ? lastCheck.toLocaleTimeString() : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Server Time</p>
                  <p className="font-semibold text-gray-700 mt-0.5">
                    {healthData.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Auto Refresh</p>
                  <p className={`font-semibold mt-0.5 ${autoRefresh ? "text-purple-600" : "text-gray-400"}`}>
                    {autoRefresh ? "Every 30s" : "Off"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Platform Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition">
                <div className={`w-10 h-10 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Services ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <FiSettings size={14} />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Services</h3>
              <span className="ml-auto text-xs text-gray-400">
                {Object.values(healthData.services || {}).filter(s => s?.status === "operational" || s?.status === "healthy" || s?.connected).length}
                /{Object.keys(healthData.services || {}).length} operational
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(healthData.services || {}).map(([key, service]) => {
                const meta = getServiceMeta(key, service);
                const details = serviceDetails(key, service);
                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center flex-shrink-0`}>
                          {meta.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{meta.label}</p>
                          <p className={`text-xs font-medium mt-0.5 capitalize ${meta.operational ? "text-emerald-600" : "text-red-500"}`}>
                            {service?.status || (service?.connected ? "connected" : "unknown")}
                          </p>
                        </div>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                        meta.operational ? "bg-emerald-400" : "bg-red-400"
                      } ${meta.operational ? "shadow-[0_0_0_3px_#d1fae5]" : "shadow-[0_0_0_3px_#fee2e2]"}`} />
                    </div>

                    {details.length > 0 && (
                      <div className="space-y-2 border-t border-gray-50 pt-3 mt-1">
                        {details.map((d, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{d.k}</span>
                            <span className="text-xs font-semibold text-gray-700 font-mono">{d.v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Performance ── */}
          {(healthData.performance?.responseTime || healthData.performance?.databaseQueryTime) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <FiActivity size={14} />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">Performance</h3>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {healthData.performance?.responseTime && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-sm text-gray-600">Response Time</span>
                    </div>
                    <span className="font-mono font-semibold text-gray-800 text-sm bg-gray-50 px-3 py-1 rounded-lg">
                      {healthData.performance.responseTime}
                    </span>
                  </div>
                )}
                {healthData.performance?.databaseQueryTime && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-sm text-gray-600">Database Query Time</span>
                    </div>
                    <span className="font-mono font-semibold text-gray-800 text-sm bg-gray-50 px-3 py-1 rounded-lg">
                      {healthData.performance.databaseQueryTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Footer info bar ── */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
              <FiActivity size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">
                Last successful check: <span className="text-gray-500">{lastCheck ? lastCheck.toLocaleString() : "Not yet run"}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                All services are monitored in real-time. {autoRefresh ? "Auto-refresh active every 30 seconds." : "Auto-refresh is paused."}
              </p>
            </div>
            <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${autoRefresh ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
              {autoRefresh ? "● LIVE" : "PAUSED"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= SYSTEM LOGS ================= */
function SystemLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [adminFilter, setAdminFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [admins, setAdmins] = useState([]);
  const [entities, setEntities] = useState([]);
  const [stats, setStats] = useState({ total: 0, created: 0, updated: 0, deleted: 0, approved: 0, rejected: 0 });

  const LOGS_PER_PAGE = 10;

  const getAvatarSrc = (adminObj) => {
    const img = adminObj?.profileImage;
    if (!img) return null;
    return img.startsWith("http") ? img : `${BASE_URL}/uploads/${img}`;
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await getAdminLogs();
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
        const adminMap = new Map();
        const entitySet = new Set();
        data.forEach((log) => {
          if (log.adminId?._id) adminMap.set(log.adminId._id, { id: log.adminId._id, name: log.adminId.name || "Unknown", email: log.adminId.email || "" });
          if (log.targetEntityType) entitySet.add(log.targetEntityType);
        });
        setAdmins(Array.from(adminMap.values()));
        setEntities(Array.from(entitySet).sort());
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setError("Failed to load system logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

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
    if (adminFilter  !== "ALL") temp = temp.filter((l) => l.adminId?._id === adminFilter);
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
  }, [search, actionFilter, adminFilter, entityFilter, dateRange.start, dateRange.end, logs]);

  /* ── Badge helpers (matching AdminDashboard exactly) ── */
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

  const getDetailItems = (log) => {
    const items = [];
    const d = log.details || {};
    if (d.title)       items.push({ label: "Title",    value: d.title });
    if (d.name)        items.push({ label: "Name",     value: d.name });
    if (d.email)       items.push({ label: "Email",    value: d.email });
    if (d.eventId)     items.push({ label: "Event",    value: d.eventId });
    if (d.location)    items.push({ label: "Location", value: d.location });
    if (d.category)    items.push({ label: "Category", value: d.category });
    if (d.description) items.push({ label: "Desc",     value: d.description });
    const handled = new Set(["title","name","email","eventId","location","category","description"]);
    Object.entries(d).forEach(([k, v]) => {
      if (!handled.has(k) && v !== null && v !== undefined && v !== "")
        items.push({ label: k.charAt(0).toUpperCase() + k.slice(1), value: String(v) });
    });
    if (!items.length && log.targetEntityId)
      items.push({ label: "ID", value: log.targetEntityId });
    return items;
  };

  const formatLogDate = (date) => {
    if (!date) return "—";
    try { return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  const formatRelativeTime = (date) => {
    if (!date) return "—";
    try {
      const ms = Date.now() - new Date(date);
      const mins = Math.floor(ms / 60000);
      const hours = Math.floor(ms / 3600000);
      const days = Math.floor(ms / 86400000);
      if (mins  < 1)  return "Just now";
      if (mins  < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days  < 7)  return `${days}d ago`;
      return formatLogDate(date);
    } catch { return "—"; }
  };

  const clearFilters = () => {
    setSearch(""); setActionFilter("ALL"); setAdminFilter("ALL"); setEntityFilter("ALL");
    setDateRange({ start: "", end: "" });
  };

  const handleExportCSV = () => {
    const rows = [
      ["Action", "Entity Type", "Details", "Admin", "Admin Email", "Time"],
      ...filteredLogs.map((log) => {
        const detailStr = getDetailItems(log).map((i) => `${i.label}: ${i.value}`).join(" | ");
        return [log.action || "", log.targetEntityType || "", detailStr, log.adminId?.name || "Admin", log.adminId?.email || "", formatLogDate(log.createdAt)];
      }),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `system_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const totalPages    = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);
  const hasFilters    = search || actionFilter !== "ALL" || adminFilter !== "ALL" || entityFilter !== "ALL" || dateRange.start || dateRange.end;

  const statCards = [
    { label: "Total Logs",             value: stats.total,                          icon: <FiFileText size={15} />,    iconCls: "text-purple-500", bg: "bg-purple-50",  ring: "ring-purple-100"  },
    { label: "Modifications",          value: stats.created+stats.updated+stats.deleted, icon: <FiEdit2 size={15} />, iconCls: "text-amber-500",  bg: "bg-amber-50",   ring: "ring-amber-100"   },
    { label: "Approvals / Rejections", value: stats.approved+stats.rejected,        icon: <FiCheckCircle size={15} />, iconCls: "text-teal-500",  bg: "bg-teal-50",    ring: "ring-teal-100"    },
  ];

  const ACTION_TABS = [
    { key: "ALL",      label: "All",      count: stats.total,    activeBg: "bg-purple-600 text-white"  },
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
    <div className="space-y-5 dash-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">System Activity Logs</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"} · Complete audit trail across the platform
          </p>
        </div>
        {filteredLogs.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-purple-100 whitespace-nowrap"
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
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50 placeholder-gray-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <FiXCircle size={13} />
              </button>
            )}
          </div>
          {/* Entity */}
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} disabled={entities.length === 0}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-gray-50 text-gray-700 min-w-[130px] disabled:opacity-40 transition-all">
            <option value="ALL">All Entities</option>
            {entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {/* Admin */}
          <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} disabled={admins.length === 0}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-gray-50 text-gray-700 min-w-[130px] disabled:opacity-40 transition-all">
            <option value="ALL">All Admins</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {/* Date range */}
          <div className="flex gap-2">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
          </div>
        </div>
        {/* Action tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {ACTION_TABS.map(({ key, label, count, activeBg }) => (
            <button key={key} onClick={() => setActionFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                actionFilter === key ? `${activeBg} shadow-sm` : "text-gray-500 hover:text-gray-800"
              }`}>
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                <FiSearch size={10} /> "{search}"
                <button onClick={() => setSearch("")} className="ml-0.5 hover:text-purple-900">×</button>
              </span>
            )}
            {entityFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <FiTag size={10} /> {entityFilter}
                <button onClick={() => setEntityFilter("ALL")} className="ml-0.5 hover:text-blue-900">×</button>
              </span>
            )}
            {adminFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                <FiUser size={10} /> {admins.find((a) => a.id === adminFilter)?.name}
                <button onClick={() => setAdminFilter("ALL")} className="ml-0.5 hover:text-violet-900">×</button>
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
            className="mt-4 px-4 py-2 rounded-xl border border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-all">
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
              className="mt-5 px-5 py-2.5 rounded-xl border border-purple-200 text-purple-600 text-sm font-semibold hover:bg-purple-50 transition-all">
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
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Details</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedLogs.map((log, idx) => {
                  const rowNum       = (page - 1) * LOGS_PER_PAGE + idx + 1;
                  const adminAvatarSrc = getAvatarSrc(log.adminId);
                  const adminInitial = log.adminId?.name ? log.adminId.name.charAt(0).toUpperCase() : "A";
                  const detailItems  = getDetailItems(log);
                  return (
                    <tr key={log._id} className="transition-colors hover:bg-gray-50/60 align-top">
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

                      {/* Details */}
                      <td className="px-5 py-4 hidden lg:table-cell min-w-[220px] max-w-[320px]">
                        {detailItems.length > 0 ? (
                          <div className="space-y-1">
                            {detailItems.map((item, i) => (
                              <div key={i} className="flex gap-1.5 items-start">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap mt-0.5 flex-shrink-0">
                                  {item.label}:
                                </span>
                                <span className="text-sm text-gray-600 break-all leading-snug">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>

                      {/* Admin */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-purple-100">
                            {adminAvatarSrc ? (
                              <img
                                src={adminAvatarSrc}
                                alt={log.adminId?.name || "Admin"}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                              />
                            ) : null}
                            <div
                              className="w-full h-full bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center text-purple-600 font-bold text-sm"
                              style={{ display: adminAvatarSrc ? "none" : "flex" }}
                            >
                              {adminInitial}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate leading-tight">{log.adminId?.name || "Admin"}</p>
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
                        page === pn ? "bg-purple-600 text-white shadow-sm shadow-purple-200" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
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