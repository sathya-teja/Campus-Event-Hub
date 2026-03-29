import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import { CheckCircle2, Calendar, Zap, ShieldCheck } from "lucide-react";
import { resetPassword } from "../services/api";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const passwordRules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /\d/.test(password),
    special:   /[@#$%&]/.test(password),
  };
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%&])[A-Za-z\d@#$%&]{8,}$/;
  const passwordsMatch = confirmPassword && password === confirmPassword;

  const handleReset = async () => {
    if (!password || !confirmPassword) { toast.error("Please fill in both fields"); return; }
    if (!passwordRegex.test(password)) {
      toast.error("Password must have 8+ chars, 1 uppercase, 1 number & 1 special character (@#$%&)");
      return;
    }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    try {
      setLoading(true);
      await resetPassword(token, { password });
      setSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. Link may have expired.");
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
                Choose a<br />
                <span className="text-blue-100">strong password.</span>
              </h1>
              <p className="text-blue-100/80 text-base mt-4 leading-relaxed max-w-xs">
                Your new password must be at least 8 characters and include uppercase, number, and special character.
              </p>
            </motion.div>

            {/* Password requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2.5"
            >
              {[
                "At least 8 characters",
                "One uppercase letter (A–Z)",
                "One number (0–9)",
                "One special character (@ # $ % &)",
              ].map((rule) => (
                <div key={rule} className="flex items-center gap-2.5">
                  <ShieldCheck size={13} className="text-blue-200 flex-shrink-0" />
                  <span className="text-blue-100/80 text-sm">{rule}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom tag */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white/80 text-xs px-4 py-2 rounded-full">
              <Zap size={12} className="text-yellow-300" />
              Secure password reset
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

            {!success ? (
              <>
                {/* Back */}
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm mb-8 transition"
                >
                  <FiArrowLeft size={15} />
                  Back to login
                </button>

                {/* Heading */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-800">Reset password 🔒</h2>
                  <p className="text-slate-400 text-sm mt-2">Enter and confirm your new password below.</p>
                </div>

                <div className="space-y-5">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setTimeout(() => setIsTyping(false), 200)}
                        className="w-full border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                      </button>
                    </div>

                    {isTyping && password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 grid grid-cols-2 gap-1"
                      >
                        {[
                          { rule: passwordRules.length,    label: "8+ characters" },
                          { rule: passwordRules.uppercase, label: "Uppercase letter" },
                          { rule: passwordRules.number,    label: "Number" },
                          { rule: passwordRules.special,   label: "Special char" },
                        ].map(({ rule, label }) => (
                          <div key={label} className={`flex items-center gap-1 text-[11px] ${rule ? "text-emerald-600" : "text-slate-400"}`}>
                            <CheckCircle2 size={10} className={rule ? "text-emerald-500" : "text-slate-300"} />
                            {label}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                        className="w-full border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <p className={`text-[11px] mt-1.5 ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
                        {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
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
                        Resetting...
                      </>
                    ) : (
                      <>
                        <FiLock size={15} />
                        Reset Password
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
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Password updated! 🎉</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/login")}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)", boxShadow: "0 4px 20px rgba(37, 99, 235, 0.35)" }}
                >
                  <FiArrowLeft size={15} />
                  Go to Login
                </motion.button>
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