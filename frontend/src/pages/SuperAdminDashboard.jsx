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
  const [confirm, setConfirm] = useState(null); // { type: "approve"|"reject", id, name }
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
        (a) => a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.college?.toLowerCase().includes(q)
      )
    );
  }, [search, pendingAdmins]);

  const handleConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === "approve") {
        await API.put(`/admin/approve/${confirm.id}`);
      } else {
        await API.put(`/users/reject-admin/${confirm.id}`);
      }
      setConfirm(null);
      fetchPendingAdmins();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

<<<<<<< HEAD
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
=======
  const getInitials = (name) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const avatarColors = ["bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500"];
  const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];
>>>>>>> 9a1cb6932463935cf9daf4e8aa5078cc540fb41d

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

<<<<<<< HEAD
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
=======
      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">Pending College Admins</h3>
            {!loading && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {pendingAdmins.length} pending
              </span>
            )}
          </div>
          <button
            onClick={fetchPendingAdmins}
            className="text-sm text-blue-600 hover:underline self-start sm:self-auto"
          >
            Refresh
          </button>
>>>>>>> 9a1cb6932463935cf9daf4e8aa5078cc540fb41d
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            placeholder="Search by name, email or college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Skeletons */}
        {loading && [1, 2, 3].map((i) => <AdminSkeleton key={i} />)}

        {/* Empty state */}
        {!loading && !error && pendingAdmins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No pending college admin requests.</p>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && pendingAdmins.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-gray-500 text-sm">No admins match your search.</p>
          </div>
        )}

        {/* Admin Cards */}
        {!loading && filtered.map((admin) => (
          <div
            key={admin._id}
            className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl mb-3 hover:border-gray-200 hover:shadow-sm transition"
          >
            {/* Avatar */}
            <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${getColor(admin.name)}`}>
              {getInitials(admin.name)}
            </div>

            {/* Info */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => setSelectedAdmin(admin)}
            >
              <p className="font-semibold text-gray-800 text-sm truncate hover:text-blue-600 transition">
                {admin.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{admin.email}</p>
              {admin.college && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{admin.college}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setConfirm({ type: "approve", id: admin._id, name: admin.name })}
                className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 transition text-xs font-medium"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setConfirm({ type: "reject", id: admin._id, name: admin.name })}
                className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition text-xs font-medium"
              >
                ✕ Reject
              </button>
            </div>
          </div>
        ))}
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

  // Debounce search input by 400ms
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
<<<<<<< HEAD
    <div className="bg-white p-6 rounded-xl shadow-md shadow-black/5">
      <h3 className="mb-4 text-lg font-semibold">All Platform Users</h3>
      <p className="text-gray-600 text-sm">
        View and manage all registered students and admins.
      </p>
=======
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md shadow-black/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="text-lg font-semibold">All Platform Users</h3>
        <span className="text-sm text-gray-500">{!loading && `${users.length} user${users.length !== 1 ? "s" : ""} found`}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="college_admin">College Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* States */}
      {loading && <p className="text-gray-500 text-sm">Loading users...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <p className="text-gray-500 text-sm">No users found.</p>
      )}

      {/* Table — desktop */}
      {!loading && !error && users.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">College</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 pr-4 font-medium text-gray-800">{user.name}</td>
                    <td className="py-3 pr-4 text-gray-600 truncate max-w-[180px]">{user.email}</td>
                    <td className="py-3 pr-4">{roleBadge(user.role)}</td>
                    <td className="py-3 pr-4 text-gray-600">{user.college || "—"}</td>
                    <td className="py-3">{statusBadge(user.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="md:hidden flex flex-col gap-3">
            {users.map((user) => (
              <div key={user._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  {statusBadge(user.status)}
                </div>
                <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                <div className="flex gap-2 flex-wrap">
                  {roleBadge(user.role)}
                  {user.college && (
                    <span className="text-xs text-gray-500">{user.college}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
>>>>>>> 9a1cb6932463935cf9daf4e8aa5078cc540fb41d
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