import MyRegistrations from "./MyRegistrations";
import MyCertificates from "./MyCertificates";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import QuickActions from "../components/QuickActions";
import RecentEvents from "../components/RecentEvents";
import { getMyRegistrations, getEvents } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { FiList, FiCalendar, FiClock, FiCheckCircle, FiHome, FiAward } from "react-icons/fi";
import { TrendingUp } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return { text: "Good evening", emoji: "🌙" };
}


function AnimatedNumber({ value, loading }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (loading) return;
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 30));
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value, loading]);
  return <span>{loading ? "—" : display}</span>;
}

// ── Custom Donut label ────────────────────────────────────────────────────────
const DonutLabel = ({ cx, cy, total }) => (
  <>
    <text x={cx} y={cy - 8} textAnchor="middle" fill="#111827" fontSize={26} fontWeight={700}>{total}</text>
    <text x={cx} y={cy + 14} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={500}>My Events</text>
  </>
);

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };
  const [activeTab, setActiveTab]   = useState(location.state?.activeTab || "overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);

  // ── Existing stats state ──────────────────────────────────────────────────
  const [stats, setStats] = useState({
    totalEvents: 0, registeredEvents: 0,
    upcomingEvents: 0, completedEvents: 0, ongoingEvents: 0,
    certificates: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Chart data state ──────────────────────────────────────────────────────
  const [donutData,    setDonutData]    = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const [eventsRes, regsRes] = await Promise.all([getEvents(), getMyRegistrations()]);
        const now           = new Date();
        const registrations = regsRes.data;
        const allEvents     = eventsRes.data;

        // ── Existing logic — untouched ────────────────────────────────────
        const totalEvents      = allEvents.length;
        const registeredEvents = registrations.filter(reg => reg.eventId && reg.status !== "rejected").length;
        const upcomingEvents   = registrations.filter(reg => reg.eventId && new Date(reg.eventId.startDate) > now).length;
        const completedEvents  = registrations.filter(reg => reg.eventId && new Date(reg.eventId.endDate) < now).length;
        const ongoingEvents    = registrations.filter(reg => {
          const event = reg.eventId;
          return event && new Date(event.startDate) <= now && new Date(event.endDate) >= now;
        }).length;

        // ── Certificates earned (approved + attended) ─────────────────────
        const certificates = registrations.filter(
          reg => reg.status === "approved" && reg.attended
        ).length;

        setStats({ totalEvents, registeredEvents, upcomingEvents, completedEvents, ongoingEvents, certificates });

        // ── Chart 1: Donut — status breakdown ─────────────────────────────
        const donut = [
          { name: "Upcoming",  value: upcomingEvents,  color: "#3b82f6" },
          { name: "Completed", value: completedEvents, color: "#10b981" },
          { name: "Ongoing",   value: ongoingEvents,   color: "#f59e0b" },
        ].filter(d => d.value > 0);
        setDonutData(donut.length > 0 ? donut : [{ name: "No data", value: 1, color: "#e5e7eb" }]);

        // ── Chart 2: Bar — category breakdown of registered events ────────
        const catCount = {};
        registrations.forEach(reg => {
          if (!reg.eventId || reg.status === "rejected") return;
          const cat = reg.eventId.category || "Other";
          catCount[cat] = (catCount[cat] || 0) + 1;
        });
        const catColors = { Tech: "#3b82f6", Cultural: "#a855f7", Sports: "#10b981", Workshop: "#f59e0b", Other: "#6b7280" };
        setCategoryData(
          Object.entries(catCount).map(([name, count]) => ({ name, count, fill: catColors[name] || "#6b7280" }))
        );

        // ── Chart 3: Timeline — registrations per month (last 6 months) ──
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push({
            label: d.toLocaleDateString("en-IN", { month: "short" }),
            year:  d.getFullYear(),
            month: d.getMonth(),
            registrations: 0,
          });
        }
        registrations.forEach(reg => {
          if (!reg.createdAt) return;
          const d = new Date(reg.createdAt);
          const m = months.find(mo => mo.month === d.getMonth() && mo.year === d.getFullYear());
          if (m) m.registrations += 1;
        });
        setTimelineData(months.map(m => ({ name: m.label, value: m.registrations })));

      } catch { /* silently fail */ }
      finally { setStatsLoading(false); }
    };
    fetchStats();
  }, []);

  const { text: greetText, emoji: greetEmoji } = greeting();

  const statCards = [
    { title: "Total Events",  value: stats.totalEvents,      icon: <FiList size={18} />,        accent: "#2563eb", bg: "from-blue-50 to-blue-100/60",       iconBg: "bg-blue-600",    trend: "All available" },
    { title: "Registered",    value: stats.registeredEvents, icon: <FiCalendar size={18} />,    accent: "#7c3aed", bg: "from-violet-50 to-violet-100/60",   iconBg: "bg-violet-600",  trend: "Your events"   },
    { title: "Upcoming",      value: stats.upcomingEvents,   icon: <FiClock size={18} />,       accent: "#d97706", bg: "from-amber-50 to-amber-100/60",     iconBg: "bg-amber-500",   trend: "Scheduled"     },
    { title: "Certificates",  value: stats.certificates,     icon: <FiAward size={18} />,       accent: "#059669", bg: "from-emerald-50 to-emerald-100/60", iconBg: "bg-emerald-600", trend: "Earned"        },
  ];

  const hasRegistrations = stats.registeredEvents > 0;

  return (
    <>
      <style>{dashStyles}</style>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar toggleSidebar={() => setMobileOpen(true)} />
        <div className="flex flex-1 pt-16 overflow-hidden">
          <Sidebar
            title="Student Panel"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            items={[
              { key: "overview",      label: "Overview",          icon: <FiHome />  },
              { key: "myevents",      label: "My Registrations",  icon: <FiList />  },
              { key: "certificates",  label: "Certificates",      icon: <FiAward /> },
            ]}
            onLogout={handleLogout}
          />

          <main
            className={`flex-1 overflow-y-auto transition-all duration-300 ${collapsed ? "md:ml-[68px]" : "md:ml-64"}`}
            style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 50%, #f0fdf4 100%)" }}
          >
            {/* ══ OVERVIEW ══ */}
            {activeTab === "overview" && (
              <div className="p-5 sm:p-8 space-y-6 dash-fade-in">

                {/* ── HERO ── */}
                <div className="relative overflow-hidden rounded-3xl text-white dash-hero" style={{
                  background: "linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #0ea5e9 100%)",
                  minHeight: 168,
                }}>
                  <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/10" />
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border border-white/10" />
                  <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-white/5" />
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                  <div className="relative z-10 p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-200 text-sm font-medium">{greetText}</span>
                        <span className="text-base">{greetEmoji}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
                        {user?.name?.split(" ")[0] || "Student"}
                      </h2>
                      <p className="text-blue-100/80 text-sm">Here's your event activity at a glance.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {!statsLoading && stats.ongoingEvents > 0 && (
                        <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                          <span className="text-xs font-semibold text-white">{stats.ongoingEvents} live now</span>
                        </div>
                      )}
                      {!statsLoading && stats.certificates > 0 && (
                        <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                          <FiAward size={13} className="text-yellow-300" />
                          <span className="text-xs font-semibold text-white">
                            {stats.certificates} certificate{stats.certificates !== 1 ? "s" : ""} earned
                          </span>
                        </div>
                      )}
                      {!statsLoading && stats.totalEvents > 0 && (
                        <div className="flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                          <TrendingUp size={13} className="text-green-300" />
                          <span className="text-xs font-semibold text-white">
                            {Math.round((stats.registeredEvents / stats.totalEvents) * 100)}% participation
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── STAT CARDS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statsLoading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/70 animate-pulse border border-gray-100 shadow-sm" />)
                  ) : (
                    statCards.map((card, i) => (
                      <div
                        key={i}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bg} border border-white/80 shadow-sm dash-card`}
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-20" style={{ background: card.accent }} />
                        <div className="relative p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center text-white shadow-sm`}>{card.icon}</div>
                            <span className="text-xs font-medium text-gray-400">{card.trend}</span>
                          </div>
                          <div className="text-3xl font-bold text-gray-900 mb-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                            <AnimatedNumber value={card.value} loading={statsLoading} />
                          </div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.title}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ── CHARTS ROW ── */}
                {!statsLoading && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 dash-card" style={{ animationDelay: "200ms" }}>

                    {/* Chart 1 — Donut: Event Status */}
                    <div className="chart-panel flex flex-col">
                      <div className="chart-header">
                        <div className="chart-dot bg-blue-500" />
                        <span>Event Status</span>
                      </div>
                      {hasRegistrations ? (
                        <>
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie
                                data={donutData}
                                cx="50%" cy="50%"
                                innerRadius={52} outerRadius={76}
                                paddingAngle={donutData.length > 1 ? 3 : 0}
                                dataKey="value"
                                animationBegin={100}
                                animationDuration={800}
                              >
                                {donutData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} stroke="none" />
                                ))}
                                <DonutLabel cx="50%" cy="50%" total={stats.registeredEvents} />
                              </Pie>
                              <Tooltip
                                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                                formatter={(v, n) => [v, n]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Legend */}
                          <div className="flex justify-center gap-4 mt-1 flex-wrap">
                            {donutData.filter(d => d.name !== "No data").map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                <span className="text-xs text-gray-500 font-medium">{d.name} <span className="text-gray-800 font-bold">{d.value}</span></span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <EmptyChart message="Register for events to see your status breakdown" />}
                    </div>

                    {/* Chart 2 — Bar: Category breakdown */}
                    <div className="chart-panel flex flex-col">
                      <div className="chart-header">
                        <div className="chart-dot bg-violet-500" />
                        <span>Events by Category</span>
                      </div>
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                              cursor={{ fill: "rgba(0,0,0,0.04)" }}
                              formatter={(v) => [v, "Events"]}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} animationBegin={150} animationDuration={800}>
                              {categoryData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart message="Register for events to see category breakdown" />}
                    </div>

                    {/* Chart 3 — Area: Registration timeline */}
                    <div className="chart-panel flex flex-col">
                      <div className="chart-header">
                        <div className="chart-dot bg-emerald-500" />
                        <span>Activity (6 months)</span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                            formatter={(v) => [v, "Registrations"]}
                          />
                          <Area
                            type="monotone" dataKey="value"
                            stroke="#10b981" strokeWidth={2.5}
                            fill="url(#actGrad)"
                            dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                            animationBegin={200} animationDuration={900}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* ── BOTTOM ROW — Recent Events + Quick Actions ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="dash-widget"><RecentEvents /></div>
                  <div className="dash-widget"><QuickActions setActiveTab={setActiveTab} /></div>
                </div>

              </div>
            )}

            {/* ══ MY REGISTRATIONS ══ */}
            {activeTab === "myevents" && (
              <div className="p-5 sm:p-8 dash-fade-in">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">My Registrations</h2>
                  <p className="text-sm text-gray-500 mt-1">All events you have signed up for</p>
                </div>
                <MyRegistrations />
              </div>
            )}

            {/* ══ CERTIFICATES ══ */}
            {activeTab === "certificates" && (
              <div className="p-5 sm:p-8 dash-fade-in">
                <MyCertificates />
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
}

// ── Empty chart placeholder ───────────────────────────────────────────────────
function EmptyChart({ message }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
        <FiCheckCircle size={18} className="text-gray-300" />
      </div>
      <p className="text-xs text-gray-400 text-center max-w-[160px] leading-relaxed">{message}</p>
    </div>
  );
}

// ── Scoped CSS ────────────────────────────────────────────────────────────────
const dashStyles = `
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