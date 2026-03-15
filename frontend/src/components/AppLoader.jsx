import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

const pills = [
  { w: 120, h: 40, top: "12%", left: "8%",  rotate: -35, opacity: 0.18, dur: 4   },
  { w: 80,  h: 28, top: "22%", left: "55%", rotate: 20,  opacity: 0.15, dur: 4.5 },
  { w: 160, h: 44, top: "38%", left: "2%",  rotate: -40, opacity: 0.12, dur: 5   },
  { w: 100, h: 34, top: "55%", left: "60%", rotate: 30,  opacity: 0.16, dur: 4.2 },
  { w: 140, h: 40, top: "68%", left: "15%", rotate: -25, opacity: 0.14, dur: 4.8 },
  { w: 90,  h: 30, top: "78%", left: "50%", rotate: 15,  opacity: 0.18, dur: 5.2 },
];

export default function AppLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)" }}
    >
      {/* Floating pills */}
      {pills.map((p, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -12, 0], rotate: [p.rotate, p.rotate + 5, p.rotate] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            width: p.w, height: p.h,
            top: p.top, left: p.left,
            borderRadius: 999,
            background: `rgba(255,255,255,${p.opacity})`,
          }}
        />
      ))}

      {/* Circles */}
      <div className="absolute top-[30%] right-[10%] w-32 h-32 rounded-full border-2 border-white/10" />
      <div className="absolute bottom-[20%] left-[5%] w-20 h-20 rounded-full border-2 border-white/10" />

      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Calendar size={22} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">CampusEventHub</span>
        </div>

        {/* Spinner */}
        <div className="w-12 h-12 rounded-full border-[3px] border-white/25 border-t-white animate-spin" />

        {/* Dots */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 0.2, 0.4].map((delay, i) => (
              <motion.div
                key={i}
                animate={{ scale: [0, 1, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-white/80"
              />
            ))}
          </div>
          <p className="text-white/70 text-sm">Loading your experience...</p>
        </div>
      </motion.div>
    </div>
  );
}