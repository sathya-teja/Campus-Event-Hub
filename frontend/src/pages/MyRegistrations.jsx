import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FiGrid, FiList, FiX, FiCalendar, FiMapPin, FiClock, FiSearch } from "react-icons/fi";
import { QrCode, Download, Ticket, SlidersHorizontal, Check, AlertTriangle } from "lucide-react";
import QRCodeLib from "qrcode";

import {
  getMyRegistrations,
  cancelRegistration,
  getImageUrl,
  getRegistrationQR,
} from "../services/api";

/* ── helpers ── */
function fmtDate(date) {
  return new Date(date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}
function fmtTime(date) {
  const d = new Date(date);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
}

/* ── constants ── */
const STATUS_CONFIG = {
  approved: { label:"Approved", cls:"bg-emerald-50 text-emerald-700 border-emerald-200",   dot:"bg-emerald-500" },
  pending:  { label:"Pending",  cls:"bg-amber-50  text-amber-700  border-amber-200",   dot:"bg-amber-400"  },
  rejected: { label:"Rejected", cls:"bg-red-50    text-red-600    border-red-200",     dot:"bg-red-500"    },
};
const CAT_CONFIG = {
  Tech:     { cls:"bg-sky-50    text-sky-700",    dot:"bg-sky-500"    },
  Workshop: { cls:"bg-amber-50  text-amber-700",  dot:"bg-amber-500"  },
  Cultural: { cls:"bg-rose-50   text-rose-700",   dot:"bg-rose-500"   },
  Sports:   { cls:"bg-violet-50 text-violet-700", dot:"bg-violet-500" },
};
const STATUSES   = ["all","approved","pending","rejected"];
const CATEGORIES = [
  { label:"All",      value:"all"      },
  { label:"Tech",     value:"Tech"     },
  { label:"Workshop", value:"Workshop" },
  { label:"Cultural", value:"Cultural" },
  { label:"Sports",   value:"Sports"   },
];

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function MyRegistrations() {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [viewMode,      setViewMode]      = useState("grid");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [catFilter,     setCatFilter]     = useState("all");
  const [search,        setSearch]        = useState("");
  const [sheetOpen,     setSheetOpen]     = useState(false);
  const [confirmId,     setConfirmId]     = useState(null);
  const [cancelling,    setCancelling]    = useState(false);
  const [qrModal,       setQrModal]       = useState(null);
  const [qrDataUrl,     setQrDataUrl]     = useState(null);
  const [qrLoading,     setQrLoading]     = useState(false);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (catFilter !== "all" ? 1 : 0);

  /* fetch */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await getMyRegistrations();
        setRegistrations(data);
      } catch { toast.error("Failed to load registrations"); }
      finally  { setLoading(false); }
    })();
  }, []);

  /* cancel */
  const confirmCancel = async () => {
    try {
      setCancelling(true);
      await cancelRegistration(confirmId);
      toast.success("Registration cancelled");
      setRegistrations(prev => prev.filter(r => r._id !== confirmId));
      setConfirmId(null);
    } catch { toast.error("Failed to cancel"); }
    finally  { setCancelling(false); }
  };

  /* QR */
  const openQR = async (regId, eventTitle) => {
    setQrModal({ regId, eventTitle });
    setQrDataUrl(null); setQrLoading(true);
    try {
      const { data } = await getRegistrationQR(regId);
      const url = await QRCodeLib.toDataURL(data.qrPayload, {
        errorCorrectionLevel:"M", margin:2, width:280,
        color:{ dark:"#111827", light:"#ffffff" },
      });
      setQrDataUrl(url);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load QR");
      setQrModal(null);
    } finally { setQrLoading(false); }
  };

  const downloadQR = () => {
    if (!qrDataUrl || !qrModal) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr_${qrModal.eventTitle.replace(/\s+/g,"_")}.png`;
    a.click();
  };

  /* filter */
  const filtered = registrations.filter(reg => {
    const ev = reg.eventId;
    if (!ev) return false;
    if (statusFilter !== "all" && reg.status !== statusFilter) return false;
    if (catFilter    !== "all" && ev.category !== catFilter)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!ev.title?.toLowerCase().includes(q) && !ev.location?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ── Loading ── */
  if (loading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse shadow-sm h-[340px]">
          <div className="h-44 bg-gray-100" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Empty ── */
  if (registrations.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Ticket size={28} className="text-blue-400" />
      </div>
      <p className="text-gray-700 font-semibold mb-1">No registrations yet</p>
      <p className="text-gray-400 text-sm mb-6">Browse events and register to see them here</p>
      <button onClick={() => navigate("/events")}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
        Browse Events
      </button>
    </div>
  );

  /* ── Filter panel (shared between desktop bar + mobile sheet) ── */
  const FilterPanel = () => (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-sm capitalize font-medium transition ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCatFilter(c.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                catFilter === c.value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{c.label}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>

      {/* ══ CANCEL MODAL ══ */}
      <AnimatePresence>
        {confirmId && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !cancelling && setConfirmId(null)} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
              initial={{ scale:.95, y:10 }} animate={{ scale:1, y:0 }} exit={{ scale:.95, y:10 }}>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={22} className="text-red-500" />
                </div>
              </div>
              <h4 className="text-center text-lg font-semibold text-gray-900 mb-1">Cancel Registration?</h4>
              <p className="text-center text-sm text-gray-500 mb-6">
                This cannot be undone. You may not be able to re-register if spots are full.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmId(null)} disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                  Keep it
                </button>
                <button onClick={confirmCancel} disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {cancelling ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Yes, Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ QR MODAL ══ */}
      <AnimatePresence>
        {qrModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setQrModal(null); setQrDataUrl(null); }} />
            <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 z-10 flex flex-col items-center"
              initial={{ scale:.9, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:.9, y:16 }}>
              <button onClick={() => { setQrModal(null); setQrDataUrl(null); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                <FiX size={16} />
              </button>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <QrCode size={22} className="text-blue-600" />
              </div>
              <h4 className="text-base font-semibold text-gray-900 text-center mb-0.5">Your Event QR</h4>
              <p className="text-xs text-gray-400 text-center mb-5 px-2 line-clamp-2">{qrModal.eventTitle}</p>
              <div className="w-56 h-56 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center mb-5 overflow-hidden">
                {qrLoading ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <span className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs">Generating…</span>
                  </div>
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain p-1" />
                ) : null}
              </div>
              <p className="text-[11px] text-gray-400 text-center mb-5 leading-relaxed px-2">
                Show this to the event organiser at the venue entrance.
              </p>
              <button onClick={downloadQR} disabled={!qrDataUrl}
                className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition">
                <Download size={15} /> Download QR
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ HEADER ══ */}
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">My Registrations</h3>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 bg-white transition" />
          </div>

          {/* Mobile filter button */}
          <button onClick={() => setSheetOpen(true)}
            className="md:hidden relative flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:border-blue-400 transition">
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex-1 hidden md:block" />

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            {[
              { mode:"grid", icon:<FiGrid size={15}/> },
              { mode:"list", icon:<FiList size={15}/> },
            ].map(({ mode, icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
                  viewMode === mode ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}>
                {icon}
                <span className="hidden sm:inline capitalize">{mode}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ DESKTOP FILTER BAR ══ */}
      <div className="hidden md:flex items-center gap-6 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</span>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs capitalize font-medium transition ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{s}</button>
          ))}
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Category</span>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCatFilter(c.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                catFilter === c.value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* ══ MOBILE BOTTOM SHEET ══ */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 z-40 md:hidden"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSheetOpen(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl md:hidden"
              initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }} transition={{ type:"spring", damping:30, stiffness:300 }}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800">Filters</span>
                <button onClick={() => setSheetOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                  <FiX size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="px-5 py-5"><FilterPanel /></div>
              <div className="px-5 pb-6 pt-2">
                <button onClick={() => setSheetOpen(false)}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <Check size={16} /> Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ NO RESULTS ══ */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No registrations match your filters.
        </div>
      )}

      {/* ══ GRID VIEW ══ */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((reg, i) => {
            const ev = reg.eventId;
            if (!ev) return null;
            const status = STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending;
            const cat    = CAT_CONFIG[ev.category]   || { cls:"bg-gray-100 text-gray-600", dot:"bg-gray-400" };
            const date   = ev.startDate ? fmtDate(ev.startDate) : null;
            const time   = ev.startDate ? fmtTime(ev.startDate) : null;
            return (
              <motion.div key={reg._id}
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.04, duration:.3, ease:[.22,1,.36,1] }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Image — fixed height, no content */}
                <div className="relative h-44 flex-shrink-0 cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/events/${ev._id}`)}>
                  <img
                    src={getImageUrl(ev.image)}
                    alt={ev.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  {/* Category */}
                  <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                    {ev.category}
                  </span>
                  {/* Status */}
                  <span className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                {/* Body — fixed layout, equal height across cards */}
                <div className="flex flex-col flex-1 p-4">
                  {/* Title — always 2 lines max, no content below it grows */}
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug mb-3 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => navigate(`/events/${ev._id}`)}>
                    {ev.title}
                  </h3>

                  {/* Meta — pushed to bottom of content area */}
                  <div className="mt-auto flex flex-col gap-1.5 mb-4">
                    {date && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FiCalendar size={11} className="text-blue-400 flex-shrink-0" />
                        {date}
                      </span>
                    )}
                    {time && (
                      <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                        <FiClock size={11} className="flex-shrink-0" />
                        {time}
                      </span>
                    )}
                    {ev.location && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FiMapPin size={11} className="text-blue-400 flex-shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions — always at bottom, consistent */}
                  <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
                    {reg.status === "approved" ? (
                      <>
                        <button onClick={() => openQR(reg._id, ev.title)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold border border-blue-200 transition">
                          <QrCode size={12} /> QR Code
                        </button>
                        <button onClick={() => navigate(`/ticket/${reg._id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200 transition">
                          <Ticket size={12} /> Ticket
                        </button>
                        <button onClick={() => setConfirmId(reg._id)}
                          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition flex-shrink-0"
                          title="Cancel registration">
                          <FiX size={11} /> Cancel
                        </button>
                      </>
                    ) : reg.status === "pending" ? (
                      <>
                        <span className="flex-1 text-xs text-amber-600 font-medium">Awaiting approval</span>
                        <button onClick={() => setConfirmId(reg._id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition">
                          <FiX size={11} /> Cancel
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Registration rejected</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══ LIST VIEW ══ */}
      {viewMode === "list" && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((reg, i) => {
            const ev = reg.eventId;
            if (!ev) return null;
            const status  = STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending;
            const cat     = CAT_CONFIG[ev.category]   || { cls:"bg-gray-100 text-gray-600", dot:"bg-gray-400" };
            const date    = ev.startDate ? fmtDate(ev.startDate) : null;
            const time    = ev.startDate ? fmtTime(ev.startDate) : null;
            return (
              <motion.div key={reg._id}
                initial={{ opacity:0, x:-12 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.03, duration:.25 }}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-blue-100 transition-all duration-200"
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <div className="relative w-24 sm:w-32 flex-shrink-0 cursor-pointer"
                    onClick={() => navigate(`/events/${ev._id}`)}>
                    <img src={getImageUrl(ev.image)} alt={ev.title}
                      className="w-full h-full object-cover" style={{ minHeight:80 }} />
                    <div className="absolute inset-0 bg-black/10" />
                  </div>

                  {/* Content */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 sm:p-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/events/${ev._id}`)}>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cat.cls}`}>
                          <span className={`w-1 h-1 rounded-full ${cat.dot}`} />
                          {ev.category}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${status.cls}`}>
                          {status.label}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900 truncate hover:text-blue-600 transition-colors mb-1">
                        {ev.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {date && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FiCalendar size={10} className="text-blue-400" />{date}
                          </span>
                        )}
                        {time && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <FiClock size={10} />{time}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FiMapPin size={10} className="text-blue-400" />
                            <span className="truncate max-w-[120px]">{ev.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      {reg.status === "approved" && (
                        <>
                          <button onClick={() => openQR(reg._id, ev.title)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                            <QrCode size={11} /> QR
                          </button>
                          <button onClick={() => navigate(`/ticket/${reg._id}`)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                            <Ticket size={11} /> Ticket
                          </button>
                        </>
                      )}
                      {reg.status !== "rejected" && (
                        <button onClick={() => setConfirmId(reg._id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition">
                          <FiX size={11} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}