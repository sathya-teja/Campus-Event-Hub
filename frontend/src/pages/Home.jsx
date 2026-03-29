import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRight,
  Users,
  BarChart3,
  Sparkles,
  Calendar,
  MapPin,
  ChevronRight,
  TrendingUp,
  Star,
  Zap,
  Globe,
  Shield,
  Clock,
  Search,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getEvents, getImageUrl, getTotalRegistrations } from "../services/api";


/* ── Category styling ── */
const CAT_STYLES = {
  Tech:     { badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",   icon: "💻" },
  Cultural: { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500", icon: "🎭" },
  Sports:   { badge: "bg-green-100 text-green-700",   dot: "bg-green-500",  icon: "⚽" },
  Workshop: { badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-500",  icon: "🛠️" },
  Technical:{ badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",   icon: "💻" },
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(date) {
  const d = new Date(date);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function getStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "Ongoing";
  return "Past";
}

/* ══════════════════════════════════════════════
   MAIN HOME
══════════════════════════════════════════════ */
export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = !user || user.role === "student";

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, colleges: 0, categories: 0, students: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  /* ── Fetch live events ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setEventsLoading(true);
        const { data } = await getEvents();
        const { data: statsData } = await getTotalRegistrations();
        
        setEvents(data);
        const upcoming = data.filter((e) => new Date(e.startDate) > new Date()).length;
        const colleges = [...new Set(data.map((e) => e.createdBy?.college).filter(Boolean))].length;
        const categories = [...new Set(data.map((e) => e.category))].length;
        
        setStats({ 
          total: data.length, 
          upcoming, 
          colleges, 
          categories,
          students: statsData.totalStudents,
        });
      } catch {
        // Silently fail — show empty states
      } finally {
        setEventsLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ── Filter for featured section ── */
  const categories = ["All", ...new Set(events.map((e) => e.category))];
  const filteredEvents = events
    .filter((e) => {
      const status = getStatus(e.startDate, e.endDate);
      const isPastEvent = status === "Past";
      const matchCat = activeCategory === "All" || e.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase());
      return !isPastEvent && matchCat && matchSearch;
    })
    .slice(0, 6);

  const heroEvents = events.slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-slate-800 overflow-x-hidden">
      <Navbar />

      {/* ════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">

        {/* Animated mesh background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px]" />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-blue-400/40 rounded-full"
              style={{
                left: `${15 + i * 14}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 w-full"
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT — Copy */}
            <div>
              {/* Eyebrow badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-300 text-xs font-semibold tracking-wider uppercase">
                  Inter-College Event Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.0] tracking-tight text-white mb-6"
              >
                Discover
                <br />
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">
                    Campus
                  </span>
                </span>
                <br />
                Events
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-slate-400 text-lg leading-relaxed max-w-md mb-8"
              >
                One platform to explore, manage, and participate in hackathons, cultural fests, sports meets, and workshops across every campus.
              </motion.p>

              {/* Search bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative mb-6 max-w-md"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/events?q=${searchQuery}`)}
                  placeholder="Search events, colleges, topics..."
                  className="w-full pl-11 pr-32 py-3.5 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-sm text-gray-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                  onClick={() => navigate("/events")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                >
                  Search <ArrowRight className="w-3 h-3" />
                </button>
              </motion.div>

              {/* CTAs — only show Get Started to students/guests */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex flex-wrap items-center gap-3 mb-10"
              >
                {isStudent && (
                  <button
                    onClick={() => navigate("/register")}
                    className="px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  >
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => navigate("/events")}
                  className="px-7 py-3.5 rounded-xl border border-white/15 text-white/80 hover:bg-white/8 hover:text-white font-semibold transition-all"
                >
                  Browse Events
                </button>
              </motion.div>

              {/* Live stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-6"
              >
                {[
                  { value: stats.total || "50+", label: "Events" },
                  { value: stats.colleges || "10+", label: "Colleges" },
                  { value: stats.students || "0", label: "Students" },
                  { value: stats.upcoming || "20+", label: "Upcoming" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-2xl font-extrabold text-white">{stat.value}</span>
                    <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* RIGHT — Event cards preview */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative h-[480px]">
                {/* Glow */}
                <div className="absolute inset-0 bg-blue-600/10 rounded-3xl blur-2xl" />

                {/* Stacked preview cards */}
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
                    ))}
                  </div>
                ) : heroEvents.length > 0 ? (
                  <div className="space-y-4">
                    {heroEvents.map((event, i) => (
                      <HeroEventCard key={event._id} event={event} index={i} />
                    ))}
                  </div>
                ) : (
                  <FallbackHeroCard />
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-px h-8 bg-gradient-to-b from-slate-500 to-transparent"
          />
        </motion.div>
      </section>

      {/* ════════════════════════════════════════
          LIVE EVENTS SECTION
      ════════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-px bg-blue-600" />
                <span className="text-blue-600 text-xs font-bold tracking-widest uppercase">Live from Backend</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Upcoming Events
              </h2>
              <p className="text-gray-500 text-sm mt-1.5">Real-time events from colleges near you</p>
            </div>
            <button
              onClick={() => navigate("/events")}
              className="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition group"
            >
              View all events <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Category filter pills */}
          {!eventsLoading && events.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-600 hover:text-blue-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Events grid */}
          {eventsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse shadow-sm">
                  <div className="h-48 bg-gray-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, i) => (
                <LiveEventCard key={event._id} event={event} index={i} isStudent={isStudent} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🗓️</div>
              <p className="text-gray-700 font-bold text-lg">No events found</p>
              <p className="text-gray-400 text-sm mt-1 mb-5">Try a different category or check back later.</p>
              <button
                onClick={() => { setActiveCategory("All"); setSearchQuery(""); }}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Show more */}
          {events.length > 6 && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => navigate("/events")}
                className="px-8 py-3 rounded-xl bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-gray-600 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                Show all {events.length} events →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════
          STATS BANNER
      ════════════════════════════════════════ */}
      <section className="py-16 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: stats.total > 0 ? `${stats.total}+` : "50+", label: "Total Events", icon: <Calendar className="w-6 h-6" /> },
              { value: stats.colleges > 0 ? `${stats.colleges}+` : "10+", label: "Partner Colleges", icon: <Globe className="w-6 h-6" /> },
              { value: stats.students > 0 ? `${stats.students}+` : "0", label: "Registered Students", icon: <Users className="w-6 h-6" /> },

              { value: stats.upcoming > 0 ? `${stats.upcoming}` : "20+", label: "Upcoming Events", icon: <TrendingUp className="w-6 h-6" /> },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-1">
                  {stat.icon}
                </div>
                <span className="text-3xl sm:text-4xl font-extrabold">{stat.value}</span>
                <span className="text-blue-200 text-sm font-medium">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-8 h-px bg-blue-600" />
              <span className="text-blue-600 text-xs font-bold tracking-widest uppercase">Simple Process</span>
              <span className="w-8 h-px bg-blue-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              How CampusEventHub Works
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm">
              From discovery to participation — everything you need in three simple steps.
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connector line */}
            <div className="hidden md:block absolute top-14 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 z-0" />

            {[
              {
                step: "01",
                title: "Create Your Account",
                desc: "Sign up as a student or college admin. No credit card required — get started in under 60 seconds.",
                icon: <Users className="w-7 h-7" />,
                color: "bg-blue-50 text-blue-600 border-blue-100",
                cta: "Sign Up Free",
                action: () => navigate("/register"),
              },
              {
                step: "02",
                title: "Discover & Browse Events",
                desc: "Filter by category, college, or date. Find hackathons, workshops, cultural fests, and sports meets instantly.",
                icon: <Sparkles className="w-7 h-7" />,
                color: "bg-indigo-50 text-indigo-600 border-indigo-100",
                cta: "Explore Events",
                action: () => navigate("/events"),
              },
              {
                step: "03",
                title: "Register & Participate",
                desc: "One-click registration. Track approvals in real-time. Get notified on every update.",
                icon: <Zap className="w-7 h-7" />,
                color: "bg-cyan-50 text-cyan-600 border-cyan-100",
                cta: "View Demo",
                action: () => navigate("/events"),
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 z-10 group"
              >
                <div className="absolute -top-4 left-8 bg-blue-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md shadow-blue-600/30">
                  {step.step}
                </div>

                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 mt-3 ${step.color}`}>
                  {step.icon}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{step.desc}</p>

                <button
                  onClick={step.action}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group/link transition-colors"
                >
                  {step.cta} <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-8 h-px bg-blue-600" />
              <span className="text-blue-600 text-xs font-bold tracking-widest uppercase">Why Choose Us</span>
              <span className="w-8 h-px bg-blue-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Everything campus life needs
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              Built for students and organizers — with tools that actually make event management simple.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Inter-College Discovery",
                desc: "Find events across every campus on a single feed. Never miss what's happening nearby.",
                color: "text-blue-600 bg-blue-50",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Instant Registration",
                desc: "One-click registration with live confirmation. No forms, no friction, no waiting.",
                color: "text-amber-600 bg-amber-50",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Real-time Tracking",
                desc: "Track participation, approval status, and event updates from a live dashboard.",
                color: "text-green-600 bg-green-50",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Role-based Access",
                desc: "Students, college admins, and platform admins — each with the right permissions.",
                color: "text-purple-600 bg-purple-50",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Event Lifecycle",
                desc: "From creation to completion — track upcoming, ongoing, and past events with ease.",
                color: "text-cyan-600 bg-cyan-50",
              },
              {
                icon: <Star className="w-6 h-6" />,
                title: "Curated Experience",
                desc: "Featured events, category filters, and smart search to surface the best opportunities.",
                color: "text-rose-600 bg-rose-50",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-8 h-px bg-blue-600" />
              <span className="text-blue-600 text-xs font-bold tracking-widest uppercase">Student Voices</span>
              <span className="w-8 h-px bg-blue-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Loved by campus communities
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Ravi Kumar",
                role: "Student, NBKRIST",
                text: "Found the Hackathon 2026 through CampusEventHub. Registered in seconds and got my slot confirmed instantly. Game changer!",
                avatar: "RK",
                color: "bg-blue-600",
                stars: 5,
              },
              {
                name: "Priya Sharma",
                role: "Event Organizer, SVU",
                text: "Creating and managing our Cultural Fest was so smooth. The admin dashboard gives us full control over registrations and updates.",
                avatar: "PS",
                color: "bg-purple-600",
                stars: 5,
              },
              {
                name: "Aditya Reddy",
                role: "Student, JNTU",
                text: "I discovered three inter-college sports events I would have never known about otherwise. The category filters are spot on.",
                avatar: "AR",
                color: "bg-green-600",
                stars: 5,
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                  <div className={`w-10 h-10 rounded-full ${t.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white shadow-2xl shadow-blue-600/20 p-12 sm:p-16 text-center"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 mb-6 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Free to Join
            </div>

            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
              Ready to explore
              <br />campus opportunities?
            </h3>
            <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
              Join thousands of students on CampusEventHub — and never miss a hackathon, workshop, or cultural event again.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {isStudent && (
                <button
                  onClick={() => navigate("/register")}
                  className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold shadow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
                >
                  Join Now — It's Free <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => navigate("/events")}
                className="px-8 py-3.5 rounded-xl border border-white/25 text-white/90 hover:bg-white/10 font-semibold transition-all"
              >
                Browse Events {isStudent ? "First" : ""}
              </button>
            </div>

            {isStudent && (
              <p className="mt-6 text-blue-200/70 text-xs">
                No credit card required · Free for students · Join 1000+ members
              </p>
            )}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════
   HERO EVENT CARD (right side of hero)
══════════════════════════════════════════════ */
function HeroEventCard({ event, index }) {
  const cat = CAT_STYLES[event.category] || CAT_STYLES.Tech;
  const status = getStatus(event.startDate, event.endDate);
  const timeStr = formatTime(event.startDate);
  const imageUrl = event.image
    ? getImageUrl(event.image)
    : `https://placehold.co/600x300/1e3a8a/93c5fd?text=${encodeURIComponent(event.title)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
      className="group relative bg-white/8 backdrop-blur border border-white/10 rounded-2xl overflow-hidden hover:bg-white/12 hover:border-white/20 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-blue-900">
          <img src={imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.badge}`}>
              {cat.icon} {event.category}
            </span>
            <span className={`text-[10px] font-semibold ${status === "Ongoing" ? "text-green-400" : "text-blue-300"}`}>
              ● {status}
            </span>
          </div>
          <h4 className="text-white font-semibold text-sm truncate mb-1">{event.title}</h4>
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {formatDate(event.startDate)}
            </span>
            {timeStr && (
              <span className="flex items-center gap-1 text-blue-300 font-semibold">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {timeStr}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
      </div>
    </motion.div>
  );
}

/* Fallback when no backend events */
function FallbackHeroCard() {
  return (
    <div className="space-y-4">
      {[
        { title: "Hackathon 2026", date: "Mar 12 • NBKRIST", time: "09:00 AM", cat: "Tech", color: "from-blue-900 to-blue-800", status: "Upcoming" },
        { title: "Cultural Fest", date: "Apr 05 • SVU", time: "10:00 AM", cat: "Cultural", color: "from-purple-900 to-purple-800", status: "Upcoming" },
        { title: "Sports Meet", date: "May 20 • JNTU", time: "08:00 AM", cat: "Sports", color: "from-green-900 to-green-800", status: "Upcoming" },
      ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.15 }}
          className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-4 flex items-center gap-4"

        >
          <div className="w-16 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
            {CAT_STYLES[item.cat]?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_STYLES[item.cat]?.badge}`}>
                {item.cat}
              </span>
              <span className="text-[10px] text-blue-300 font-semibold">● {item.status}</span>
            </div>
            <h4 className="text-white font-semibold text-sm">{item.title}</h4>
            <div className="flex items-center gap-3 text-slate-400 text-xs mt-0.5">
              <span>{item.date}</span>
              <span className="flex items-center gap-1 text-blue-300 font-semibold">
                <Clock className="w-3 h-3" /> {item.time}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
        </motion.div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   LIVE EVENT CARD (main section)
══════════════════════════════════════════════ */
function LiveEventCard({ event, index, isStudent }) {
  const navigate = useNavigate();
  const cat = CAT_STYLES[event.category] || CAT_STYLES.Tech;
  const status = getStatus(event.startDate, event.endDate);
  const timeStr = formatTime(event.startDate);
  const endTimeStr = formatTime(event.endDate);
  const isSameDay =
    new Date(event.startDate).toDateString() === new Date(event.endDate).toDateString();

  const imageUrl = event.image
    ? getImageUrl(event.image)
    : `https://placehold.co/800x500/e8edf7/2563eb?text=${encodeURIComponent(event.title)}`;

  const STATUS_STYLES = {
    Upcoming: "bg-blue-50 text-blue-700 border-blue-200",
    Ongoing:  "bg-green-50 text-green-700 border-green-200",
    Past:     "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      onClick={() => navigate(`/events/${event._id}`)}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-100 flex-shrink-0">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="absolute top-3 left-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.badge}`}>
            {cat.icon} {event.category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
            {status}
          </span>
        </div>

        {/* Time badge on image */}
        {timeStr && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {timeStr}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-2">{event.description}</p>
        )}

        <div className="mt-auto flex flex-col gap-1.5 mb-4">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Calendar className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span>
              {formatDate(event.startDate)}
              {!isSameDay && ` – ${formatDate(event.endDate)}`}
            </span>
          </div>
          {/* Time */}
          {timeStr && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>
                {timeStr}
                {isSameDay && endTimeStr && endTimeStr !== timeStr ? ` – ${endTimeStr}` : ""}
              </span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {event.createdBy?.college && (
            <span className="text-xs text-gray-400 font-medium truncate mr-2">
              {event.createdBy.college}
            </span>
          )}
          {isStudent ? (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
              className="flex-shrink-0 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              Register <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
              className="flex-shrink-0 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-blue-600 hover:text-blue-600 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}