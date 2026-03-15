import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

const floaters = [
  { size: 320, top: "-80px", right: "-80px", color: "linear-gradient(135deg,#dbeafe,#eff6ff)", dur: 4 },
  { size: 200, bottom: "-60px", left: "-40px", color: "linear-gradient(135deg,#bfdbfe,#dbeafe)", dur: 5, delay: 1 },
  { size: 100, top: "30%", left: "8%",  color: "#eff6ff", dur: 6, delay: 0 },
  { size: 60,  top: "15%", right: "20%", color: "#dbeafe", dur: 5, delay: 0.5 },
  { size: 40,  bottom: "20%", right: "12%", color: "#bfdbfe", dur: 4.5, delay: 1 },
  { size: 14,  top: "22%", left: "25%", color: "#93c5fd", dur: 3.5, delay: 0 },
  { size: 10,  bottom: "28%", left: "18%", color: "#60a5fa", dur: 4, delay: 0.8 },
  { size: 8,   top: "60%", right: "25%", color: "#93c5fd", dur: 3.8, delay: 0.3 },
];

export default function AppLoader() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">

      {/* Floating background orbs */}
      {floaters.map((f, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: f.dur, repeat: Infinity, ease: "easeInOut", delay: f.delay || 0 }}
          style={{
            position: "absolute",
            width: f.size, height: f.size,
            borderRadius: "50%",
            background: f.color,
            top: f.top, bottom: f.bottom,
            left: f.left, right: f.right,
          }}
        />
      ))}

      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-5"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-blue-600 flex items-center justify-center">
            <Calendar size={20} className="text-white" />
          </div>
          <span className="text-blue-800 font-bold text-xl tracking-tight">CampusEventHub</span>
        </div>

        {/* Spinner */}
        <div className="w-9 h-9 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin" />

        {/* Dots */}
        <div className="flex gap-1.5">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              animate={{ scale: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay, ease: "easeInOut" }}
              className="w-1.5 h-1.5 rounded-full bg-blue-500"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}