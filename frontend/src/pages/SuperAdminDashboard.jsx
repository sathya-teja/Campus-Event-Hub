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
  FiClock,
  FiDownload,
  FiUserCheck,
  FiFileText,
  FiTrendingUp,
  FiRefreshCw,
  FiCalendar,
  FiCheckCircle,
  FiAlertTriangle,
  FiUser,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiXCircle,
  FiMessageSquare,
  FiTag,
} from "react-icons/fi";
import { useEffect, useState } from "react";
import API, { getAllUsers, getEvents } from "../services/api";
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

  useEffect(() => {
    fetchPendingAdmins();
  }, []);

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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <FiUserCheck size={15} />
            </div>
            <h3 className="font-semibold text-gray-800">Pending College Admins</h3>
            {!loading && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {pendingAdmins.length} pending
              </span>
            )}
          </div>
          <button
            onClick={fetchPendingAdmins}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="p-4">
          {loading && [1, 2, 3].map((i) => <AdminSkeleton key={i} />)}

          {!loading && !error && pendingAdmins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                <FiCheckCircle size={28} className="text-green-500" />
              </div>
              <p className="text-gray-700 font-medium">All caught up!</p>
              <p className="text-gray-400 text-sm mt-1">No pending college admin requests.</p>
            </div>
          )}

          {!loading && !error && pendingAdmins.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-gray-500 text-sm">No admins match your search.</p>
            </div>
          )}

          {!loading &&
            filtered.map((admin) => (
              <div
                key={admin._id}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl mb-3 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div
                  className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${getColor(
                    admin.name
                  )}`}
                >
                  {getInitials(admin.name)}
                </div>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedAdmin(admin)}
                >
                  <p className="font-semibold text-gray-800 text-sm truncate hover:text-purple-600 transition">
                    {admin.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                  {admin.college && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{admin.college}</p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirm({ type: "approve", id: admin._id, name: admin.name })}
                    className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 transition text-xs font-medium"
                  >
                    <FiCheckCircle size={12} /> Approve
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "reject", id: admin._id, name: admin.name })}
                    className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition text-xs font-medium"
                  >
                    <FiAlertTriangle size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
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
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearch, roleFilter]);

  const roleBadge = (role) => {
    const styles = {
      super_admin: "bg-purple-100 text-purple-700",
      college_admin: "bg-blue-100 text-blue-700",
      student: "bg-gray-100 text-gray-600",
    };
    const labels = {
      super_admin: "Super Admin",
      college_admin: "College Admin",
      student: "Student",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || "bg-gray-100 text-gray-600"}`}>
        {labels[role] || role}
      </span>
    );
  };

  const statusBadge = (status) => {
    const styles = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <FiUsers size={15} />
          </div>
          <h3 className="font-semibold text-gray-800">All Platform Users</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {!loading && `${users.length} user${users.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
        >
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="college_admin">College Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {loading && (
        <div className="p-8 text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm mt-3">Loading users...</p>
        </div>
      )}
      {error && (
        <div className="mx-4 my-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      {!loading && !error && users.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiUsers size={20} className="text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm">No users found.</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">College</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{user.name}</td>
                    <td className="px-5 py-3 text-gray-600 truncate max-w-[200px]">{user.email}</td>
                    <td className="px-5 py-3">{roleBadge(user.role)}</td>
                    <td className="px-5 py-3 text-gray-500 text-sm">{user.college || "—"}</td>
                    <td className="px-5 py-3">{statusBadge(user.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col gap-3 p-4">
            {users.map((user) => (
              <div key={user._id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  {statusBadge(user.status)}
                </div>
                <p className="text-sm text-gray-500 mb-2 truncate">{user.email}</p>
                <div className="flex gap-2 flex-wrap">
                  {roleBadge(user.role)}
                  {user.college && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{user.college}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= PLATFORM SETTINGS ================= */
function PlatformSettings() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <FiSettings size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Platform Settings</h3>
            <p className="text-sm text-gray-500">Configure platform-level options and global settings</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-amber-800">Coming Soon</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Platform settings are under development. Check back later for maintenance mode, global configurations, and more.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <FiActivity size={14} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
            </div>
            <p className="text-xs text-gray-400">Toggle platform maintenance mode</p>
            <button className="mt-3 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition cursor-not-allowed" disabled>
              Coming Soon
            </button>
          </div>
          <div className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <FiFileText size={14} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">Email Templates</span>
            </div>
            <p className="text-xs text-gray-400">Customize system emails</p>
            <button className="mt-3 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition cursor-not-allowed" disabled>
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SYSTEM LOGS ================= */
/* ================= SYSTEM LOGS (Professional UI - Fixed) ================= */
/* ================= SYSTEM LOGS (Simplified & Professional) ================= */
/* ================= SYSTEM LOGS (With Full Details & Proper Icons) ================= */
function SystemLogs() {
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
  const [stats, setStats] = useState({ 
    total: 0, 
    created: 0, 
    updated: 0, 
    deleted: 0,
    approved: 0,
    rejected: 0 
  });

  const LOGS_PER_PAGE = 10;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await getAdminLogs();
        const data = res.data || [];
        setLogs(data);
        setFilteredLogs(data);
        
        // Calculate stats
        setStats({
          total: data.length,
          created: data.filter(l => l.action?.includes("CREATED")).length,
          updated: data.filter(l => l.action?.includes("UPDATED")).length,
          deleted: data.filter(l => l.action?.includes("DELETED")).length,
          approved: data.filter(l => l.action?.includes("APPROVED")).length,
          rejected: data.filter(l => l.action?.includes("REJECTED")).length,
        });
        
        // Extract unique admins for filter
        const adminMap = new Map();
        const entitySet = new Set();
        
        data.forEach(log => {
          if (log.adminId?._id) {
            adminMap.set(log.adminId._id, {
              id: log.adminId._id,
              name: log.adminId.name || "Unknown",
              email: log.adminId.email || ""
            });
          }
          if (log.targetEntityType) {
            entitySet.add(log.targetEntityType);
          }
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

  // Filter Logic
  useEffect(() => {
    if (!logs.length) return;
    
    let temp = [...logs];

    if (search) {
      const searchLower = search.toLowerCase();
      temp = temp.filter((log) => {
        const action = log.action || "";
        const adminName = log.adminId?.name || "";
        const entityType = log.targetEntityType || "";
        const details = JSON.stringify(log.details || "").toLowerCase();
        return action.toLowerCase().includes(searchLower) ||
          adminName.toLowerCase().includes(searchLower) ||
          entityType.toLowerCase().includes(searchLower) ||
          details.includes(searchLower);
      });
    }

    if (actionFilter !== "ALL") {
      temp = temp.filter((log) => log.action?.includes(actionFilter));
    }

    if (adminFilter !== "ALL") {
      temp = temp.filter((log) => log.adminId?._id === adminFilter);
    }

    if (entityFilter !== "ALL") {
      temp = temp.filter((log) => log.targetEntityType === entityFilter);
    }

    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      temp = temp.filter((log) => log.createdAt && new Date(log.createdAt) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      temp = temp.filter((log) => log.createdAt && new Date(log.createdAt) <= endDate);
    }

    setFilteredLogs(temp);
    setPage(1);
  }, [search, actionFilter, adminFilter, entityFilter, dateRange.start, dateRange.end, logs]);

  const getActionStyle = (action) => {
    if (!action) return "bg-gray-100 text-gray-600";
    if (action.includes("CREATED")) return "bg-emerald-100 text-emerald-700";
    if (action.includes("UPDATED")) return "bg-amber-100 text-amber-700";
    if (action.includes("DELETED")) return "bg-red-100 text-red-700";
    if (action.includes("APPROVED")) return "bg-green-100 text-green-700";
    if (action.includes("REJECTED")) return "bg-pink-100 text-pink-700";
    return "bg-gray-100 text-gray-600";
  };

  const getEntityIcon = (type) => {
    switch(type) {
      case "Event":
        return <FiCalendar size={12} />;
      case "User":
        return <FiUser size={12} />;
      case "Registration":
        return <FiCheckCircle size={12} />;
      case "Discussion":
        return <FiMessageSquare size={12} />;
      default:
        return <FiFileText size={12} />;
    }
  };

  const getEntityBadgeStyle = (type) => {
    const styles = {
      Event: "bg-blue-100 text-blue-700",
      User: "bg-purple-100 text-purple-700",
      Registration: "bg-green-100 text-green-700",
      Discussion: "bg-orange-100 text-orange-700",
    };
    return styles[type] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  };

  const formatRelativeTime = (date) => {
    if (!date) return "—";
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      
      return formatDate(date);
    } catch {
      return "—";
    }
  };

  const getEntityDetails = (log) => {
    const details = [];
    
    // Add title if present
    if (log.details?.title) {
      details.push(log.details.title);
    }
    // Add name if present
    if (log.details?.name) {
      details.push(log.details.name);
    }
    // Add email if present
    if (log.details?.email) {
      details.push(log.details.email);
    }
    // Add eventId reference if present
    if (log.details?.eventId) {
      details.push(`Event: ${log.details.eventId.substring(0, 8)}...`);
    }
    // Add target entity ID as fallback
    if (details.length === 0 && log.targetEntityId) {
      details.push(`ID: ${log.targetEntityId.substring(0, 8)}...`);
    }
    
    return details.length > 0 ? details.join(" • ") : "—";
  };

  const clearFilters = () => {
    setSearch("");
    setActionFilter("ALL");
    setAdminFilter("ALL");
    setEntityFilter("ALL");
    setDateRange({ start: "", end: "" });
  };

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * LOGS_PER_PAGE,
    page * LOGS_PER_PAGE
  );

  const statCards = [
    { label: "Total Logs", value: stats.total, icon: <FiFileText size={14} />, color: "bg-purple-100 text-purple-600" },
    { label: "Created", value: stats.created, icon: <FiPlus size={14} />, color: "bg-emerald-100 text-emerald-600" },
    { label: "Updated", value: stats.updated, icon: <FiEdit2 size={14} />, color: "bg-amber-100 text-amber-600" },
    { label: "Deleted", value: stats.deleted, icon: <FiTrash2 size={14} />, color: "bg-red-100 text-red-600" },
    { label: "Approved", value: stats.approved, icon: <FiCheckCircle size={14} />, color: "bg-green-100 text-green-600" },
    { label: "Rejected", value: stats.rejected, icon: <FiXCircle size={14} />, color: "bg-pink-100 text-pink-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FiFileText size={22} className="text-purple-600" />
            System Activity Logs
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Complete audit trail of all admin actions across the platform
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Total: {stats.total} logs
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">
                {stat.label}
              </span>
              <div className={`w-6 h-6 rounded-lg ${stat.color.split(" ")[0]} flex items-center justify-center ${stat.color.split(" ")[1]}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATED">Created</option>
              <option value="UPDATED">Updated</option>
              <option value="DELETED">Deleted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
              disabled={entities.length === 0}
            >
              <option value="ALL">All Entities</option>
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>

            {/* Admin Filter */}
            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
              disabled={admins.length === 0}
            >
              <option value="ALL">All Admins</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
                placeholder="From"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-50"
                placeholder="To"
              />
            </div>
          </div>

          {/* Active Filters */}
          {(search || actionFilter !== "ALL" || adminFilter !== "ALL" || entityFilter !== "ALL" || dateRange.start || dateRange.end) && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">
                    <FiSearch size={10} />
                    Search: "{search}"
                    <button onClick={() => setSearch("")} className="hover:text-purple-900 ml-1">×</button>
                  </span>
                )}
                {actionFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs">
                    <FiActivity size={10} />
                    Action: {actionFilter}
                    <button onClick={() => setActionFilter("ALL")} className="hover:text-amber-900 ml-1">×</button>
                  </span>
                )}
                {entityFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                    <FiTag size={10} />
                    Entity: {entityFilter}
                    <button onClick={() => setEntityFilter("ALL")} className="hover:text-blue-900 ml-1">×</button>
                  </span>
                )}
                {adminFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                    <FiUser size={10} />
                    Admin: {admins.find(a => a.id === adminFilter)?.name}
                    <button onClick={() => setAdminFilter("ALL")} className="hover:text-blue-900 ml-1">×</button>
                  </span>
                )}
                {dateRange.start && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs">
                    <FiCalendar size={10} />
                    From: {dateRange.start}
                    <button onClick={() => setDateRange({ ...dateRange, start: "" })} className="hover:text-green-900 ml-1">×</button>
                  </span>
                )}
                {dateRange.end && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs">
                    <FiCalendar size={10} />
                    To: {dateRange.end}
                    <button onClick={() => setDateRange({ ...dateRange, end: "" })} className="hover:text-green-900 ml-1">×</button>
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm mt-3">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <FiAlertTriangle size={32} className="text-red-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-purple-600 text-sm hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FiFileText size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No logs found</p>
            <p className="text-xs text-gray-400 mt-1">
              {(search || actionFilter !== "ALL" || adminFilter !== "ALL" || entityFilter !== "ALL" || dateRange.start || dateRange.end)
                ? "Try adjusting your filters"
                : "No activity has been logged yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getActionStyle(log.action)}`}>
                          {log.action?.includes("CREATED") && <FiPlus size={10} />}
                          {log.action?.includes("UPDATED") && <FiEdit2 size={10} />}
                          {log.action?.includes("DELETED") && <FiTrash2 size={10} />}
                          {log.action?.includes("APPROVED") && <FiCheckCircle size={10} />}
                          {log.action?.includes("REJECTED") && <FiXCircle size={10} />}
                          {log.action ? log.action.replace(/_/g, " ") : "Unknown"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {getEntityIcon(log.targetEntityType)}
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getEntityBadgeStyle(log.targetEntityType)}`}>
                            {log.targetEntityType || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-gray-600 max-w-md truncate" title={getEntityDetails(log)}>
                          {getEntityDetails(log)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-xs">
                            {log.adminId?.name ? log.adminId.name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{log.adminId?.name || "System"}</p>
                            <p className="text-xs text-gray-400">{log.adminId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <FiClock size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{formatRelativeTime(log.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * LOGS_PER_PAGE + 1} to {Math.min(page * LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} logs
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            page === pageNum
                              ? "bg-purple-600 text-white"
                              : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export Button */}
      {filteredLogs.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              const csvRows = [
                ["Action", "Entity Type", "Entity Details", "Admin", "Admin Email", "Time"],
                ...filteredLogs.map(log => [
                  log.action || "",
                  log.targetEntityType || "",
                  getEntityDetails(log),
                  log.adminId?.name || "System",
                  log.adminId?.email || "",
                  formatDate(log.createdAt)
                ])
              ];
              const csvContent = csvRows.map(row => 
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
              ).join("\n");
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.setAttribute("download", `system_logs_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              toast.success("Logs exported successfully");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <FiDownload size={14} />
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}