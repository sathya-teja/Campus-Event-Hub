import { useNavigate } from "react-router-dom";
import { CalendarPlus, LayoutList, TrendingUp, Search } from "lucide-react";

export default function QuickActions({ setActiveTab }) {
  const navigate = useNavigate();

  const actions = [
    {
      label:   "Browse Events",
      desc:    "Explore all upcoming events",
      icon:    <Search size={20} />,
      gradient: "from-blue-500 to-blue-600",
      glow:    "rgba(37,99,235,0.25)",
      bg:      "hover:bg-blue-50/60",
      onClick: () => navigate("/events"),
    },
    {
      label:   "My Registrations",
      desc:    "View your registered events",
      icon:    <LayoutList size={20} />,
      gradient: "from-violet-500 to-violet-600",
      glow:    "rgba(124,58,237,0.25)",
      bg:      "hover:bg-violet-50/60",
      onClick: () => setActiveTab?.("myevents"),
    },
    {
      label:   "Ongoing Events",
      desc:    "See what's happening now",
      icon:    <TrendingUp size={20} />,
      gradient: "from-emerald-500 to-emerald-600",
      glow:    "rgba(5,150,105,0.25)",
      bg:      "hover:bg-emerald-50/60",
      onClick: () => navigate("/events?status=ongoing"),
    },
    {
      label:   "Upcoming Events",
      desc:    "Plan your participation",
      icon:    <CalendarPlus size={20} />,
      gradient: "from-amber-500 to-orange-500",
      glow:    "rgba(217,119,6,0.25)",
      bg:      "hover:bg-amber-50/60",
      onClick: () => navigate("/events?status=upcoming"),
    },
  ];

  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-white/90 shadow-sm overflow-hidden h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100/80 flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />
        <h3 className="font-bold text-gray-800 text-sm tracking-wide">Quick Actions</h3>
      </div>

      {/* Actions grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`qa-btn relative flex flex-col items-start gap-3 p-4 rounded-2xl border border-gray-100/80 ${action.bg} transition-all duration-200 text-left group overflow-hidden`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Subtle corner glow on hover */}
            <div
              className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: action.glow, filter: "blur(12px)" }}
            />

            {/* Icon */}
            <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
              {action.icon}
            </div>

            {/* Text */}
            <div className="relative">
              <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-gray-900">
                {action.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                {action.desc}
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes qa-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .qa-btn {
          animation: qa-in 0.35s cubic-bezier(.22,.68,0,1.1) both;
        }
      `}</style>
    </div>
  );
}