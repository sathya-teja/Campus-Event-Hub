import mongoose from "mongoose";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import User from "../models/User.js";


/* ── helpers ─────────────────────────────────────────────── */
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function roundRect(doc, x, y, w, h, r) {
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y)
    .closePath();
}

function drawStar(doc, cx, cy, outerR, innerR, points = 5) {
  const step = Math.PI / points;
  let first = true;
  for (let i = 0; i < points * 2; i++) {
    const r     = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x     = cx + r * Math.cos(angle);
    const y     = cy + r * Math.sin(angle);
    if (first) { doc.moveTo(x, y); first = false; }
    else        { doc.lineTo(x, y); }
  }
  doc.closePath();
}

/*
========================================
📜 GET CERTIFICATE INFO  (student)
GET /api/certificates/:registrationId
========================================
*/
export const getCertificateInfo = async (req, res) => {
  try {
    const { registrationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({ message: "Invalid registration ID." });
    }

    const registration = await Registration.findById(registrationId)
      .populate("userId", "name email college")
      .populate("eventId", "title location startDate endDate category createdBy")
      .lean();

    if (!registration) return res.status(404).json({ message: "Registration not found." });

    if (registration.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({ message: "Certificate only available for approved registrations." });
    }

    if (!registration.attended) {
      return res.status(400).json({ message: "Certificate only available after attendance is marked." });
    }

    const certId = crypto
      .createHash("sha256")
      .update(registrationId)
      .digest("hex")
      .slice(0, 12)
      .toUpperCase();

    const admin = await User.findById(registration.eventId.createdBy)
      .select("college name").lean();
    const organiserCollege = admin?.college || admin?.name || "CampusEventHub";

    res.status(200).json({
      certId,
      student:        registration.userId,
      event:          registration.eventId,
      organiserCollege,
      attendedAt:     registration.attendedAt,
    });
  } catch (err) {
    console.error("❌ getCertificateInfo:", err.message);
    res.status(500).json({ message: "Failed to fetch certificate info." });
  }
};

