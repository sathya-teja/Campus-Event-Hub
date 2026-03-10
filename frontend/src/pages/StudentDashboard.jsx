import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import StatsCard from "../components/StatsCard";
import Sidebar from "../components/Sidebar";
import QuickActions from "../components/QuickActions";
import RecentEvents from "../components/RecentEvents";
import { getMyRegistrations, cancelRegistration } from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  FiList,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiHome,
  FiUser,
  FiX,
} from "react-icons/fi";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Navbar */}
      <Navbar toggleSidebar={() => setMobileOpen(true)} />

      {/* Below navbar: sidebar + main content */}
      <div className="flex flex-1 pt-16 overflow-hidden">

        {/* Collapsible Sidebar */}
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
            { key: "profile", label: "Profile", icon: <FiUser /> },
          ]}
        />

        {/* Main Content - shifts based on sidebar state */}
        <main
          className={`
            flex-1 overflow-y-auto bg-gray-50
            transition-all duration-300
            ${collapsed ? "md:ml-[68px]" : "md:ml-64"}
          `}
        >
          <div className="p-5 sm:p-8">
            <h2 className="mb-6 text-xl sm:text-2xl font-semibold text-gray-800">
              Student Dashboard
            </h2>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <>
                {/* Stats - responsive grid: 1 col mobile, 2 col sm, 4 col lg */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatsCard
                    title="Total Events"
                    value="12"
                    color="#16a34a"
                    icon={<FiList size={22} />}
                  />
                  <StatsCard
                    title="Registered Events"
                    value="5"
                    color="#2563eb"
                    icon={<FiCalendar size={22} />}
                  />
                  <StatsCard
                    title="Upcoming Events"
                    value="3"
                    color="#f59e0b"
                    icon={<FiClock size={22} />}
                  />
                  <StatsCard
                    title="Completed Events"
                    value="4"
                    color="#9333ea"
                    icon={<FiCheckCircle size={22} />}
                  />
                </div>

                {/* Bottom section - stacks on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <RecentEvents />
                  <QuickActions />
                </div>
              </>
            )}

            {activeTab === "myevents" && <MyEvents />}
            {activeTab === "profile" && <StudentProfile />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= MY EVENTS SECTION ================= */

function MyEvents() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [cancellingId, setCancellingId]   = useState(null);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const { data } = await getMyRegistrations();
      setRegistrations(data);
    } catch {
      toast.error("Failed to load your registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegistrations(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this registration?")) return;
    try {
      setCancellingId(id);
      await cancelRegistration(id);
      toast.success("Registration cancelled");
      setRegistrations((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel registration");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusStyle = (status) => {
    if (status === "approved")  return "bg-green-100 text-green-800";
    if (status === "rejected")  return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  if (loading) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5">
        <h3 className="mb-5 text-lg font-semibold">My Registered Events</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg mb-3 animate-pulse" />
        ))}
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5 text-center py-12">
        <FiCalendar size={36} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">You haven't registered for any events yet</p>
        <button
          onClick={() => navigate("/events")}
          className="mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
        >
          Browse Events
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-5 text-lg font-semibold">My Registered Events</h3>

      {registrations.map((reg) => {
        const event = reg.eventId;
        if (!event) return null;
        const startDate = new Date(event.startDate).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        });
        const canCancel = reg.status !== "rejected";

        return (
          <div
            key={reg._id}
            className="flex justify-between items-center p-4 border border-gray-200 rounded-lg mb-3 gap-3"
          >
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/events/${event._id}`)}>
              <div className="font-semibold truncate">{event.title}</div>
              <div className="text-sm text-gray-500">{startDate} • {event.location}</div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(reg.status)}`}>
                {reg.status}
              </span>
              {canCancel && (
                <button
                  onClick={() => handleCancel(reg._id)}
                  disabled={cancellingId === reg._id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                  title="Cancel registration"
                >
                  {cancellingId === reg._id
                    ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin block" />
                    : <FiX size={14} />
                  }
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= PROFILE SECTION ================= */

function StudentProfile() {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5 max-w-lg">
      <h3 className="mb-5 text-lg font-semibold">My Profile</h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-500">Name</label>
          <p className="font-medium">John Doe</p>
        </div>

        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="font-medium">john@example.com</p>
        </div>

        <div>
          <label className="text-sm text-gray-500">College</label>
          <p className="font-medium">Tech University</p>
        </div>

        <button className="mt-4 bg-[#1F3C88] text-white px-4 py-2 rounded-md hover:bg-[#162e66] transition">
          Edit Profile
        </button>
      </div>
    </div>
  );
}