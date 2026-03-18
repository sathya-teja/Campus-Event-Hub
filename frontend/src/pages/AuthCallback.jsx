// src/pages/AuthCallback.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import AppLoader from "../components/AppLoader";

export default function AuthCallback() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const handled   = useRef(false); // ✅ prevents double-run in React StrictMode

  useEffect(() => {
    if (handled.current) return; // already ran, skip
    handled.current = true;

    const params = new URLSearchParams(window.location.search);

    // ── Check for error from backend ─────────────────────────────────────────
    const error = params.get("error");
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
      navigate("/login");
      return;
    }

    const token        = params.get("token");
    const id           = params.get("id");
    const name         = params.get("name");
    const email        = params.get("email");
    const role         = params.get("role");
    const profileImage = params.get("profileImage") || "";

    // ── Validate required params ──────────────────────────────────────────────
    if (!token || !id) {
      toast.error("Authentication failed. Please try again.");
      navigate("/login");
      return;
    }

    // ── Call existing login() — same as Login.jsx ─────────────────────────────
    login(token, { id, name, email, role, profileImage });
    toast.success(`Welcome, ${name}! 🎉`);
    navigate("/");

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AppLoader />;
}