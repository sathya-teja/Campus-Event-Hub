import Navbar from "../components/Navbar";
import StatsCard from "../components/StatsCard";
import Sidebar from "../components/Sidebar";
import {
  FiUsers,
  FiShield,
  FiSettings,
  FiActivity,
  FiHome,
  FiUserCheck,
  FiFileText,
} from "react-icons/fi";
import { useEffect, useState } from "react";
import API from "../services/api";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
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
            { key: "settings", label: "Platform Settings", icon: <FiSettings /> },
            { key: "logs", label: "System Logs", icon: <FiFileText /> },
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
            <h2 className="mb-6 text-xl sm:text-2xl font-semibold text-gray-800">
              Super Admin Dashboard
            </h2>

            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatsCard title="Total Admins" value="8" color="#dc2626" icon={<FiShield size={22} />} />
                  <StatsCard title="Total Students" value="1,250" color="#2563eb" icon={<FiUsers size={22} />} />
                  <StatsCard title="Active Sessions" value="342" color="#16a34a" icon={<FiActivity size={22} />} />
                  <StatsCard title="System Status" value="Healthy" color="#9333ea" icon={<FiSettings size={22} />} />
                </div>
                <Overview />
              </>
            )}

            {activeTab === "admins" && <ManageAdmins />}
            {activeTab === "users" && <AllUsers />}
            {activeTab === "settings" && <PlatformSettings />}
            {activeTab === "logs" && <SystemLogs />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= OVERVIEW ================= */
function Overview() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-4 text-lg font-semibold">Platform Overview</h3>
      <p className="text-gray-600 text-sm">
        Platform-wide analytics, system performance, and administrative insights.
      </p>
    </div>
  );
}

/* ================= MANAGE ADMINS ================= */
function ManageAdmins() {
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPendingAdmins = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/pending-admins");
      setPendingAdmins(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const approveAdmin = async (id) => {
    try {
      await API.put(`/admin/approve/${id}`);
      fetchPendingAdmins();
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const rejectAdmin = async (id) => {
    try {
      await API.delete(`/admin/reject/${id}`);
      fetchPendingAdmins();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

  useEffect(() => {
    fetchPendingAdmins();
  }, []);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-5 text-lg font-semibold">Pending College Admins</h3>

      {loading && <p className="text-gray-500">Loading pending admins...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && pendingAdmins.length === 0 && (
        <p className="text-gray-500">No pending college admins.</p>
      )}

      {pendingAdmins.map((admin) => (
        <div
          key={admin._id}
          className="p-4 border border-gray-200 rounded-lg mb-3 flex justify-between items-center gap-3"
        >
          <div className="min-w-0">
            <p className="font-semibold">{admin.name}</p>
            <p className="text-sm text-gray-600 truncate">
              {admin.email} • {admin.college}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => approveAdmin(admin._id)}
              className="bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 transition text-sm"
            >
              Approve
            </button>

            <button
              onClick={() => rejectAdmin(admin._id)}
              className="bg-red-600 text-white px-4 py-1.5 rounded-md hover:bg-red-700 transition text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= ALL USERS ================= */
function AllUsers() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-4 text-lg font-semibold">All Platform Users</h3>
      <p className="text-gray-600 text-sm">
        View and manage all registered students and admins.
      </p>
    </div>
  );
}

/* ================= PLATFORM SETTINGS ================= */
function PlatformSettings() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-4 text-lg font-semibold">Platform Settings</h3>
      <p className="text-gray-600 text-sm">
        Configure platform-level options, maintenance mode, and global settings.
      </p>
    </div>
  );
}

/* ================= SYSTEM LOGS ================= */
function SystemLogs() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-4 text-lg font-semibold">System Logs</h3>
      <p className="text-gray-600 text-sm">
        Monitor complete system activity and platform logs.
      </p>
    </div>
  );
}