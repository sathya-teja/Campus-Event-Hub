import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMyEvents, scanAttendanceQR } from "../services/api";

const NATIVE_SUPPORTED =
  typeof window !== "undefined" && "BarcodeDetector" in window;

export default function CheckInPage() {
  const navigate = useNavigate();

  const [events,          setEvents]        = useState([]);
  const [selectedEventId, setSelectedEvent] = useState("");
  const [selectedEvent,   setEventObj]      = useState(null);
  const [loadingEvents,   setLoadingEvents] = useState(true);

  const [started,    setStarted]    = useState(false);
  const [camError,   setCamError]   = useState(null);
  const [scanState,  setScanState]  = useState("idle");
  const [torchOn,    setTorchOn]    = useState(false);
  const [torchAvail, setTorchAvail] = useState(false);

  const [feed,       setFeed]       = useState([]);
  const [lastResult, setLastResult] = useState(null);

  const isScanningRef    = useRef(false);
  const streamRef        = useRef(null);
  const videoRef         = useRef(null);
  const rafRef           = useRef(null);
  const detectorRef      = useRef(null);
  const trackRef         = useRef(null);
  const html5QrRef       = useRef(null);
  const pendingStreamRef = useRef(null);
  const domId            = useRef("checkin-" + Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getMyEvents();
        setEvents(data);
        if (data.length > 0) { setSelectedEvent(data[0]._id); setEventObj(data[0]); }
      } catch { } finally { setLoadingEvents(false); }
    })();
  }, []);

  useEffect(() => {
    if (!started || !NATIVE_SUPPORTED || !pendingStreamRef.current) return;
    const stream = pendingStreamRef.current;
    pendingStreamRef.current = null;
    const video = videoRef.current;
    if (!video) { stopScanner(); return; }
    video.srcObject = stream;
    video.play().catch(() => {});
    let detector;
    try { detector = new window.BarcodeDetector({ formats: ["qr_code"] }); }
    catch { stopScanner(); startFallback(); return; }
    detectorRef.current = detector;
    const tick = async () => {
      if (!detectorRef.current || !videoRef.current) return;
      try {
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) handleScanned(codes[0].rawValue);
        }
      } catch { }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopScanner = useCallback(async () => {
    isScanningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch { }
      try { html5QrRef.current.clear(); } catch { }
      html5QrRef.current = null;
    }
    trackRef.current = null; detectorRef.current = null;
    setStarted(false); setCamError(null); setScanState("idle");
    setTorchOn(false); setTorchAvail(false);
  }, []);

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const handleScanned = useCallback(async (text) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setScanState("verifying");
    try {
      const { data } = await scanAttendanceQR(text.trim());
      setScanState("success");
      playBeep(true);
      const result = { success: true, name: data.student?.name, email: data.student?.email };
      setLastResult(result);
      setFeed(prev => [{ id: Date.now(), success: true, name: data.student?.name, email: data.student?.email, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) }, ...prev].slice(0, 50));
    } catch (err) {
      setScanState("error");
      playBeep(false);
      const msg = err.response?.data?.message || "Scan failed";
      setLastResult({ success: false, message: msg });
      setFeed(prev => [{ id: Date.now(), success: false, message: msg, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) }, ...prev].slice(0, 50));
    }
    setTimeout(() => { setScanState("scanning"); isScanningRef.current = false; }, 1500);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!trackRef.current) return;
    try { const next = !torchOn; await trackRef.current.applyConstraints({ advanced: [{ torch: next }] }); setTorchOn(next); } catch { }
  }, [torchOn]);

  const startNative = useCallback(async () => {
    setCamError(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } });
    } catch (err) {
      const n = err?.name || "";
      if (n === "NotAllowedError" || n === "PermissionDeniedError") setCamError("Camera permission denied. Allow access and try again.");
      else if (n === "NotFoundError") setCamError("No camera found on this device.");
      else if (n === "NotReadableError") setCamError("Camera is in use by another app.");
      else if (n === "OverconstrainedError") { try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); } catch (e2) { setCamError("Could not access camera: " + (e2?.message || "Unknown error")); return; } }
      else { setCamError("Could not start camera: " + (err?.message || err?.name || "Unknown error")); return; }
      if (!stream) return;
    }
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    trackRef.current = track;
    const caps = track.getCapabilities?.() || {};
    if (caps.torch) setTorchAvail(true);
    pendingStreamRef.current = stream;
    setStarted(true); setScanState("scanning");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startFallback = useCallback(async () => {
    setCamError(null); isScanningRef.current = false;
    if (html5QrRef.current) { try { await html5QrRef.current.stop(); } catch { } try { html5QrRef.current.clear(); } catch { } html5QrRef.current = null; }
    let Html5Qrcode;
    try { const m = await import("html5-qrcode"); Html5Qrcode = m.Html5Qrcode; } catch { setCamError("QR library failed to load. Try refreshing."); return; }
    setStarted(true); setScanState("scanning");
    try {
      const scanner = new Html5Qrcode(domId.current, { verbose: false });
      html5QrRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 25, qrbox: { width: 280, height: 280 }, disableFlip: true }, (text) => handleScanned(text), () => { });
    } catch (err) {
      setStarted(false); setScanState("idle"); html5QrRef.current = null;
      const n = err?.name || ""; const msg = (err?.message || "").toLowerCase();
      if (n === "NotAllowedError" || msg.includes("permission")) setCamError("Camera permission denied.");
      else if (n === "NotFoundError" || msg.includes("notfound")) setCamError("No camera found on this device.");
      else setCamError("Could not start camera: " + (err?.message || err?.name || "Unknown error"));
    }
  }, [handleScanned]);

  const startScanner = useCallback(() => { NATIVE_SUPPORTED ? startNative() : startFallback(); }, [startNative, startFallback]);

  const successCount = feed.filter(f => f.success).length;
  const errorCount   = feed.filter(f => !f.success).length;

  const accentColor = { idle:"#3b82f6", scanning:"#3b82f6", verifying:"#f59e0b", success:"#22c55e", error:"#ef4444" }[scanState] || "#3b82f6";

  return (
    <div className="checkin-root">
      <style>{CSS}</style>

      {/* ══ LEFT — camera ══ */}
      <div className="checkin-cam-panel">
        <div className="checkin-cam-topbar">
          <button className="checkin-back-btn" onClick={() => { stopScanner(); navigate("/dashboard/collegeadmin"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div className="checkin-cam-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Event Check-in
          </div>
          <div className="checkin-cam-controls">
            {torchAvail && (
              <button className={`checkin-ctrl-btn${torchOn ? " checkin-ctrl-btn--torch" : ""}`} onClick={toggleTorch} title={torchOn ? "Torch off" : "Torch on"}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 2h6l-1 7h-4L9 2zm-1 7h8l-5 13-3-8H8V9zm5 0v8l2-5h-2z"/></svg>
              </button>
            )}
            {started && (
              <button className="checkin-ctrl-btn checkin-ctrl-btn--stop" onClick={stopScanner} title="Stop scanner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              </button>
            )}
          </div>
        </div>

        <div className="checkin-viewport">
          <video ref={videoRef} muted playsInline className="checkin-video" style={{ display: (started && NATIVE_SUPPORTED) ? "block" : "none" }} />
          <div id={domId.current} className="checkin-fallback-div" style={{ display: (started && !NATIVE_SUPPORTED) ? "block" : "none" }} />

          {!started && (
            <div className="checkin-idle-overlay">
              {camError ? (
                <div className="checkin-idle-inner">
                  <div className="checkin-error-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                  <p className="checkin-idle-title">Camera error</p>
                  <p className="checkin-idle-sub">{camError}</p>
                  <button className="checkin-start-btn" onClick={startScanner}>Try Again</button>
                </div>
              ) : (
                <div className="checkin-idle-inner">
                  <div className="checkin-idle-icon checkin-float">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span className="checkin-ripple checkin-ripple--1" />
                    <span className="checkin-ripple checkin-ripple--2" />
                  </div>
                  <p className="checkin-idle-title">Ready to scan</p>
                  <p className="checkin-idle-sub">{NATIVE_SUPPORTED ? "Native BarcodeDetector — sub-200ms scan speed" : "Point camera at student's QR code"}</p>
                  <button className="checkin-start-btn" onClick={startScanner} disabled={!selectedEventId || loadingEvents}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Start Scanning
                  </button>
                  {!selectedEventId && !loadingEvents && <p className="checkin-idle-warning">Select an event on the right first</p>}
                </div>
              )}
            </div>
          )}

          {started && (
            <div className="checkin-scan-overlay">
              <div className="checkin-scan-box" style={{ "--accent": accentColor }}>
                <span className="checkin-corner checkin-corner--tl" />
                <span className="checkin-corner checkin-corner--tr" />
                <span className="checkin-corner checkin-corner--bl" />
                <span className="checkin-corner checkin-corner--br" />
                {scanState === "scanning" && <span className="checkin-scan-line" />}
                {scanState === "scanning" && <><span className="checkin-scan-ring checkin-scan-ring--1" /><span className="checkin-scan-ring checkin-scan-ring--2" /></>}
                {(scanState === "success" || scanState === "error" || scanState === "verifying") && <span className="checkin-flash" style={{ "--flash-color": accentColor }} />}
                {scanState === "success" && (
                  <div className="checkin-result-icon">
                    <div style={{ width:72, height:72, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 40px rgba(34,197,94,.45)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                )}
                {scanState === "error" && (
                  <div className="checkin-result-icon">
                    <div style={{ width:72, height:72, borderRadius:"50%", background:"#ef4444", boxShadow:"0 0 40px rgba(239,68,68,.45)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </div>
                  </div>
                )}
                {scanState === "verifying" && <div className="checkin-verifying-spinner" />}
              </div>

              <div className="checkin-status-pill" style={{ "--accent": accentColor }}>
                <span className="checkin-status-dot" />
                <span className="checkin-status-text">
                  {scanState === "scanning"  && "Hold QR steady in the frame"}
                  {scanState === "verifying" && "Verifying attendance…"}
                  {scanState === "success"   && (lastResult?.name ? `${lastResult.name} — checked in` : "Checked in")}
                  {scanState === "error"     && (lastResult?.message || "Scan failed — try again")}
                </span>
                {NATIVE_SUPPORTED && <span className="checkin-fast-badge">⚡</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT — side panel ══ */}
      <div className="checkin-side-panel">
        <div className="checkin-event-block">
          <p className="checkin-section-label">Event</p>
          {loadingEvents ? (
            <div className="checkin-skeleton" style={{ height:44, borderRadius:12 }} />
          ) : events.length === 0 ? (
            <p className="checkin-no-events">No events found.</p>
          ) : (
            <select
              value={selectedEventId}
              onChange={e => { setSelectedEvent(e.target.value); setEventObj(events.find(ev => ev._id === e.target.value) || null); }}
              className="checkin-select"
              disabled={started}
            >
              {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
            </select>
          )}
          {selectedEvent && (
            <div className="checkin-event-meta">
              {selectedEvent.location && (
                <span className="checkin-meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {selectedEvent.location}
                </span>
              )}
              {selectedEvent.startDate && (
                <span className="checkin-meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {new Date(selectedEvent.startDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="checkin-stats-row">
          <div className="checkin-stat checkin-stat--success">
            <span className="checkin-stat-num">{successCount}</span>
            <span className="checkin-stat-label">Checked in</span>
          </div>
          <div className="checkin-stat checkin-stat--error">
            <span className="checkin-stat-num">{errorCount}</span>
            <span className="checkin-stat-label">Failed</span>
          </div>
          <div className="checkin-stat checkin-stat--total">
            <span className="checkin-stat-num">{feed.length}</span>
            <span className="checkin-stat-label">Total</span>
          </div>
        </div>

        <div className="checkin-feed-block">
          <div className="checkin-feed-header">
            <p className="checkin-section-label">Live feed</p>
            {feed.length > 0 && <button className="checkin-clear-btn" onClick={() => setFeed([])}>Clear</button>}
          </div>
          <div className="checkin-feed-list">
            {feed.length === 0 ? (
              <div className="checkin-feed-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                <p>Scans will appear here</p>
              </div>
            ) : feed.map((item, i) => (
              <div key={item.id} className={`checkin-feed-item${i === 0 ? " checkin-feed-item--new" : ""}`}>
                <div className={`checkin-feed-avatar${item.success ? " checkin-feed-avatar--ok" : " checkin-feed-avatar--err"}`}>
                  {item.success
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  }
                </div>
                <div className="checkin-feed-body">
                  <p className="checkin-feed-name">{item.success ? item.name : item.message}</p>
                  {item.success && item.email && <p className="checkin-feed-sub">{item.email}</p>}
                </div>
                <span className="checkin-feed-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function playBeep(success) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (success) { osc.frequency.setValueAtTime(660, ctx.currentTime); osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); }
    else { osc.frequency.setValueAtTime(330, ctx.currentTime); osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12); }
    osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { }
}

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  .checkin-root{display:flex;height:100vh;width:100vw;overflow:hidden;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f1f5f9}
  .checkin-cam-panel{flex:1;display:flex;flex-direction:column;min-width:0;border-right:1px solid rgba(255,255,255,0.06)}
  .checkin-cam-topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;gap:12px}
  .checkin-back-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#94a3b8;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
  .checkin-back-btn:hover{background:rgba(255,255,255,0.1);color:#f1f5f9}
  .checkin-cam-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:0.02em}
  .checkin-cam-controls{display:flex;align-items:center;gap:8px}
  .checkin-ctrl-btn{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#94a3b8;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
  .checkin-ctrl-btn:hover{background:rgba(255,255,255,0.12);color:#f1f5f9}
  .checkin-ctrl-btn--torch{background:rgba(250,204,21,0.15);border-color:rgba(250,204,21,0.3);color:#fbbf24}
  .checkin-ctrl-btn--torch:hover{background:rgba(250,204,21,0.25)}
  .checkin-ctrl-btn--stop{border-color:rgba(239,68,68,0.3);color:#f87171}
  .checkin-ctrl-btn--stop:hover{background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.5)}
  .checkin-viewport{flex:1;position:relative;background:#000;overflow:hidden}
  .checkin-video{width:100%;height:100%;object-fit:cover;display:block}
  .checkin-fallback-div{width:100%;height:100%}
  .checkin-idle-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#0f172a 0%,#09090f 100%)}
  .checkin-idle-inner{display:flex;flex-direction:column;align-items:center;gap:14px;padding:32px;text-align:center;max-width:360px}
  .checkin-idle-icon{position:relative;width:96px;height:96px;border-radius:24px;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center;box-shadow:0 0 60px rgba(37,99,235,0.35)}
  .checkin-ripple{position:absolute;inset:0;border-radius:24px;border:2px solid rgba(59,130,246,0.4);animation:checkin-ripple 2.4s ease-out infinite}
  .checkin-ripple--2{animation-delay:1.2s}
  @keyframes checkin-ripple{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.7);opacity:0}}
  .checkin-float{animation:checkin-float 3s ease-in-out infinite}
  @keyframes checkin-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  .checkin-idle-title{font-size:22px;font-weight:700;color:#f1f5f9}
  .checkin-idle-sub{font-size:13px;color:#64748b;line-height:1.5;max-width:280px}
  .checkin-idle-warning{font-size:12px;color:#f59e0b}
  .checkin-error-icon{width:72px;height:72px;border-radius:50%;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);display:flex;align-items:center;justify-content:center;color:#f87171}
  .checkin-start-btn{display:flex;align-items:center;gap:9px;padding:14px 32px;border-radius:14px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 4px 24px rgba(37,99,235,0.4);margin-top:4px}
  .checkin-start-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 32px rgba(37,99,235,0.5)}
  .checkin-start-btn:active:not(:disabled){transform:translateY(0)}
  .checkin-start-btn:disabled{opacity:.45;cursor:not-allowed}
  .checkin-scan-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;pointer-events:none}
  .checkin-scan-box{position:relative;width:clamp(200px,38vmin,300px);height:clamp(200px,38vmin,300px)}
  .checkin-scan-box::before{content:"";position:absolute;inset:0;box-shadow:0 0 0 9999px rgba(0,0,0,0.58);border-radius:10px;pointer-events:none}
  .checkin-corner{position:absolute;width:28px;height:28px}
  .checkin-corner--tl{top:0;left:0;border-top:3px solid var(--accent);border-left:3px solid var(--accent);border-radius:8px 0 0 0}
  .checkin-corner--tr{top:0;right:0;border-top:3px solid var(--accent);border-right:3px solid var(--accent);border-radius:0 8px 0 0}
  .checkin-corner--bl{bottom:0;left:0;border-bottom:3px solid var(--accent);border-left:3px solid var(--accent);border-radius:0 0 0 8px}
  .checkin-corner--br{bottom:0;right:0;border-bottom:3px solid var(--accent);border-right:3px solid var(--accent);border-radius:0 0 8px 0}
  .checkin-scan-line{position:absolute;left:10px;right:10px;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);animation:checkin-scanline 1.7s ease-in-out infinite}
  @keyframes checkin-scanline{0%,100%{top:8px;opacity:.7}50%{top:calc(100% - 10px);opacity:1}}
  .checkin-scan-ring{position:absolute;inset:-14px;border:1.5px solid var(--accent);border-radius:14px;opacity:0;animation:checkin-ring 2.2s ease-out infinite}
  .checkin-scan-ring--2{animation-delay:1.1s}
  @keyframes checkin-ring{0%{opacity:.5;transform:scale(.92)}100%{opacity:0;transform:scale(1.65)}}
  .checkin-flash{position:absolute;inset:0;background:color-mix(in srgb,var(--flash-color) 20%,transparent);border:2.5px solid var(--flash-color);border-radius:10px;animation:checkin-flash 1s ease-out forwards}
  @keyframes checkin-flash{0%{opacity:1}100%{opacity:0}}
  .checkin-result-icon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:checkin-pop .45s cubic-bezier(.34,1.56,.64,1) forwards}
  @keyframes checkin-pop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}
  .checkin-verifying-spinner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .checkin-verifying-spinner::after{content:"";width:48px;height:48px;border:4px solid rgba(255,255,255,.15);border-top-color:#f59e0b;border-radius:50%;animation:checkin-spin .75s linear infinite}
  @keyframes checkin-spin{to{transform:rotate(360deg)}}
  .checkin-status-pill{display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:999px;background:rgba(0,0,0,0.65);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);max-width:320px}
  .checkin-status-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;animation:checkin-dot 1.2s ease-in-out infinite}
  @keyframes checkin-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}
  .checkin-status-text{font-size:13px;font-weight:500;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .checkin-fast-badge{font-size:13px;flex-shrink:0;background:rgba(59,130,246,0.2);padding:2px 6px;border-radius:6px;border:1px solid rgba(59,130,246,0.3)}
  .checkin-side-panel{width:320px;flex-shrink:0;display:flex;flex-direction:column;background:#0d0d14;overflow:hidden}
  .checkin-section-label{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px}
  .checkin-event-block{padding:20px 18px 16px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0}
  .checkin-select{width:100%;padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#f1f5f9;font-size:13px;font-weight:500;outline:none;cursor:pointer;transition:border-color .2s}
  .checkin-select:focus{border-color:rgba(59,130,246,0.5)}
  .checkin-select:disabled{opacity:.5;cursor:not-allowed}
  .checkin-select option{background:#1e1e2e}
  .checkin-event-meta{display:flex;flex-direction:column;gap:5px;margin-top:10px}
  .checkin-meta-item{display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b}
  .checkin-no-events{font-size:12px;color:#64748b}
  .checkin-stats-row{display:flex;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0}
  .checkin-stat{flex:1;display:flex;flex-direction:column;align-items:center;padding:16px 8px;border-right:1px solid rgba(255,255,255,0.06)}
  .checkin-stat:last-child{border-right:none}
  .checkin-stat-num{font-size:26px;font-weight:800;line-height:1;transition:all .3s}
  .checkin-stat-label{font-size:10px;color:#475569;margin-top:4px;font-weight:500}
  .checkin-stat--success .checkin-stat-num{color:#22c55e}
  .checkin-stat--error   .checkin-stat-num{color:#f87171}
  .checkin-stat--total   .checkin-stat-num{color:#94a3b8}
  .checkin-feed-block{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .checkin-feed-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 4px;flex-shrink:0}
  .checkin-clear-btn{background:none;border:none;font-size:11px;color:#475569;cursor:pointer;padding:3px 8px;border-radius:6px;transition:color .2s}
  .checkin-clear-btn:hover{color:#94a3b8}
  .checkin-feed-list{flex:1;overflow-y:auto;padding:6px 0}
  .checkin-feed-list::-webkit-scrollbar{width:3px}
  .checkin-feed-list::-webkit-scrollbar-track{background:transparent}
  .checkin-feed-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
  .checkin-feed-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:120px;color:#334155;font-size:12px}
  .checkin-feed-item{display:flex;align-items:center;gap:10px;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,0.035);transition:background .15s}
  .checkin-feed-item:hover{background:rgba(255,255,255,0.025)}
  .checkin-feed-item--new{animation:checkin-slidein .22s ease forwards}
  @keyframes checkin-slidein{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  .checkin-feed-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .checkin-feed-avatar--ok{background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.2)}
  .checkin-feed-avatar--err{background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
  .checkin-feed-body{flex:1;min-width:0}
  .checkin-feed-name{font-size:12px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .checkin-feed-sub{font-size:10px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
  .checkin-feed-time{font-size:10px;color:#334155;flex-shrink:0}
  .checkin-skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.05) 75%);background-size:200% 100%;animation:checkin-shimmer 1.4s infinite}
  @keyframes checkin-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @media(max-width:640px){
    .checkin-root{flex-direction:column}
    .checkin-cam-panel{flex:none;height:55vh;border-right:none;border-bottom:1px solid rgba(255,255,255,0.06)}
    .checkin-side-panel{width:100%;height:45vh;flex-direction:row}
    .checkin-event-block{border-bottom:none;border-right:1px solid rgba(255,255,255,0.06);flex:1;min-width:0}
    .checkin-stats-row{flex-direction:column;width:120px;flex-shrink:0}
    .checkin-stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);padding:8px 10px}
    .checkin-stat-num{font-size:20px}
    .checkin-feed-block{display:none}
  }
  @media(min-width:641px) and (max-width:900px){.checkin-side-panel{width:260px}}
`;
