import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiArrowLeft } from "react-icons/fi";
import { Calendar, Zap, Mail } from "lucide-react";
import { forgotPassword } from "../services/api";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { toast.error("Please enter your email address"); return; }
    try {
      setLoading(true);
      await forgotPassword({ email: email.trim() });
      setSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex" style={{ minHeight: "620px" }}>

        {/* ══════════════════════════════
            LEFT — Gradient Illustrated Panel
        ══════════════════════════════ */}
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="hidden lg:flex w-[52%] relative overflow-hidden flex-col justify-between p-12"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)",
          }}
        >
          {/* Floating pill shapes */}
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
                  position: "absolute",
                  width: p.w, height: p.h,
                  top: p.top, left: p.left,
                  borderRadius: 999,
                  background: "rgba(255,255,255," + p.opacity + ")",
                  transform: `rotate(${p.rotate}deg)`,
                }}
              />
            ))}
            <div className="absolute top-[30%] right-[10%] w-48 h-48 rounded-full border-2 border-white/10" />
            <div className="absolute bottom-[20%] left-[5%] w-32 h-32 rounded-full border-2 border-white/10" />
            <div className="absolute top-[60%] right-[5%] w-20 h-20 rounded-full bg-white/5" />
          </div>

          {/* Logo */}
          <div
  className="flex items-center gap-2 cursor-pointer"
  onClick={() => navigate("/")}
>
  <img
    src="/fav.svg"
    alt="logo"
    className="w-10 h-10 object-contain drop-shadow-md"
  />

  <div className="flex flex-col leading-none">
    <span className="font-bold text-white text-base md:text-lg">
      Campus{" "}
      <span className="text-blue-200">
        EventHub
      </span>
    </span>

    <span className="text-[10px] text-blue-100">
      Discover. Celebrate. Connect.
    </span>
  </div>
</div>
          {/* Center text */}
          <div className="relative z-10 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              <h1 className="text-5xl font-bold text-white leading-tight">
                No worries,<br />
                <span className="text-blue-100">we've got you.</span>
              </h1>
              <p className="text-blue-100/80 text-base mt-4 leading-relaxed max-w-xs">
                Enter your registered email and we'll send you a secure link to reset your password.
              </p>
            </motion.div>

            {/* Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              {[
                { step: "01", text: "Enter your email address" },
                { step: "02", text: "Check your inbox for the reset link" },
                { step: "03", text: "Set a new strong password" },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-white/80 text-xs font-bold">{s.step}</span>
                  </div>
                  <span className="text-blue-100/90 text-sm">{s.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom tag */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white/80 text-xs px-4 py-2 rounded-full">
              <Zap size={12} className="text-yellow-300" />
              Link expires in 15 minutes
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════
            RIGHT — Form
        ══════════════════════════════ */}
        <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
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
            {/* Back button */}
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm mb-8 transition"
            >
              <FiArrowLeft size={15} />
              Back to login
            </button>

            {!sent ? (
              <>
                {/* Heading */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-800">Forgot password? 🔑</h2>
                  <p className="text-slate-400 text-sm mt-2">
                    Enter your email and we'll send a reset link.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        className="w-full border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: loading
                        ? "#94a3b8"
                        : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)",
                      boxShadow: loading ? "none" : "0 4px 20px rgba(37, 99, 235, 0.35)",
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={15} />
                        Send Reset Link
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            ) : (
              /* ── Success State ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
                  <Mail size={36} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox 📬</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">
                  We sent a password reset link to
                </p>
                <p className="text-blue-600 font-semibold text-sm mb-6 break-all">{email}</p>
                <p className="text-slate-400 text-xs mb-8">
                  The link expires in <span className="font-semibold text-slate-600">15 minutes</span>. Check your spam folder if you don't see it.
                </p>

                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all mb-3"
                >
                  Try a different email
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)", boxShadow: "0 4px 20px rgba(37, 99, 235, 0.35)" }}
                >
                  <FiArrowLeft size={15} />
                  Back to Login
                </button>
              </motion.div>
            )}

            <p className="text-center text-slate-400 text-xs mt-8">
              © 2026 CampusEventHub. All rights reserved.
            </p>
          </motion.div>
        </div>

      </div>
    </div>
  );
}