import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById, getImageUrl, registerForEvent, getMyRegistrations } from "../services/api";
import DiscussionSection from "../components/DiscussionSection";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiTag,
  FiUser,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiShare2,
  FiCheckCircle,
  FiExternalLink,
  FiUsers,
  FiEdit,
  FiSettings,
  FiMaximize,
  FiLink,
  FiMessageSquare,
  FiInfo,
  FiStar,
} from "react-icons/fi";


const CATEGORY_STYLES = {
  Tech:      { badge: "bg-blue-100 text-blue-700 border-blue-200",      bar: "bg-blue-600",   icon: "💻" },
  Cultural:  { badge: "bg-purple-100 text-purple-700 border-purple-200", bar: "bg-purple-600", icon: "🎭" },
  Sports:    { badge: "bg-green-100 text-green-700 border-green-200",    bar: "bg-green-600",  icon: "⚽" },
  Workshop:  { badge: "bg-amber-100 text-amber-700 border-amber-200",    bar: "bg-amber-500",  icon: "🛠️" },
  Technical: { badge: "bg-blue-100 text-blue-700 border-blue-200",       bar: "bg-blue-600",   icon: "💻" },
};

const STATUS_STYLES = {
  Upcoming: { cls: "bg-blue-50 text-blue-700 border-blue-200",    dot: "bg-blue-500",  label: "Upcoming" },
  Ongoing:  { cls: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500", label: "Ongoing"  },
  Past:     { cls: "bg-gray-100 text-gray-500 border-gray-200",   dot: "bg-gray-400",  label: "Past"     },
};

function getStatus(startDate, endDate) {
  const now   = new Date();
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Past";
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateShort(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(date) {
  const d = new Date(date);
  // Only return a time string if it's not midnight (i.e. time was explicitly set)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function daysUntil(startDate) {
  const now   = new Date();
  const start = new Date(startDate);
  const diff  = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return null;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function EventDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const isStudent    = !user || user.role === "student";

  const [event,          setEvent]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [registered,     setRegistered]     = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [registerLoading,setRegisterLoading]= useState(false);
  const [copied,         setCopied]         = useState(false);

  // Tab state — overview | discussion | reviews
  const [activeTab, setActiveTab] = useState("overview");

  // New state variables for improvements
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getEventById(id);
      setEvent(data);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "This event doesn't exist or has been removed."
          : "Failed to load event. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if student is already registered for this event
  const checkRegistration = async () => {
    if (!user || user.role !== "student") return;
    try {
      const { data } = await getMyRegistrations();
      const match = data.find((r) => r.eventId?._id === id || r.eventId === id);
      if (match && match.status !== 'rejected') {
        // Only set registered if status is NOT rejected
        setRegistered(true);
        setRegistrationId(match._id);
        setRegistrationStatus(match); // Store full registration object
      } else if (match && match.status === 'rejected') {
        // If rejected, don't mark as registered
        setRegistered(false);
        setRegistrationStatus(match); // Still store for showing rejection message
      }
    } catch {
      // silent — not critical
    }
  };

  useEffect(() => {
    fetchEvent();
    checkRegistration();
    window.scrollTo(0, 0);
  }, [id]);

  // Countdown timer for upcoming events
  useEffect(() => {
    if (!event || getStatus(event.startDate, event.endDate) !== 'Upcoming') return;
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const start = new Date(event.startDate);
      const diff = start - now;
      
      if (diff <= 0) return null;
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return { days, hours, minutes };
    };
    
    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [event]);

  // Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Add to Google Calendar
  const addToCalendar = () => {
    if (!event) return;

    const fmt = (d) => new Date(d).toISOString().replace(/-|:|\.\d{3}/g, '');
    const start = fmt(event.startDate);
    const end   = fmt(event.endDate);

    const params = new URLSearchParams({
      action:   "TEMPLATE",
      text:     event.title,
      dates:    `${start}/${end}`,
      details:  event.description || "",
      location: event.location    || "",
    });

    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank"
    );
  };

  // Share options for dropdown menu
  const shareOptions = [
    {
      name: 'Copy Link',
      icon: <FiLink size={16} className="text-gray-600" />,
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
        setShowShareMenu(false);
      }
    },
    {
      name: 'WhatsApp',
      icon: <FiMessageSquare size={16} className="text-green-600" />,
      action: () => {
        const text = `Check out this event: ${event.title}\n${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        setShowShareMenu(false);
      }
    },
    {
      name: 'Twitter',
      icon: <FiShare2 size={16} className="text-blue-500" />,
      action: () => {
        const text = `Excited about ${event.title}! 🎉`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
        setShowShareMenu(false);
      }
    },
    {
      name: 'LinkedIn',
      icon: <FiExternalLink size={16} className="text-blue-700" />,
      action: () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
        setShowShareMenu(false);
      }
    }
  ];

  const handleRegister = async () => {
    if (!user) {
      toast.error("Please login to register for this event");
      return;
    }
    try {
      setRegisterLoading(true);
      const { data } = await registerForEvent(id);
      setRegistered(true);
      setRegistrationId(data._id);
      toast.success("Registered successfully! Awaiting admin approval.");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setRegisterLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <div className="rounded-3xl overflow-hidden mb-8 animate-pulse">
              <div className="h-72 sm:h-96 bg-gray-200" />
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
              <FiAlertCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate("/events")}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                ← Back to Events
              </button>
              <button
                onClick={fetchEvent}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <FiRefreshCw size={13} /> Retry
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!event) return null;

  /* ── Derived values ── */
  const cat         = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.Tech;
  const status      = getStatus(event.startDate, event.endDate);
  const statusStyle = STATUS_STYLES[status];
  const countdown   = daysUntil(event.startDate);

  const imageUrl = event.image
    ? getImageUrl(event.image)
    : `https://placehold.co/1200x600/e8edf7/2563eb?text=${encodeURIComponent(event.title)}`;

  const startFmt      = formatDate(event.startDate);
  const endFmt        = formatDate(event.endDate);
  const startTimeStr  = formatTime(event.startDate);
  const endTimeStr    = formatTime(event.endDate);
  const isSameDay     = formatDateShort(event.startDate) === formatDateShort(event.endDate);

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 pt-16">

        {/* ── Hero Banner ── */}
        <div className="relative">
          <div 
            className="relative h-72 sm:h-[420px] w-full overflow-hidden bg-gray-200 cursor-pointer group"
            onClick={() => event.image && setShowImageModal(true)}
          >
            <img
              src={imageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            {event.image && (
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiMaximize size={12} />
                View Full Size
              </div>
            )}
          </div>

          {/* Overlay content */}
          <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-8 max-w-5xl mx-auto w-full left-1/2 -translate-x-1/2">

            {/* Top bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm px-3.5 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FiArrowLeft size={15} /> Back
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm px-3.5 py-2 rounded-lg text-sm font-medium transition-all"
              >
                {copied
                  ? <><FiCheckCircle size={15} className="text-green-400" /> Copied!</>
                  : <><FiShare2 size={15} /> Share</>
                }
              </button>
            </div>

            {/* Bottom info */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${cat.badge}`}>
                  {cat.icon} {event.category}
                </span>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${statusStyle.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                  {statusStyle.label}
                </span>
                {countdown && status === "Upcoming" && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                    ⏳ {countdown}
                  </span>
                )}
                {/* Time badge on hero */}
                {startTimeStr && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-black/40 text-white border border-white/20 backdrop-blur-sm flex items-center gap-1.5">
                    <FiClock size={11} /> {startTimeStr}
                    {isSameDay && endTimeStr && endTimeStr !== startTimeStr ? ` – ${endTimeStr}` : ""}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-lg max-w-2xl">
                {event.title}
              </h1>

              {event.createdBy?.college && (
                <p className="text-white/70 text-sm mt-2 flex items-center gap-1.5">
                  <FiUser size={13} /> Organized by {event.createdBy.college}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* ── Left: Main content ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── Tab Bar ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {[
                    { key: "overview",   label: "Overview",   icon: <FiInfo size={15} /> },
                    { key: "discussion", label: "Discussion",  icon: <FiMessageSquare size={15} /> },
                    { key: "reviews",    label: "Reviews",     icon: <FiStar size={15} /> },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                        activeTab === tab.key
                          ? "border-blue-600 text-blue-600 bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className={activeTab === tab.key ? "text-blue-600" : "text-gray-400"}>
                        {tab.icon}
                      </span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ══════════════════════════════
                  OVERVIEW TAB — all existing content
              ══════════════════════════════ */}
              {activeTab === "overview" && (
                <>
                  {/* About */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7"
                  >
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" />
                      About This Event
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {event.description}
                    </p>
                  </motion.div>

                  {/* Date & Time */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7"
                  >
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" />
                      Date & Time
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Start */}
                      <div className="flex-1 flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                          <FiCalendar size={17} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                            {isSameDay ? "Event Date" : "Start Date"}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">{startFmt}</p>
                          {startTimeStr && (
                            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
                              <FiClock size={11} /> {startTimeStr}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* End (multi-day) */}
                      {!isSameDay && (
                        <div className="flex-1 flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-10 h-10 rounded-xl bg-gray-600 text-white flex items-center justify-center flex-shrink-0">
                            <FiClock size={17} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</p>
                            <p className="text-sm font-semibold text-gray-900">{endFmt}</p>
                            {endTimeStr && (
                              <p className="text-xs text-gray-500 font-semibold mt-1 flex items-center gap-1">
                                <FiClock size={11} /> {endTimeStr}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Same-day end time block */}
                      {isSameDay && endTimeStr && endTimeStr !== startTimeStr && (
                        <div className="flex-1 flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-10 h-10 rounded-xl bg-gray-500 text-white flex items-center justify-center flex-shrink-0">
                            <FiClock size={17} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Time</p>
                            <p className="text-sm font-semibold text-gray-900">{endTimeStr}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Same day</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Location */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7"
                  >
                    <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" />
                      Location
                    </h2>
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FiMapPin size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{event.location}</p>
                        {event.createdBy?.college && (
                          <p className="text-xs text-gray-500 mt-0.5">{event.createdBy.college}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Organizer */}
                  {(event.createdBy?.name || event.createdBy?.college) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7"
                    >
                      <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" />
                        Organizer
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {(event.createdBy?.college || event.createdBy?.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {event.createdBy?.college || event.createdBy?.name}
                          </p>
                          {event.createdBy?.name && event.createdBy?.college && (
                            <p className="text-xs text-gray-500 mt-0.5">{event.createdBy.name}</p>
                          )}
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            <FiCheckCircle size={10} /> Verified Organizer
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {/* ══════════════════════════════
                  DISCUSSION TAB
              ══════════════════════════════ */}
              {activeTab === "discussion" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DiscussionSection
                    eventId={event._id}
                    eventAdminId={event.createdBy?._id}
                  />
                </motion.div>
              )}

              {/* ══════════════════════════════
                  REVIEWS TAB — placeholder for teammate
              ══════════════════════════════ */}
              {activeTab === "reviews" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⭐</span>
                  </div>
                  <p className="text-gray-700 font-semibold text-base mb-1">Reviews coming soon</p>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto">
                    Attended students will be able to rate and review this event after it ends.
                  </p>
                </motion.div>
              )}

            </div>

            {/* ── Right: Sidebar ── */}
            <div className="space-y-4">

              {/* Owner Admin Panel (if logged-in user is the creator) */}
              {user && event && event.createdBy?._id === user._id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                      <FiUser size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-900">You're the organizer</p>
                      <p className="text-[10px] text-purple-600">Manage this event</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => navigate(`/dashboard/collegeadmin`)}
                      className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <FiEdit size={14} />
                      Manage Registrations
                    </button>
                  </div>
                  
                  {/* Quick stats */}
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div className="text-xl font-bold text-purple-900">{event.currentParticipants || 0}</div>
                        <div className="text-[10px] text-purple-600 font-medium">Registered</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-purple-900">
                          {event.maxParticipants - (event.currentParticipants || 0)}
                        </div>
                        <div className="text-[10px] text-purple-600 font-medium">Available</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Capacity Progress Bar */}
              {status !== "Past" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FiUsers size={16} /> Registration Status
                  </h3>
                  
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                      <span>{event.currentParticipants || 0} registered</span>
                      <span>{event.maxParticipants - (event.currentParticipants || 0)} spots left</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          ((event.currentParticipants || 0) / event.maxParticipants) > 0.8 
                            ? 'bg-red-500' 
                            : ((event.currentParticipants || 0) / event.maxParticipants) > 0.5 
                            ? 'bg-amber-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${((event.currentParticipants || 0) / event.maxParticipants) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Urgency badges */}
                  {(event.currentParticipants || 0) >= event.maxParticipants && (
                    <div className="text-center py-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-red-600 text-sm font-bold">🔴 Event Fully Booked</p>
                    </div>
                  )}
                  
                  {(event.currentParticipants || 0) >= event.maxParticipants * 0.8 && 
                   (event.currentParticipants || 0) < event.maxParticipants && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <FiAlertCircle size={14} />
                      Almost Full - Only {event.maxParticipants - (event.currentParticipants || 0)} spots left!
                    </div>
                  )}
                </motion.div>
              )}

              {/* Countdown Timer for Upcoming Events */}
              {status === 'Upcoming' && timeLeft && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6"
                >
                  <h3 className="text-sm font-bold text-blue-900 mb-4 text-center">
                    Event Starts In
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{timeLeft.days}</div>
                      <div className="text-xs text-gray-500 font-medium">Days</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{timeLeft.hours}</div>
                      <div className="text-xs text-gray-500 font-medium">Hours</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{timeLeft.minutes}</div>
                      <div className="text-xs text-gray-500 font-medium">Mins</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Registration Status Details (if student is registered) */}
              {registered && registrationStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <FiCheckCircle size={16} className="text-green-500" />
                      Your Registration
                    </h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      registrationStatus.status === 'approved' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {registrationStatus.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registered on</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(registrationStatus.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    {registrationStatus.status === 'pending' && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <FiClock size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                          Awaiting admin approval. You'll be notified once reviewed.
                        </p>
                      </div>
                    )}
                    
                    {registrationStatus.status === 'approved' && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                        <FiCheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-green-700 font-medium">
                          You're all set! See you at the event.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Rejection Status (if registration was rejected) */}
              {!registered && registrationStatus && registrationStatus.status === 'rejected' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="bg-white rounded-2xl border border-red-200 shadow-sm p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <FiAlertCircle size={16} className="text-red-500" />
                      Previous Registration
                    </h3>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                      ❌ Rejected
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registered on</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(registrationStatus.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                      <FiAlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700 font-medium">
                        Your registration was not approved. Contact the organizer for details.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Registration CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                {/* Status indicator */}
                <div className={`flex items-center gap-2 mb-4 text-xs font-semibold px-3 py-2 rounded-lg border ${statusStyle.cls}`}>
                  <span className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`} />
                  {status === "Upcoming" && countdown
                    ? `${countdown} — Registration Open`
                    : statusStyle.label}
                </div>

                {/* Event summary rows */}
                <div className="space-y-2.5 mb-5">
                  {/* Start date + time */}
                  <InfoRow
                    icon={<FiCalendar size={13} />}
                    label="Start"
                    value={formatDateShort(event.startDate)}
                    sub={startTimeStr}
                  />
                  {/* End date (multi-day) */}
                  {!isSameDay && (
                    <InfoRow
                      icon={<FiClock size={13} />}
                      label="End"
                      value={formatDateShort(event.endDate)}
                      sub={endTimeStr}
                    />
                  )}
                  {/* End time (same day) */}
                  {isSameDay && endTimeStr && endTimeStr !== startTimeStr && (
                    <InfoRow
                      icon={<FiClock size={13} />}
                      label="End Time"
                      value={endTimeStr}
                    />
                  )}
                  <InfoRow icon={<FiMapPin size={13} />} label="Venue"    value={event.location}  />
                  <InfoRow icon={<FiTag size={13} />}    label="Category" value={event.category}   />
                  {event.createdBy?.college && (
                    <InfoRow icon={<FiUser size={13} />} label="College"  value={event.createdBy.college} />
                  )}
                </div>

                <div className="h-px bg-gray-100 mb-5" />

                {/* ── Register / Status / Admin notice ── */}
                {status === "Past" ? (
                  <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-400 text-sm font-semibold">This event has ended</p>
                  </div>

                ) : !isStudent ? (
                  /* Admin / college admin sees a neutral notice instead of a register button */
                  <div className="flex items-start gap-3 py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">ℹ️</span>
                    <p className="text-amber-700 text-xs font-medium leading-relaxed">
                      Registration is for students only. You can manage this event from your dashboard.
                    </p>
                  </div>

                ) : registered ? (
                  <div className="flex flex-col items-center gap-2 py-4 bg-green-50 rounded-xl border border-green-100">
                    <FiCheckCircle size={24} className="text-green-600" />
                    <p className="text-green-700 font-bold text-sm">You're registered!</p>
                    <p className="text-green-600/70 text-xs">We'll keep you updated</p>
                  </div>

                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={registerLoading}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {registerLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register for this Event"
                    )}
                  </button>
                )}

                {/* Enhanced Share Menu */}
                <div className="relative mt-3">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-blue-600 hover:text-blue-600 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <FiShare2 size={14} /> Share Event
                  </button>
                  
                  {showShareMenu && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setShowShareMenu(false)}
                      />
                      
                      {/* Dropdown menu */}
                      <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20">
                        {shareOptions.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={option.action}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                          >
                            <span>{option.icon}</span>
                            <span className="text-sm font-medium text-gray-700">{option.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Add to Calendar */}
                <button
                  onClick={addToCalendar}
                  className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-600 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <FiCalendar size={14} /> Add to Google Calendar
                </button>
              </motion.div>

              {/* Browse More Events - Separate Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <button
                  onClick={() => navigate("/events")}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                  <FiExternalLink size={13} /> Browse More Events
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Header on Scroll */}
      {isScrolled && (
        <div className="fixed top-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40 py-3 px-4 shadow-sm transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FiArrowLeft size={20} />
              </button>
              <h1 className="font-bold text-gray-900 truncate max-w-md text-sm sm:text-base">
                {event.title}
              </h1>
              <span className={`hidden sm:inline-flex text-xs font-bold px-2.5 py-1 rounded-full border ${cat.badge}`}>
                {cat.icon} {event.category}
              </span>
            </div>
            {isStudent && !registered && status !== 'Past' && (
              <button 
                onClick={handleRegister}
                disabled={registerLoading || (event.currentParticipants || 0) >= event.maxParticipants}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed"
              >
                {registerLoading ? 'Registering...' : 'Register'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Fullscreen Modal */}
      {showImageModal && event.image && (
        <div 
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <img 
            src={getImageUrl(event.image)} 
            alt={event.title}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors"
            onClick={() => setShowImageModal(false)}
          >
            ×
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
            Click anywhere to close
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function InfoRow({ icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-blue-600 flex-shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
        <span className="text-sm font-semibold text-gray-800 truncate block">{value}</span>
        {sub && (
          <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
            <FiClock size={10} /> {sub}
          </span>
        )}
      </div>
    </div>
  );
}