/*
========================================
📥 DOWNLOAD CERTIFICATE PDF  (student)
GET /api/certificates/:registrationId/download

VERTICAL LAYOUT (A4 landscape = 595.28pt tall):
  5       top blue bar
  14      CAMPUSEVENTHUB
  30      CERTIFICATE OF PARTICIPATION
  44      rule
  54      "This is to certify that"
  68      student name (36pt, ~44pt tall)
  114     rule under name
  124     "has successfully participated in"
  142     event title (16pt, ~22pt tall)
  174     thin rule above grid
  184     grid row 1 label (DATE / VENUE)
  195     grid row 1 value
  226     grid row 2 label (ORGANISER / COLLEGE)
  237     grid row 2 value
  270     rule after grid
  ---- medal band: 270 → 462 ----
  462     rule above signatures
  474     signature dash line
  480     organiser / platform name
  492     "Event Organiser" / "Platform Authority"
  572     footnote
  590     bottom blue bar
========================================
*/
export const downloadCertificate = async (req, res) => {
  try {
    const { registrationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({ message: "Invalid registration ID." });
    }

    const registration = await Registration.findById(registrationId)
      .populate("userId", "name email college")
      .populate("eventId", "title location startDate endDate category createdBy")
      .lean();

    if (!registration) return res.status(404).json({ message: "Registration not found." });

    if (registration.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({ message: "Certificate only available for approved registrations." });
    }

    if (!registration.attended) {
      return res.status(400).json({ message: "Certificate only available after attendance is marked." });
    }

    const event   = registration.eventId;
    const student = registration.userId;

    const admin = await User.findById(event.createdBy).select("college name").lean();
    const organiserCollege = admin?.college || admin?.name || "CampusEventHub";

    const certId = crypto
      .createHash("sha256")
      .update(registrationId)
      .digest("hex")
      .slice(0, 12)
      .toUpperCase();

    const qrVerifyUrl = `${process.env.FRONTEND_URL}/verify-certificate/${certId}`;
    const qrBuffer = await QRCode.toBuffer(qrVerifyUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 200,
      color: { dark: "#1e293b", light: "#ffffff" },
    });

    /* ── Colours ─────────────────────────────────────────── */
    const PAGE_W  = 841.89;
    const PAGE_H  = 595.28;
    const WHITE   = "#ffffff";
    const OFF_W   = "#f8fafc";
    const BLUE    = "#2563eb";
    const BLUE_D  = "#1d4ed8";
    const BLUE_L  = "#eff6ff";
    const SLATE   = "#1e293b";
    const SLATE_M = "#475569";
    const SLATE_L = "#94a3b8";
    const BORDER  = "#e2e8f0";

    const CAT_COLORS = {
      Tech:     { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
      Cultural: { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
      Sports:   { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
      Workshop: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
    };
    const catColor = CAT_COLORS[event.category] || { bg: BLUE_L, text: BLUE_D, border: "#bfdbfe" };

    const doc = new PDFDocument({
      size: "A4", layout: "landscape", margin: 0,
      info: {
        Title:   `Certificate of Participation – ${student.name}`,
        Author:  "CampusEventHub",
        Subject: event.title,
        Creator: "CampusEventHub",
      },
    });

    const safeName = `certificate_${student.name}_${event.title}`
      .replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 70);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
    doc.pipe(res);

    /* ══════════════════════════════════════════════════════
       BACKGROUND
    ══════════════════════════════════════════════════════ */
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(WHITE);

    // Right panel
    doc.save().rect(PAGE_W * 0.66, 0, PAGE_W * 0.34, PAGE_H).fill(OFF_W).restore();

    // Panel divider line
    doc.save()
      .moveTo(PAGE_W * 0.66, 36).lineTo(PAGE_W * 0.66, PAGE_H - 36)
      .strokeColor(BORDER).lineWidth(0.75).stroke().restore();

    // Top / bottom / left bars
    doc.rect(0, 0, PAGE_W, 5).fill(BLUE);
    doc.rect(0, PAGE_H - 5, PAGE_W, 5).fill(BLUE);
    doc.rect(0, 5, 5, PAGE_H - 10).fill(BLUE);

    /* ══════════════════════════════════════════════════════
       DECORATIVE BACKGROUND (drawn before text so text is on top)
    ══════════════════════════════════════════════════════ */
    const LEFT_W = PAGE_W * 0.66;

    // 1. Faint diagonal watermark — clipped to left panel
    doc.save();
    doc.rect(5, 5, LEFT_W - 5, PAGE_H - 10).clip();
    doc
      .font("Helvetica-Bold").fontSize(100)
      .fillColor(BLUE).fillOpacity(0.028)
      .rotate(-30, { origin: [LEFT_W * 0.45, PAGE_H * 0.55] })
      .text("CERTIFICATE", 20, PAGE_H * 0.28, {
        width: 660, align: "center", characterSpacing: 10, lineBreak: false,
      });
    doc.restore();

    // 2. Concentric quarter-circles — bottom-right corner of left panel
    doc.save();
    doc.rect(0, 0, LEFT_W, PAGE_H).clip();
    [80, 110, 140].forEach((r) => {
      doc.save()
        .circle(LEFT_W, PAGE_H, r)
        .strokeColor(BLUE).fillOpacity(0).strokeOpacity(0.07)
        .lineWidth(1).stroke().restore();
    });
    doc.restore();

    // 3. Dot grid — top-right corner of left panel
    const DOT_COLS = 5, DOT_ROWS = 4, DOT_GAP = 11;
    const dotX0 = LEFT_W - 14 - (DOT_COLS - 1) * DOT_GAP;
    const dotY0 = 16;
    for (let row = 0; row < DOT_ROWS; row++) {
      for (let col = 0; col < DOT_COLS; col++) {
        doc.save()
          .circle(dotX0 + col * DOT_GAP, dotY0 + row * DOT_GAP, 1.4)
          .fillColor(BLUE).fillOpacity(0.18).fill().restore();
      }
    }

    /* ══════════════════════════════════════════════════════
       LEFT CONTENT — Y positions match the layout table above
    ══════════════════════════════════════════════════════ */
    const LX   = 44;
    const LW   = PAGE_W * 0.60;
    const COL1 = LX + 14;                      // ~58
    const COL2 = COL1 + (LW - 40) / 2 + 10;   // ~327

    // ── Platform label ─────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLUE).fillOpacity(1)
      .text("CAMPUSEVENTHUB", COL1, 14, { characterSpacing: 3.5 });

    // ── "CERTIFICATE OF PARTICIPATION" ─────────────────
    doc.font("Helvetica-Bold").fontSize(9).fillColor(SLATE_M).fillOpacity(1)
      .text("CERTIFICATE OF PARTICIPATION", COL1, 30, { characterSpacing: 2.5 });

    // Short blue rule
    doc.save()
      .moveTo(COL1, 44).lineTo(COL1 + 56, 44)
      .strokeColor(BLUE).lineWidth(2).stroke().restore();

    // ── "This is to certify that" ──────────────────────
    doc.font("Helvetica").fontSize(10).fillColor(SLATE_M).fillOpacity(1)
      .text("This is to certify that", COL1, 54);

    // ── Student name (36pt hero) ───────────────────────
    doc.font("Helvetica-Bold").fontSize(36).fillColor(SLATE).fillOpacity(1)
      .text(student.name || "Student", COL1, 68, { width: LW - 28 });

    // Rule under name — name is ~44pt tall so sits at 68+44=112, rule at 114
    doc.save()
      .moveTo(COL1, 114).lineTo(COL1 + Math.min(LW - 60, 320), 114)
      .strokeColor(BORDER).lineWidth(0.75).stroke().restore();

    // ── "has successfully participated in" ─────────────
    doc.font("Helvetica").fontSize(10.5).fillColor(SLATE_M).fillOpacity(1)
      .text("has successfully participated in", COL1, 124);

    // ── Event title (16pt) ─────────────────────────────
    doc.font("Helvetica-Bold").fontSize(16).fillColor(BLUE_D).fillOpacity(1)
      .text(event.title, COL1, 142, { width: LW - 40 });

    // ── Thin rule above grid ───────────────────────────
    doc.save()
      .moveTo(COL1, 176).lineTo(LEFT_W - 20, 176)
      .strokeColor(BORDER).lineWidth(0.5).stroke().restore();

    /* ── Details grid ────────────────────────────────── */
    const eventDateStr = fmtDate(event.startDate) +
      (event.endDate && fmtDate(event.endDate) !== fmtDate(event.startDate)
        ? ` – ${fmtDate(event.endDate)}` : "");

    const GRID_ROW1 = 186;   // label at 186, value at 197
    const GRID_ROW2 = 228;   // label at 228, value at 239

    [
      { label: "Date",      value: eventDateStr,           x: COL1, y: GRID_ROW1 },
      { label: "Venue",     value: event.location || "—",  x: COL2, y: GRID_ROW1 },
      { label: "Organiser", value: organiserCollege,        x: COL1, y: GRID_ROW2 },
      { label: "College",   value: student.college || "—", x: COL2, y: GRID_ROW2 },
    ].forEach(({ label, value, x, y }) => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(SLATE_L).fillOpacity(1)
        .text(label.toUpperCase(), x, y, { characterSpacing: 1 });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(SLATE).fillOpacity(1)
        .text(value, x, y + 11, { width: (LW - 40) / 2 - 10 });
    });

    // ── Rule after grid ────────────────────────────────
    // Grid row 2 value ends at ~252. Rule at 268.
    const AFTER_GRID = 268;

    doc.save()
      .moveTo(COL1, AFTER_GRID).lineTo(LEFT_W - 20, AFTER_GRID)
      .strokeColor(BORDER).lineWidth(0.6).stroke().restore();

    /* ════════════════════════════════════════════════════
       MEDAL — sits in the band between grid and signatures
       Band: 268 → 462 = 194pt tall. Midpoint = 365.
    ════════════════════════════════════════════════════ */
    const SIG_Y    = 462;
    const BAND_MID = AFTER_GRID + (SIG_Y - AFTER_GRID) / 2;  // 365

    const MEDAL_CX = COL1 + 76;   // ~134px, left column
    const MEDAL_CY = BAND_MID;    // ~365px

    // Outer glow ring
    doc.save().circle(MEDAL_CX, MEDAL_CY, 52)
      .fillColor(BLUE_L).fillOpacity(0.5).fill().restore();

    // Middle ring
    doc.save().circle(MEDAL_CX, MEDAL_CY, 40)
      .fillColor(BLUE_L).fillOpacity(1).fill().restore();

    // Solid blue inner circle
    doc.save().circle(MEDAL_CX, MEDAL_CY, 28)
      .fillColor(BLUE).fillOpacity(1).fill().restore();

    // White star inside
    doc.save();
    drawStar(doc, MEDAL_CX, MEDAL_CY, 17, 7, 5);
    doc.fillColor(WHITE).fillOpacity(1).fill();
    doc.restore();

    // Border on outer ring
    doc.save().circle(MEDAL_CX, MEDAL_CY, 52)
      .strokeColor(BLUE).fillOpacity(0).strokeOpacity(0.15).lineWidth(0.8).stroke().restore();

    // "PARTICIPATION" label above medal
    doc.font("Helvetica-Bold").fontSize(6.5)
      .fillColor(BLUE).fillOpacity(0.65)
      .text("★  PARTICIPATION  ★", MEDAL_CX - 54, MEDAL_CY - 68, {
        width: 108, align: "center", characterSpacing: 1, lineBreak: false,
      });

    // Descriptive text to the right of the medal
    const NOTE_X = MEDAL_CX + 68;
    const NOTE_W = COL2 + (LW - 40) / 2 - NOTE_X - 10;

    doc.font("Helvetica").fontSize(8.5).fillColor(SLATE_M).fillOpacity(1)
      .text(
        "This certificate acknowledges the successful participation and contribution to this event.",
        NOTE_X, BAND_MID - 22,
        { width: NOTE_W, lineGap: 3 }
      );

    // Short accent line under note text
    doc.save()
      .moveTo(NOTE_X, BAND_MID + 22).lineTo(NOTE_X + 60, BAND_MID + 22)
      .strokeColor(BLUE).strokeOpacity(0.3).lineWidth(1).stroke().restore();

    /* ── Signatures ───────────────────────────────────── */
    // Rule above signatures
    doc.save()
      .moveTo(COL1, SIG_Y).lineTo(LEFT_W - 20, SIG_Y)
      .strokeColor(BORDER).lineWidth(0.6).stroke().restore();

    // Sig 1 — organiser
    doc.save()
      .moveTo(COL1, SIG_Y + 8).lineTo(COL1 + 72, SIG_Y + 8)
      .strokeColor(SLATE_L).lineWidth(0.5).stroke().restore();

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(SLATE).fillOpacity(1)
      .text(organiserCollege.slice(0, 24), COL1, SIG_Y + 14);
    doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_L).fillOpacity(1)
      .text("Event Organiser", COL1, SIG_Y + 26);

    // Sig 2 — platform
    const SIG2_X = COL1 + 210;

    doc.save()
      .moveTo(SIG2_X, SIG_Y + 8).lineTo(SIG2_X + 72, SIG_Y + 8)
      .strokeColor(SLATE_L).lineWidth(0.5).stroke().restore();

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(SLATE).fillOpacity(1)
      .text("CampusEventHub", SIG2_X, SIG_Y + 14);
    doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_L).fillOpacity(1)
      .text("Platform Authority", SIG2_X, SIG_Y + 26);

    // Footnote
    doc.font("Helvetica").fontSize(6.5).fillColor(SLATE_L).fillOpacity(1)
      .text(
        `Certificate ID: ${certId}  ·  Issued by CampusEventHub`,
        COL1, PAGE_H - 20, { characterSpacing: 0.3 }
      );

    /* ══════════════════════════════════════════════════════
       RIGHT PANEL
    ══════════════════════════════════════════════════════ */
    const RX  = PAGE_W * 0.66 + 1;
    const RW  = PAGE_W - RX - 12;
    const RCX = RX + RW / 2;

    // Category badge
    const badgeW = 80, badgeH = 22;
    const badgeX = RCX - badgeW / 2, badgeY = 28;

    doc.save(); roundRect(doc, badgeX, badgeY, badgeW, badgeH, 11);
    doc.fill(catColor.bg).restore();
    doc.save(); roundRect(doc, badgeX, badgeY, badgeW, badgeH, 11);
    doc.strokeColor(catColor.border).lineWidth(0.75).stroke().restore();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(catColor.text).fillOpacity(1)
      .text((event.category || "Event").toUpperCase(), badgeX, badgeY + 7.5,
        { width: badgeW, align: "center", characterSpacing: 1.5 });

    // "Scan to verify" with small star accents
    const scanY = 66;
    doc.save();
    drawStar(doc, RCX - 44, scanY + 4, 3, 1.5, 5);
    doc.fillColor(SLATE_L).fillOpacity(0.45).fill().restore();
    doc.save();
    drawStar(doc, RCX + 44, scanY + 4, 3, 1.5, 5);
    doc.fillColor(SLATE_L).fillOpacity(0.45).fill().restore();

    doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_L).fillOpacity(1)
      .text("Scan to verify", RX, scanY, { width: RW, align: "center", characterSpacing: 0.5 });

    // QR code
    const QR_SZ = 110, QR_PAD = 10;
    const QR_BOX = QR_SZ + QR_PAD * 2;
    const QR_X = RCX - QR_BOX / 2, QR_Y = 80;

    doc.save(); roundRect(doc, QR_X, QR_Y, QR_BOX, QR_BOX, 10);
    doc.fill(WHITE).restore();
    doc.save(); roundRect(doc, QR_X, QR_Y, QR_BOX, QR_BOX, 10);
    doc.strokeColor(BORDER).lineWidth(0.75).stroke().restore();
    doc.image(qrBuffer, QR_X + QR_PAD, QR_Y + QR_PAD, { width: QR_SZ, height: QR_SZ });

    // Cert ID
    const ID_Y = QR_Y + QR_BOX + 14;
    doc.font("Helvetica").fontSize(7).fillColor(SLATE_L).fillOpacity(1)
      .text("CERTIFICATE ID", RX, ID_Y, { width: RW, align: "center", characterSpacing: 1.5 });

    const ID_PILL_W = 120, ID_PILL_H = 20;
    const ID_PILL_X = RCX - ID_PILL_W / 2, ID_PILL_Y = ID_Y + 11;

    doc.save(); roundRect(doc, ID_PILL_X, ID_PILL_Y, ID_PILL_W, ID_PILL_H, 6);
    doc.fill(BLUE_L).restore();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLUE_D).fillOpacity(1)
      .text(certId, ID_PILL_X, ID_PILL_Y + 5.5,
        { width: ID_PILL_W, align: "center", characterSpacing: 2 });

    // Divider
    const DIV_Y = ID_PILL_Y + ID_PILL_H + 14;
    doc.save()
      .moveTo(RX + 16, DIV_Y).lineTo(RX + RW - 16, DIV_Y)
      .strokeColor(BORDER).lineWidth(0.6).stroke().restore();

    // Student email
    doc.font("Helvetica").fontSize(7.5).fillColor(SLATE_M).fillOpacity(1)
      .text(student.email || "", RX, DIV_Y + 10, { width: RW, align: "center" });

    // Attended date
    if (registration.attendedAt) {
      doc.font("Helvetica").fontSize(7).fillColor(SLATE_L).fillOpacity(1)
        .text(`Attended ${fmtDate(registration.attendedAt)}`, RX, DIV_Y + 24,
          { width: RW, align: "center" });
    }

    // "OFFICIALLY ISSUED" badge
    const BADGE2_W = 100, BADGE2_H = 20;
    const BADGE2_X = RCX - BADGE2_W / 2, BADGE2_Y = PAGE_H - 44;

    doc.save(); roundRect(doc, BADGE2_X, BADGE2_Y, BADGE2_W, BADGE2_H, 10);
    doc.fill(BLUE).restore();
    doc.font("Helvetica-Bold").fontSize(7).fillColor(WHITE).fillOpacity(1)
      .text("✓  OFFICIALLY ISSUED", BADGE2_X, BADGE2_Y + 6.5,
        { width: BADGE2_W, align: "center", characterSpacing: 0.8 });

    doc.end();

  } catch (err) {
    console.error("❌ downloadCertificate:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate certificate." });
    }
  }
};