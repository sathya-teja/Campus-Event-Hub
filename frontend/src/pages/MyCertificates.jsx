import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getMyRegistrations, BASE_URL, getImageUrl } from "../services/api";
import {
  FiSearch, FiRefreshCw, FiDownload, FiExternalLink,
  FiCalendar, FiMapPin, FiLock, FiAward, FiCheckCircle,
  FiClock, FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";

/* ── helpers ─────────────────────────────────────────── */
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}
function fmtDateShort(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

const CAT_BADGE = {
  Tech:     "bg-sky-50 text-sky-600 border-sky-100",
  Workshop: "bg-amber-50 text-amber-600 border-amber-100",
  Cultural: "bg-rose-50 text-rose-600 border-rose-100",
  Sports:   "bg-violet-50 text-violet-600 border-violet-100",
};

/* ── download helper ─────────────────────────────────── */
async function triggerCertDownload(registrationId, eventTitle) {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${BASE_URL}/api/certificates/${registrationId}/download`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || "Download failed");
  }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `certificate_${(eventTitle || "event").replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════
   CERTIFICATE ROW
════════════════════════════════════════════════════════ */
function CertificateRow({ reg, index }) {
  const navigate     = useNavigate();
  const [busy, setBusy] = useState(false);
  const event        = reg.eventId;
  if (!event) return null;

  const canDownload  = reg.status === "approved" && reg.attended;
  const catBadge     = CAT_BADGE[event.category] || "bg-gray-50 text-gray-500 border-gray-100";

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!canDownload || busy) return;
    try {
      setBusy(true);
      await triggerCertDownload(reg._id, event.title);
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.035, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 rounded-2xl border transition-all duration-200
        ${canDownload
          ? "bg-white/80 border-white/80 hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-50/60 cursor-pointer backdrop-blur-sm"
          : "bg-white/50 border-white/60 backdrop-blur-sm opacity-80"
        }`}
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      onClick={() => canDownload && navigate(`/events/${event._id}`)}
    >
      {/* status stripe */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-colors ${
        canDownload ? "bg-emerald-400" : "bg-gray-200"
      }`} />

      {/* main row: thumbnail + content */}
      <div className="flex items-center gap-3 ml-1 flex-1 min-w-0">
        {/* thumbnail */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          {event.image ? (
            <img
              src={getImageUrl(event.image)}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FiAward size={18} className="text-gray-300" />
            </div>
          )}
          {!canDownload && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <FiLock size={11} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* content */}
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className={`text-sm font-semibold truncate leading-tight transition-colors ${
            canDownload
              ? "text-gray-800 group-hover:text-emerald-700"
              : "text-gray-500"
          }`}>
            {event.title}
          </h3>
          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catBadge}`}>
            {event.category}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <FiCalendar size={10} className="flex-shrink-0" />
            {fmtDate(event.startDate)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <FiMapPin size={10} className="flex-shrink-0" />
              <span className="truncate max-w-[130px]">{event.location}</span>
            </span>
          )}
          {canDownload && reg.attendedAt && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <FiCheckCircle size={10} className="flex-shrink-0" />
              Attended {fmtDateShort(reg.attendedAt)}
            </span>
          )}
          {!canDownload && (
            <span className={`flex items-center gap-1 text-xs font-medium ${
              reg.status !== "approved" ? "text-amber-500" : "text-gray-400"
            }`}>
              {reg.status !== "approved"
                ? <><FiClock size={10} /> Pending approval</>
                : <><FiLock size={10} /> Attend to unlock</>
              }
            </span>
          )}
        </div>
        </div>
      </div>{/* end main row */}

      {/* actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1 sm:ml-0">
        {canDownload ? (
          <>
            <button
              onClick={handleDownload}
              disabled={busy}
              title="Download certificate"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-100 transition-colors disabled:opacity-50"
            >
              {busy
                ? <span className="w-3 h-3 border border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                : <FiDownload size={12} />
              }
              <span className="hidden xs:inline sm:inline">{busy ? "Generating…" : "Download"}</span>
              <span className="xs:hidden sm:hidden">{busy ? "…" : "PDF"}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}`); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="View event"
            >
              <FiExternalLink size={13} />
            </button>
          </>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <FiLock size={12} className="text-gray-300" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function MyCertificates() {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterType,    setFilterType]    = useState("all");
  const [bulkBusy,      setBulkBusy]      = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getMyRegistrations();
      setRegistrations(data);
    } catch {
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* derived */
  const available = registrations.filter(r => r.status === "approved" && r.attended);
  const locked    = registrations.filter(r => !(r.status === "approved" && r.attended));
  const pending   = registrations.filter(r => r.status === "approved" && !r.attended);

  const displayed = registrations
    .filter(r => {
      if (filterType === "available") return r.status === "approved" && r.attended;
      if (filterType === "locked")    return !(r.status === "approved" && r.attended);
      return true;
    })
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.eventId?.title?.toLowerCase().includes(q) ||
        r.eventId?.location?.toLowerCase().includes(q) ||
        r.eventId?.category?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aOk = a.status === "approved" && a.attended ? 1 : 0;
      const bOk = b.status === "approved" && b.attended ? 1 : 0;
      return bOk - aOk;
    });

  /* bulk download */
  const handleBulkDownload = async () => {
    if (!available.length) return;
    setBulkBusy(true);
    let ok = 0;
    for (const reg of available) {
      try {
        await triggerCertDownload(reg._id, reg.eventId?.title);
        ok++;
        await new Promise(r => setTimeout(r, 500));
      } catch { /* skip */ }
    }
    setBulkBusy(false);
    toast.success(`Downloaded ${ok} certificate${ok !== 1 ? "s" : ""}!`);
  };

  /* ── loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-4">
        {/* stat bar skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white/70 border border-white/80 animate-pulse shadow-sm" />
          ))}
        </div>
        {/* row skeletons */}
        {[1,2,3,4,5].map(i => (
          <div key={i}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/80 border border-white/80 animate-pulse"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-100 rounded-lg w-2/3" />
              <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
            </div>
            <div className="w-20 h-7 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  /* ── empty ───────────────────────────────────────────── */
  if (registrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/80 border border-white/80 flex items-center justify-center mb-4 shadow-sm"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <FiAward size={26} className="text-gray-300" />
        </div>
        <p className="text-gray-700 font-semibold mb-1">No certificates yet</p>
        <p className="text-sm text-gray-400 mb-6 max-w-[240px] leading-relaxed">
          Register for events, get approved, and attend them to earn certificates.
        </p>
        <button
          onClick={() => navigate("/events")}
          className="px-5 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-colors"
        >
          Browse Events
        </button>
      </div>
    );
  }

  /* ── main ────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Certificates</h2>
          <p className="text-sm text-gray-500 mt-1">
            {available.length} available · {locked.length} locked
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={load}
            className="p-2 rounded-xl border border-white/80 bg-white/80 text-gray-400 hover:text-gray-600 hover:bg-white transition-colors shadow-sm"
            title="Refresh"
          >
            <FiRefreshCw size={14} />
          </button>
          {available.length > 1 && (
            <button
              onClick={handleBulkDownload}
              disabled={bulkBusy}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {bulkBusy
                ? <span className="w-3.5 h-3.5 border border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                : <FiDownload size={14} />
              }
              <span className="hidden sm:inline">Download All ({available.length})</span>
              <span className="sm:hidden">All ({available.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stat strip ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Certificates", value: available.length, icon: <FiAward size={15} />,        color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-100" },
          { label: "Attended",     value: registrations.filter(r => r.attended).length, icon: <FiCheckCircle size={15} />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Pending",      value: pending.length,   icon: <FiClock size={15} />,        color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-100"  },
        ].map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-2xl border ${s.bg} ${s.border} bg-white/60 backdrop-blur-sm`}
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
          >
            <span className={`flex-shrink-0 ${s.color}`}>{s.icon}</span>
            <div className="min-w-0">
              <p className={`text-base sm:text-lg font-bold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 font-medium truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-white/80 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-300 bg-white/80 backdrop-blur-sm transition-all"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          />
        </div>
        <div className="flex items-center bg-white/70 backdrop-blur-sm rounded-xl p-1 gap-0.5 border border-white/80 overflow-x-auto"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)", scrollbarWidth: "none" }}>
          {[
            { key: "all",       label: "All",       count: registrations.length },
            { key: "available", label: "Available", count: available.length     },
            { key: "locked",    label: "Locked",    count: locked.length        },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterType === key
                  ? "bg-white shadow-sm text-gray-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filterType === key ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-400"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section label ──────────────────────────────── */}
      {displayed.length > 0 && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
          {displayed.length} result{displayed.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── No results ─────────────────────────────────── */}
      {displayed.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <FiAlertCircle size={28} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">No results match your filters</p>
          <button
            onClick={() => { setSearch(""); setFilterType("all"); }}
            className="mt-3 text-xs text-blue-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── List ───────────────────────────────────────── */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayed.map((reg, i) => (
            <CertificateRow key={reg._id} reg={reg} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Info tip (no certs available) ──────────────── */}
      {available.length === 0 && registrations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white/70 border border-white/80 backdrop-blur-sm"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <FiAward size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-600">How to earn certificates — </span>
            Attend an approved event and show your QR code or 6-digit code to the organiser at the venue. Your certificate unlocks instantly after check-in.
          </p>
        </motion.div>
      )}

    </div>
  );
}