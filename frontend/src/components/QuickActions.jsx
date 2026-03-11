import { useNavigate } from "react-router-dom";
import { CalendarPlus, LayoutList, TrendingUp, Search } from "lucide-react";

export default function QuickActions({ setActiveTab }) {
  const navigate = useNavigate();

  const actions = [
    {
      label:    "Browse Events",
      desc:     "Explore all upcoming events",
      icon:     <Search size={18} />,
      color:    "bg-blue-50 text-blue-600",
      border:   "hover:border-blue-200",
      onClick:  () => navigate("/events"),
    },
    {
      label:    "My Registrations",
      desc:     "View your registered events",
      icon:     <LayoutList size={18} />,
      color:    "bg-violet-50 text-violet-600",
      border:   "hover:border-violet-200",
      onClick:  () => setActiveTab?.("myevents"),
    },
    {
      label:    "Ongoing Events",
      desc:     "See what's happening now",
      icon:     <TrendingUp size={18} />,
      color:    "bg-green-50 text-green-600",
      border:   "hover:border-green-200",
      onClick:  () => navigate("/events?status=ongoing"),
    },
    {
      label:    "Upcoming Events",
      desc:     "Plan your participation",
      icon:     <CalendarPlus size={18} />,
      color:    "bg-amber-50 text-amber-600",
      border:   "hover:border-amber-200",
      onClick:  () => navigate("/events?status=upcoming"),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <h3 className="font-semibold text-gray-800">Quick Actions</h3>
      </div>

      {/* Actions grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-100 ${action.border} hover:shadow-md transition-all duration-200 text-left group`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform duration-200`}>
              {action.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                {action.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                {action.desc}
              </p>
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}