import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCodeLib from "qrcode";
import { getRegistrationTicket, getImageUrl } from "../services/api";

/* ── tiny helpers ── */
function fmt(date, opts) {
  return new Date(date).toLocaleDateString("en-IN", opts);
}
function fmtTime(date) {
  const d = new Date(date);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
const CATEGORY_COLOR = {
  Tech:     { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  Cultural: { bg: "#fdf4ff", text: "#7e22ce", dot: "#a855f7" },
  Sports:   { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  Workshop: { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
};

export default function TicketPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();

  const [ticket,    setTicket]    = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState(null);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await getRegistrationTicket(id);
      setTicket(data);
      if (data.attendanceCode) setAttendanceCode(data.attendanceCode);
      // Render QR
      const url = await QRCodeLib.toDataURL(data.qrPayload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 280,
        color: { dark: "#111827", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Download QR as PNG
  const downloadQR = () => {
    if (!qrDataUrl || !ticket) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ticket_${ticket.event.title.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.skeleton, height: 200, borderRadius: 16, marginBottom: 24 }} />
          <div style={{ ...styles.skeleton, height: 20, width: "60%", marginBottom: 12 }} />
          <div style={{ ...styles.skeleton, height: 14, width: "80%", marginBottom: 8 }} />
          <div style={{ ...styles.skeleton, height: 14, width: "50%", marginBottom: 32 }} />
          <div style={{ ...styles.skeleton, height: 240, width: 240, borderRadius: 16, margin: "0 auto 24px" }} />
          <div style={{ ...styles.skeleton, height: 44, borderRadius: 12 }} />
        </div>
        <style>{skeletonAnim}</style>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center", padding: "48px 24px" }}>
          <div style={styles.errorIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Ticket unavailable</p>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 28, maxWidth: 260, margin: "0 auto 28px" }}>{error}</p>
          <button style={styles.btnPrimary} onClick={() => navigate("/dashboard/student", { state: { activeTab: "myevents" } })}>← My Registrations</button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const { event, student, attended, attendedAt } = ticket;
  const catColor = CATEGORY_COLOR[event.category] || CATEGORY_COLOR.Tech;
  const startFmt = fmt(event.startDate, { day: "numeric", month: "short", year: "numeric" });
  const startTime = fmtTime(event.startDate);

  return (
    <div style={styles.page}>
      <style>{ticketStyles}</style>

      {/* Back button */}
      <button style={styles.backBtn} onClick={() => navigate("/dashboard/student", { state: { activeTab: "myevents" } })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        My Registrations
      </button>

      <div style={styles.card} className="ticket-card">

        {/* Event image banner */}
        {event.image && (
          <div style={styles.banner}>
            <img src={getImageUrl(event.image)} alt={event.title} style={styles.bannerImg} />
            <div style={styles.bannerOverlay} />
            {/* Category badge */}
            <span style={{ ...styles.catBadge, background: catColor.bg, color: catColor.text }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: catColor.dot, display: "inline-block" }} />
              {event.category}
            </span>
          </div>
        )}

        {/* Event info */}
        <div style={styles.infoSection}>
          <h1 style={styles.eventTitle}>{event.title}</h1>

          <div style={styles.metaRow}>
            {/* Date */}
            <div style={styles.metaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span style={styles.metaText}>{startFmt}{startTime ? ` · ${startTime}` : ""}</span>
            </div>
            {/* Location */}
            <div style={styles.metaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style={styles.metaText}>{event.location}</span>
            </div>
          </div>

          {/* Divider with perforated look */}
          <div style={styles.divider}>
            <div style={styles.dividerCircleLeft} />
            <div style={styles.dividerLine} />
            <div style={styles.dividerCircleRight} />
          </div>

          {/* Student info */}
          <div style={styles.studentRow}>
            <div style={styles.avatar}>
              {student.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p style={styles.studentName}>{student.name}</p>
              <p style={styles.studentEmail}>{student.email}</p>
              {student.college && <p style={styles.studentEmail}>{student.college}</p>}
            </div>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerCircleLeft} />
            <div style={styles.dividerLine} />
            <div style={styles.dividerCircleRight} />
          </div>

          {/* QR Code */}
          <div style={styles.qrSection}>
            <p style={styles.qrLabel}>
              {attended ? "Already scanned" : "Show this to the admin at the entrance"}
            </p>

            {attended && (
              <div style={styles.attendedBanner}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Attendance marked
                {attendedAt && (
                  <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.7 }}>
                    · {new Date(attendedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                )}
              </div>
            )}

            <div style={{ ...styles.qrWrapper, opacity: attended ? 0.4 : 1 }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code" style={styles.qrImg} />
              ) : (
                <div style={styles.qrPlaceholder}>
                  <div style={{ ...styles.skeleton, width: "100%", height: "100%", borderRadius: 12 }} />
                </div>
              )}
            </div>

            <p style={styles.qrSub}>Registration ID: <span style={{ fontFamily: "monospace", fontSize: 11 }}>{id}</span></p>

            {/* ── Attendance Code fallback ── */}
            {!attended && attendanceCode && (
              <div style={styles.codeSection}>
                <div style={styles.codeDivider}>
                  <div style={styles.codeDividerLine} />
                  <span style={styles.codeDividerText}>or use code</span>
                  <div style={styles.codeDividerLine} />
                </div>
                <p style={styles.codeLabel}>Attendance Code</p>
                <div style={styles.codeBox}>
                  {attendanceCode.split("").map((digit, i) => (
                    <span key={i} style={styles.codeDigit}>{digit}</span>
                  ))}
                </div>
                <p style={styles.codeHint}>Show this to the admin if QR scan fails</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.btnPrimary} onClick={downloadQR} disabled={!qrDataUrl}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download QR
            </button>
            <button style={styles.btnSecondary} onClick={() => load(true)} disabled={refreshing}>
              {refreshing ? (
                <span style={styles.spinner} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 16px 48px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: "8px 14px",
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: "flex-start",
    backdropFilter: "blur(8px)",
    transition: "background .2s",
  },
  card: {
    background: "#ffffff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
  },
  banner: {
    position: "relative",
    height: 180,
    overflow: "hidden",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))",
  },
  catBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    backdropFilter: "blur(4px)",
  },
  infoSection: { padding: "24px 24px 28px" },
  eventTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.3,
    marginBottom: 12,
  },
  metaRow: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 4 },
  metaItem: { display: "flex", alignItems: "center", gap: 7 },
  metaText: { fontSize: 13, color: "#4b5563" },
  divider: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    margin: "20px -24px",
  },
  dividerCircleLeft: {
    width: 20, height: 20, borderRadius: "50%",
    background: "linear-gradient(135deg, #1e3a5f, #0f172a)",
    flexShrink: 0,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    borderTop: "2px dashed #e5e7eb",
  },
  dividerCircleRight: {
    width: 20, height: 20, borderRadius: "50%",
    background: "linear-gradient(135deg, #1e3a5f, #0f172a)",
    flexShrink: 0,
  },
  studentRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  avatar: {
    width: 44, height: 44, borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    fontSize: 18, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  studentName: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 },
  studentEmail: { fontSize: 12, color: "#6b7280" },
  qrSection: { textAlign: "center" },
  qrLabel: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  attendedBanner: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
    marginBottom: 12,
  },
  qrWrapper: {
    display: "inline-block",
    padding: 12,
    background: "#fff",
    borderRadius: 16,
    border: "1.5px solid #e5e7eb",
    transition: "opacity .3s",
  },
  qrImg: { display: "block", width: 220, height: 220, borderRadius: 8 },
  qrPlaceholder: { width: 220, height: 220 },
  qrSub: { fontSize: 11, color: "#9ca3af", marginTop: 10 },
  codeSection: {
    marginTop: 20,
    textAlign: "center",
  },
  codeDivider: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  codeDividerLine: {
    flex: 1,
    height: 1,
    background: "#e5e7eb",
  },
  codeDividerText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  codeLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  codeBox: {
    display: "inline-flex",
    gap: 6,
    padding: "12px 16px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: 14,
    marginBottom: 10,
  },
  codeDigit: {
    width: 32,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    border: "1.5px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 22,
    fontWeight: 700,
    color: "#1d4ed8",
    fontFamily: "monospace",
    letterSpacing: 0,
  },
  codeHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },
  btnPrimary: {
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s, transform .1s",
  },
  btnSecondary: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s",
  },
  spinner: {
    display: "inline-block",
    width: 14, height: 14,
    border: "2px solid #d1d5db",
    borderTop: "2px solid #374151",
    borderRadius: "50%",
    animation: "ticket-spin .7s linear infinite",
  },
  errorIcon: {
    width: 56, height: 56, borderRadius: "50%",
    background: "#fef2f2",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  skeleton: {
    background: "linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%)",
    backgroundSize: "200% 100%",
    animation: "ticket-shimmer 1.4s infinite",
    borderRadius: 8,
  },
};

const skeletonAnim = `
  @keyframes ticket-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const ticketStyles = `
  @keyframes ticket-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes ticket-spin {
    to { transform: rotate(360deg); }
  }
  .ticket-card {
    animation: ticket-rise .35s cubic-bezier(.22,.68,0,1.2) forwards;
  }
  @keyframes ticket-rise {
    from { opacity: 0; transform: translateY(20px) scale(.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);   }
  }
`;