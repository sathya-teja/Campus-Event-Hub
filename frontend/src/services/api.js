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

/* ================= CHAT API ================= */

export const sendChatMessage = (message)   => API.post("/chat", { message });

/* ================= IMAGE HELPER ================= */
// Use this wherever you build an image src from a server path.
// e.g.  getImageUrl(event.image)  →  "http://localhost:5000/uploads/abc.jpg"
export const getImageUrl = (path) => (path ? `${BASE_URL}/${path}` : null);

export default API;