import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { ArrowRight, Calendar, CheckCircle2, Building2, Zap, Shield, Globe } from "lucide-react";
import { registerUser } from "../services/api";
import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTypingPassword, setIsTypingPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "", email: "", college: "",
    password: "", confirmPassword: "", role: "student",
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%&])[A-Za-z\d@#$%&]{8,}$/;
  const passwordRules = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[@#$%&]/.test(formData.password),
  };
  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleRegister = async () => {
    const { fullName, email, college, password, confirmPassword, role } = formData;
    if (!fullName || !email || !college || !password || !confirmPassword) {
      toast.error("Please fill all required fields"); return;
    }
    if (!passwordRegex.test(password)) {
      toast.error("Password must include 8+ characters, uppercase, number & special character"); return;
    }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    try {
      await registerUser({ name: fullName, email, password, college, role });
      if (role === "college_admin") {
        toast("Registered! Wait for Super Admin approval.", { icon: "⏳" });
      } else {
        toast.success("Registration successful! Redirecting...");
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    }
  };

  const inputCls = "w-full border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex" style={{ minHeight: "620px" }}>

        {/* ══════════════════════════════
            LEFT — Register Form
        ══════════════════════════════ */}
        <div className="flex-1 flex items-center justify-center bg-white px-8 py-8">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
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
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Create Account ✨</h2>
              <p className="text-slate-400 text-sm mt-1">Join thousands of students on CampusEventHub</p>
            </div>

            <div className="space-y-3">

              {/* Row 1 — Full Name + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" name="fullName" placeholder="Your name"
                      value={formData.fullName} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="email" name="email" placeholder="you@college.edu"
                      value={formData.email} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Row 2 — College + Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>College</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" name="college" placeholder="College name"
                      value={formData.college} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <div className="relative">
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full appearance-none border border-slate-200 bg-slate-50 text-slate-700 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
                    >
                      <option value="student">Student</option>
                      <option value="college_admin">College Admin</option>
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type={showPassword ? "text" : "password"} name="password" placeholder="Create a strong password"
                    value={formData.password} onChange={handleChange}
                    onFocus={() => setIsTypingPassword(true)}
                    onBlur={() => setTimeout(() => setIsTypingPassword(false), 200)}
                    className={inputCls + " pr-10"}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                    {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>

                {isTypingPassword && formData.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5"
                  >
                    {[
                      { rule: passwordRules.length,    label: "8+ characters" },
                      { rule: passwordRules.uppercase, label: "Uppercase letter" },
                      { rule: passwordRules.number,    label: "One number" },
                      { rule: passwordRules.special,   label: "Special char" },
                    ].map(({ rule, label }) => (
                      <div key={label} className={`flex items-center gap-1 text-[11px] ${rule ? "text-emerald-600" : "text-slate-400"}`}>
                        <CheckCircle2 size={9} className={rule ? "text-emerald-500" : "text-slate-300"} />
                        {label}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelCls}>Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm your password"
                    value={formData.confirmPassword} onChange={handleChange}
                    className={inputCls + " pr-10"}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                    {showConfirmPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <p className={`text-[11px] mt-1 ${passwordsMatch ? "text-emerald-600" : "text-red-500"}`}>
                    {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Register Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRegister}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #1e40af 100%)",
                  boxShadow: "0 4px 20px rgba(37, 99, 235, 0.35)",
                }}
              >
                Create Account
                <ArrowRight size={15} />
              </motion.button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-slate-400 text-xs">Already have an account?</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
            >
              Sign In Instead
            </button>

            <p className="text-center text-slate-400 text-xs mt-4">
              © 2026 CampusEventHub. All rights reserved.
            </p>
          </motion.div>
        </div>

        {/* ══════════════════════════════
            RIGHT — Gradient Illustrated Panel
        ══════════════════════════════ */}
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="hidden lg:flex w-[48%] relative overflow-hidden flex-col justify-between p-12"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)",
          }}
        >
          {/* Floating pill shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[
              { w: 130, h: 42, top: "8%",  left: "60%", rotate: 30,  opacity: 0.15 },
              { w: 90,  h: 30, top: "18%", left: "5%",  rotate: -40, opacity: 0.12 },
              { w: 150, h: 44, top: "35%", left: "55%", rotate: -25, opacity: 0.14 },
              { w: 100, h: 34, top: "50%", left: "10%", rotate: 20,  opacity: 0.16 },
              { w: 120, h: 38, top: "65%", left: "50%", rotate: 40,  opacity: 0.12 },
              { w: 80,  h: 26, top: "80%", left: "5%",  rotate: -30, opacity: 0.18 },
              { w: 60,  h: 22, top: "90%", left: "60%", rotate: 15,  opacity: 0.1  },
            ].map((p, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0], rotate: [p.rotate, p.rotate + 4, p.rotate] }}
                transition={{ duration: 4.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
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
            <div className="absolute top-[25%] left-[10%] w-52 h-52 rounded-full border-2 border-white/10" />
            <div className="absolute bottom-[15%] right-[5%] w-36 h-36 rounded-full border-2 border-white/10" />
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
          {/* Center */}
          <div className="relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              <h1 className="text-5xl font-bold text-white leading-tight">
                Your campus
                <br />life,
                <br />
                <span className="text-blue-100">amplified.</span>
              </h1>
              <p className="text-blue-100/80 text-base mt-4 leading-relaxed max-w-xs">
                Register once, participate everywhere. Access events from colleges across the region.
              </p>
            </motion.div>

            {/* Feature list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              {[
                { icon: Globe,        text: "Events from 50+ colleges" },
                { icon: Zap,          text: "Instant event registration" },
                { icon: Shield,       text: "Secure & role-based access" },
                { icon: CheckCircle2, text: "Track all your registrations" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <f.icon size={13} className="text-white" />
                  </div>
                  <span className="text-blue-100/90 text-sm">{f.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          
        </motion.div>

      </div>
    </div>
  );
}