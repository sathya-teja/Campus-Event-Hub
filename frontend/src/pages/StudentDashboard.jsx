import MyRegistrations from "./MyRegistrations";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import StatsCard from "../components/StatsCard";
import Sidebar from "../components/Sidebar";
import QuickActions from "../components/QuickActions";
import RecentEvents from "../components/RecentEvents";
import { getMyRegistrations, getEvents } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FiList,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiHome,
} from "react-icons/fi";
import { TrendingUp } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [stats, setStats] = useState({
    totalEvents: 0,
    registeredEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    ongoingEvents: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const [eventsRes, regsRes] = await Promise.all([
          getEvents(),
          getMyRegistrations(),
        ]);

        const now           = new Date();
        const registrations = regsRes.data;
        const allEvents     = eventsRes.data;

        const totalEvents      = allEvents.length;
        const registeredEvents = registrations.length;

        const upcomingEvents = registrations.filter((reg) => {
          const event = reg.eventId;
          return event && new Date(event.startDate) > now;
        }).length;

        const completedEvents = registrations.filter((reg) => {
          const event = reg.eventId;
          return event && new Date(event.endDate) < now;
        }).length;

        const ongoingEvents = registrations.filter((reg) => {
          const event = reg.eventId;
          return event &&
            new Date(event.startDate) <= now &&
            new Date(event.endDate)   >= now;
        }).length;

        setStats({ totalEvents, registeredEvents, upcomingEvents, completedEvents, ongoingEvents });
      } catch {
        // silently fail
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
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
            { key: "overview", label: "Overview", icon: <FiHome /> },
            { key: "myevents", label: "My Events", icon: <FiCalendar /> },
          ]}
        />

        <main
          className={`
            flex-1 overflow-y-auto bg-gray-50
            transition-all duration-300
            ${collapsed ? "md:ml-[68px]" : "md:ml-64"}
          `}
        >
          <div className="p-5 sm:p-8">

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <>
                {/* Welcome banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
                  {/* Background decoration */}
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute -bottom-8 -right-16 w-48 h-48 bg-white/5 rounded-full" />

                  <div className="relative">
                    <p className="text-blue-200 text-sm font-medium mb-1">
                      {greeting()},
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold mb-1">
                      {user?.name || "Student"} 👋
                    </h2>
                    <p className="text-blue-200 text-sm">
                      Here's what's happening with your events today.
                    </p>

                    {/* Ongoing badge */}
                    {!statsLoading && stats.ongoingEvents > 0 && (
                      <div className="inline-flex items-center gap-1.5 mt-3 bg-white/15 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        {stats.ongoingEvents} event{stats.ongoingEvents > 1 ? "s" : ""} happening right now
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {statsLoading ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100 shadow-sm" />
                    ))
                  ) : (
                    <>
                      <StatsCard
                        title="Total Events"
                        value={stats.totalEvents}
                        color="#16a34a"
                        icon={<FiList size={22} />}
                      />
                      <StatsCard
                        title="Registered"
                        value={stats.registeredEvents}
                        color="#2563eb"
                        icon={<FiCalendar size={22} />}
                      />
                      <StatsCard
                        title="Upcoming"
                        value={stats.upcomingEvents}
                        color="#f59e0b"
                        icon={<FiClock size={22} />}
                      />
                      <StatsCard
                        title="Completed"
                        value={stats.completedEvents}
                        color="#9333ea"
                        icon={<FiCheckCircle size={22} />}
                      />
                    </>
                  )}
                </div>

                {/* Bottom section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <RecentEvents />
                  <QuickActions setActiveTab={setActiveTab} />
                </div>
              </>
            )}

            {activeTab === "myevents" && <MyRegistrations />}
          </div>
        </main>
      </div>
    </div>
  );
}