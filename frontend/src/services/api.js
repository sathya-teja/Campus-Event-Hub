import axios from "axios";

/* ─────────────────────────────────────────────────────────────
   SINGLE SOURCE OF TRUTH — change this one line to point to
   your production server and every file updates automatically.
───────────────────────────────────────────────────────────── */
export const BASE_URL = "http://localhost:5000";

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
});

/* ================= JWT INTERCEPTOR ================= */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ================= AUTH APIs ================= */

export const registerUser    = (data)         => API.post("/auth/register", data);
export const loginUser       = (data)         => API.post("/auth/login", data);
export const getMe           = ()             => API.get("/auth/me");
export const forgotPassword  = (data)         => API.post("/auth/forgot-password", data);
export const resetPassword   = (token, data)  => API.put(`/auth/reset-password/${token}`, data);

/* ================= USER APIs ================= */

export const updateProfile  = (data) =>
  API.put("/users/update-profile", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const changePassword = (data) => API.put("/users/change-password", data);
export const deleteAccount  = ()     => API.delete("/users/delete-account");
export const getAllUsers = (params) => API.get("/users/all-users", { params });

/* ================= EVENT APIs ================= */

export const getEvents      = ()           => API.get("/events");
export const getEventById = (id) => API.get(`/events/${id}`);
export const createEvent    = (data)       =>
  API.post("/events", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateEvent    = (id, data)   =>
  API.put(`/events/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteEvent    = (id)         => API.delete(`/events/${id}`);
export const getMyEvents = () => API.get("/events/my-events");

/* ================= REGISTRATION APIs ================= */

export const registerForEvent       = (eventId)  => API.post("/registrations", { eventId });
export const getMyRegistrations     = ()          => API.get("/registrations/my");
export const cancelRegistration     = (id)        => API.delete(`/registrations/cancel/${id}`);
export const getEventRegistrations  = (eventId)   => API.get(`/registrations/event/${eventId}`);
export const getAllRegistrations     = ()          => API.get("/registrations/all");
export const approveRegistration    = (id)        => API.put(`/registrations/approve/${id}`);
export const rejectRegistration     = (id)        => API.put(`/registrations/reject/${id}`);
export const getTotalRegistrations  = ()          => API.get("/registrations/stats/total");
export const getMyEventStudents     = ()          => API.get("/registrations/my-students");

// Export Registrations
export const exportRegistrationsCSV = (eventId) =>
  API.get(`/registrations/export/${eventId}/csv`, { responseType: "blob" });

export const exportRegistrationsExcel = (eventId) =>
  API.get(`/registrations/export/${eventId}/excel`, { responseType: "blob" });

export const exportRegistrationsPDF = (eventId) =>
  API.get(`/registrations/export/${eventId}/pdf`, { responseType: "blob" });

export const exportRegistrationsJSON = (eventId) =>
  API.get(`/registrations/export/${eventId}/json`, { responseType: "blob" });

// Export All Registrations
export const exportAllRegistrationsCSV = () =>
  API.get(`/registrations/export-all/csv`, { responseType: "blob" });

export const exportAllRegistrationsExcel = () =>
  API.get(`/registrations/export-all/excel`, { responseType: "blob" });

export const exportAllRegistrationsPDF = () =>
  API.get(`/registrations/export-all/pdf`, { responseType: "blob" });

export const exportAllRegistrationsJSON = () =>
  API.get(`/registrations/export-all/json`, { responseType: "blob" });

/* ================= QR ATTENDANCE APIs ================= */

// Student: get signed QR payload for a specific approved registration
export const getRegistrationQR      = (registrationId) =>
  API.get(`/registrations/${registrationId}/qr`);

// Student: get full ticket (QR + event details + student info) for the ticket page
export const getRegistrationTicket  = (registrationId) =>
  API.get(`/registrations/${registrationId}/ticket`);

// Admin: post a scanned QR payload to mark attendance
export const scanAttendanceQR       = (qrPayload) =>
  API.post("/registrations/scan", { qrPayload });

// Admin: get full attendance report for a specific event
export const getEventAttendance     = (eventId) =>
  API.get(`/registrations/attendance/${eventId}`);

/* ================= CHAT API ================= */

export const sendChatMessage = (message)   => API.post("/chat", { message });

/* ================= IMAGE HELPER ================= */
// Use this wherever you build an image src from a server path.
// e.g.  getImageUrl(event.image)  →  "http://localhost:5000/uploads/abc.jpg"
export const getImageUrl = (path) => (path ? `${BASE_URL}/${path}` : null);


// ✅ NEW: OAuth helper — redirects browser to backend Google OAuth flow
// No axios call needed; the browser must follow the redirect for cookies/OAuth to work.
export const loginWithGoogle = () => {
  window.location.href = `${BASE_URL}/api/auth/google`;
};
 
/*
  Future providers — add here:
  export const loginWithGitHub    = () => { window.location.href = `${BASE_URL}/api/auth/github`; };
  export const loginWithMicrosoft = () => { window.location.href = `${BASE_URL}/api/auth/microsoft`; };
*/

export default API;