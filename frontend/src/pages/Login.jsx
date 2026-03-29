// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { ArrowRight, Calendar, Users, Star } from "lucide-react";
import { loginUser, loginWithGoogle } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Please enter email and password"); return; }
    try {
      setLoading(true);
      const res = await loginUser({ email: email.trim(), password });
      const { token, user } = res.data;
      login(token, user);
      toast.success("Login successful");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex" style={{minHeight: "620px"}}>

      {/* LEFT — Gradient Panel */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            { w: 120, h: 40, top: "12%", left: "8%",  rotate: -35, opacity: 0.18 },
            { w: 80,  h: 28, top: "22%", left: "55%", rotate: 20,  opacity: 0.15 },
            { w: 160, h: 44, top: "38%", left: "-4%", rotate: -40, opacity: 0.12 },
            { w: 100, h: 34, top: "55%", left: "60%", rotate: 30,  opacity: 0.16 },
            { w: 140, h: 40, top: "68%", left: "15%", rotate: -25, opacity: 0.14 },
            { w: 90,  h: 30, top: "78%", left: "50%", rotate: 15,  opacity: 0.18 },
            { w: 60,  h: 22, top: "88%", left: "5%",  rotate: -50, opacity: 0.12 },
            { w: 110, h: 36, top: "5%",  left: "40%", rotate: 40,  opacity: 0.1  },
          ].map((p, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -12, 0], rotate: [p.rotate, p.rotate + 5, p.rotate] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", width: p.w, height: p.h,
                top: p.top, left: p.left, borderRadius: 999,
                background: "rgba(255,255,255," + p.opacity + ")",
                transform: `rotate(${p.rotate}deg)`,
              }}
            />
          ))}
          <div className="absolute top-[30%] right-[10%] w-48 h-48 rounded-full border-2 border-white/10" />
          <div className="absolute bottom-[20%] left-[5%] w-32 h-32 rounded-full border-2 border-white/10" />
          <div className="absolute top-[60%] right-[5%] w-20 h-20 rounded-full bg-white/5" />
        </div>

        <div className="flex items-center gap-3 relative z-10 cursor-pointer" onClick={() => navigate("/")}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
  <img
    src="/fav.svg"
    alt="logo"
    className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-md"
  />

  <div className="flex flex-col leading-none">
    <span className="font-bold text-white text-sm sm:text-base md:text-lg">
      Campus{" "}
      <span className="text-blue-200">
        EventHub
      </span>
    </span>

    <span className="text-[9px] sm:text-[10px] text-blue-100">
      Discover. Celebrate. Connect.
    </span>
  </div>
</div>
        </div>

        <div className="relative z-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Connect.<br />Explore.<br />
              <span className="text-blue-100">Participate.</span>
            </h1>
            <p className="text-blue-100/80 text-base mt-4 leading-relaxed max-w-xs">
              The one platform for all inter-college events — sports, hackathons, cultural fests and workshops.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex gap-6">
            {[
              { icon: Calendar, value: "200+", label: "Events" },
              { icon: Users,    value: "5K+",  label: "Students" },
              { icon: Star,     value: "50+",  label: "Colleges" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon size={16} className="text-blue-100 mx-auto mb-1" />
                <div className="text-white font-bold text-lg">{s.value}</div>
                <div className="text-blue-100/70 text-xs">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* RIGHT — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-6">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
                      <div
  className="flex lg:hidden items-center gap-2 justify-center mb-6 cursor-pointer"
  onClick={() => navigate("/")}
>
  <img
    src="/fav.svg"
    alt="logo"
    className="w-9 h-9 object-contain"
  />

  <div className="flex flex-col leading-none">
    <span className="text-slate-800 font-bold text-lg">
      Campus <span className="text-blue-600">EventHub</span>
    </span>

    {/* 👇 THIS is the "under tag" */}
    <span className="text-[10px] text-slate-400">
      Discover. Celebrate. Connect.
    </span>
  </div>
</div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-800">Welcome back 👋</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="email"
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</label>
                <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline transition">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={handleLogin} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? "#94a3b8" : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(37, 99, 235, 0.35)",
              }}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : (
                <>Sign In<ArrowRight size={15} /></>
              )}
            </motion.button>

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-slate-400 text-xs">or</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Google Button */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin} disabled={googleLoading}
              className="w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {googleLoading ? (
                <><div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />Redirecting...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <g fill="none" fillRule="evenodd">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </g>
                  </svg>
                  Continue with Google
                </>
              )}
            </motion.button>
          </div>

          {/* Register divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-slate-400 text-xs">Don't have an account?</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button
            onClick={() => navigate("/register")}
            className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
          >
            Create an Account
          </button>

          <p className="text-center text-slate-400 text-xs mt-4">
            © 2026 CampusEventHub. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
    </div>
  );
}