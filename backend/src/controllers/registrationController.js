import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { createAndSendNotification } from "./notificationController.js";
import { sendEmail, emailTemplates } from "../services/emailService.js";

/*
REGISTER FOR EVENT
*/
export const registerEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user._id;

    // Validate eventId is present and a valid ObjectId
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid or missing event ID" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if event has already ended
    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ message: "This event has already ended" });
    }

    // Soft capacity check — prevents excessive pending registrations
    if (event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ message: "Event is full" });
    }

    // Check for duplicate registration
    const existing = await Registration.findOne({ userId, eventId });
    if (existing) {
      return res.status(400).json({ message: "You are already registered for this event" });
    }

    // Just create a pending registration — participant count is updated only on approval
    try {
      const registration = await Registration.create({
        userId,
        eventId,
        status: "pending",
      });

      res.status(201).json(registration);

      // 🔔 Notify the event admin — non-blocking, after response sent
      try {
        await createAndSendNotification({
          userId: event.createdBy,
          title: "New Registration",
          message: `A student has registered for "${event.title}". Review and approve.`,
          type: "event_registered",
          link: `/dashboard/collegeadmin`,
        });
      } catch (notifError) {
        console.error("⚠️ Notification error (non-blocking):", notifError.message);
      }

    } catch (dbError) {
      // Handle race condition duplicate key error from unique index
      if (dbError.code === 11000) {
        return res.status(400).json({ message: "You are already registered for this event" });
      }
      throw dbError;
    }

  } catch (error) {
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};


/*
GET STUDENT REGISTRATIONS
*/
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user._id;

    const registrations = await Registration.find({ userId })
      .populate("eventId")
      .sort({ createdAt: -1 });

    res.json(registrations);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
};


/*
GET EVENT PARTICIPANTS (ADMIN — owner only)
*/
export const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Verify the event exists and belongs to this admin
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not own this event." });
    }

    const registrations = await Registration.find({ eventId })
      .populate("userId", "name email college phone")
      .sort({ createdAt: -1 });

    res.json(registrations);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
};


/*
APPROVE REGISTRATION
*/
export const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid registration ID" });
    }

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Verify the admin owns the event this registration belongs to
    const event = await Event.findById(registration.eventId);

    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not own this event." });
    }

    if (registration.status === "approved") {
      return res.status(400).json({ message: "Registration is already approved" });
    }

    if (registration.status === "rejected") {
      return res.status(400).json({ message: "Cannot approve a rejected registration" });
    }

    // Atomic capacity check — only increment if slots are still available
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: registration.eventId,
        $expr: { $lt: ["$currentParticipants", "$maxParticipants"] },
      },
      { $inc: { currentParticipants: 1 } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: "Event is full, cannot approve" });
    }

    registration.status = "approved";
    registration.approvedBy = req.user._id;
    await registration.save();

    res.json(registration);

    // 🔔 Notify the student — non-blocking, after response sent
    try {
      await createAndSendNotification({
        userId: registration.userId,
        title: "Registration Approved ✅",
        message: `Your registration for "${event.title}" has been approved!`,
        type: "registration_approved",
        link: `/events/${event._id}`,
      });
    } catch (notifError) {
      console.error("⚠️ Notification error (non-blocking):", notifError.message);
    }

    // 📧 Email the student — non-blocking
    try {
      const student = await User.findById(registration.userId).select("name email");
      if (student) {
        const template = emailTemplates.eventRegistered(student.name, event.title, event._id);
        await sendEmail({ to: student.email, ...template });
      }
    } catch (emailError) {
      console.error("⚠️ Email error (non-blocking):", emailError.message);
    }

  } catch (error) {
    res.status(500).json({ message: "Failed to approve registration" });
  }
};


/*
REJECT REGISTRATION
*/
export const rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid registration ID" });
    }

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Verify the admin owns the event
    const event = await Event.findById(registration.eventId);

    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not own this event." });
    }

    if (registration.status === "rejected") {
      return res.status(400).json({ message: "Registration is already rejected" });
    }

    registration.status = "rejected";
    await registration.save();

    res.json(registration);

    // 🔔 Notify the student — non-blocking, after response sent
    try {
      await createAndSendNotification({
        userId: registration.userId,
        title: "Registration Rejected ❌",
        message: `Your registration for "${event.title}" has been rejected.`,
        type: "registration_rejected",
        link: `/events/${event._id}`,
      });
    } catch (notifError) {
      console.error("⚠️ Notification error (non-blocking):", notifError.message);
    }

    // 📧 Email the student — non-blocking
    try {
      const student = await User.findById(registration.userId).select("name email");
      if (student) {
        const template = emailTemplates.registrationRejected(student.name, event.title, event._id);
        await sendEmail({ to: student.email, ...template });
      }
    } catch (emailError) {
      console.error("⚠️ Email error (non-blocking):", emailError.message);
    }

  } catch (error) {
    res.status(500).json({ message: "Failed to reject registration" });
  }
};


/*
CANCEL REGISTRATION (student cancels their own)
*/
export const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid registration ID" });
    }

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Ownership check — only the student who registered can cancel
    if (registration.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. This is not your registration." });
    }

    // Rejected registrations cannot be cancelled
    if (registration.status === "rejected") {
      return res.status(400).json({ message: "Rejected registrations cannot be cancelled" });
    }

    // If approved, decrement participant count on cancel
    if (registration.status === "approved") {
      await Event.findByIdAndUpdate(registration.eventId, {
        $inc: { currentParticipants: -1 },
      });
    }

    await registration.deleteOne();

    res.json({ message: "Registration cancelled successfully" });

    // 🔔 Notify the event admin — non-blocking, after response sent
    try {
      const event = await Event.findById(registration.eventId);
      if (event) {
        await createAndSendNotification({
          userId: event.createdBy,
          title: "Registration Cancelled",
          message: `A student has cancelled their registration for "${event.title}".`,
          type: "registration_cancelled",
          link: `/dashboard/collegeadmin`,
        });
      }
    } catch (notifError) {
      console.error("⚠️ Notification error (non-blocking):", notifError.message);
    }

  } catch (error) {
    res.status(500).json({ message: "Failed to cancel registration" });
  }
};

/*
GET TOTAL APPROVED REGISTRATIONS (for home page stats)
*/
export const getTotalRegistrations = async (req, res) => {
  try {
    const totalApproved = await Registration.countDocuments({ status: "approved" });
    const totalPending = await Registration.countDocuments({ status: "pending" });
    const totalStudents = await User.countDocuments({ role: "student" });

    res.status(200).json({
      totalApproved,
      totalPending,
      totalStudents,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registration stats" });
  }
};


/*
GET ALL REGISTRATIONS FOR ADMIN (single efficient query)
*/
export const getAllRegistrations = async (req, res) => {
  try {
    const adminId = req.user._id;

    // Single query: find all events by this admin, then all registrations in one shot
    const events = await Event.find({ createdBy: adminId }).select("_id title").lean();
    const eventIds = events.map((e) => e._id);

    const registrations = await Registration.find({ eventId: { $in: eventIds } })
      .populate("userId", "name email college phone")
      .populate("eventId", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ events, registrations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registrations" });
  }
};

import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

/*
HELPER: Format registrations data
*/
const formatRegistrationData = (registrations, eventTitle) => {
  return registrations.map((reg) => ({
    "Student Name": reg.userId?.name || "Unknown",
    "Email": reg.userId?.email || "N/A",
    "College": reg.userId?.college || "N/A",
    "Phone": reg.userId?.phone || "N/A",
    "Status": reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
    "Registered On": new Date(reg.createdAt).toLocaleDateString("en-IN"),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED EXPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a professional CSV string with a metadata header block.
 * @param {object[]} rows      - Array of flat objects (same keys = columns)
 * @param {object}   meta      - { title, generatedAt, extra[] }
 */
const buildCSV = (rows, meta) => {
  const SEP = ",";
  const q   = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const lines = [];

  // ── Metadata block (commented so spreadsheets skip it cleanly) ────────────
  lines.push(`# ${meta.title}`);
  lines.push(`# Generated: ${meta.generatedAt}`);
  (meta.extra || []).forEach((e) => lines.push(`# ${e}`));
  lines.push(""); // blank separator

  // ── Column headers ────────────────────────────────────────────────────────
  const headers = Object.keys(rows[0]);
  lines.push(headers.map(q).join(SEP));

  // ── Data rows ─────────────────────────────────────────────────────────────
  rows.forEach((row) => lines.push(headers.map((h) => q(row[h])).join(SEP)));

  lines.push(""); // trailing newline
  return lines.join("\r\n");
};

/**
 * Build a professional ExcelJS workbook.
 * @param {object[]} rows        - Array of flat objects
 * @param {string}   sheetName   - Worksheet tab name
 * @param {object}   meta        - { title, subtitle, generatedAt, extra[] }
 */
const buildExcelWorkbook = async (rows, sheetName, meta) => {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "EventHub Admin";
  wb.created  = new Date();

  const ws = wb.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  const headers = Object.keys(rows[0]);
  const BLUE    = "1E40AF";
  const LBLUE   = "EFF6FF";
  const BORDER_COLOR = { argb: "FFCBD5E1" };

  const thinBorder = {
    top:    { style: "thin", color: BORDER_COLOR },
    left:   { style: "thin", color: BORDER_COLOR },
    bottom: { style: "thin", color: BORDER_COLOR },
    right:  { style: "thin", color: BORDER_COLOR },
  };

  // ── Title row ─────────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell("A1");
  titleCell.value = meta.title;
  titleCell.font  = { name: "Calibri", bold: true, size: 16, color: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0EDFF" } };
  ws.getRow(1).height = 30;

  // ── Subtitle / meta rows ──────────────────────────────────────────────────
  let metaRowIdx = 2;
  const metaLines = [
    `Generated: ${meta.generatedAt}`,
    ...(meta.extra || []),
  ];
  metaLines.forEach((line) => {
    ws.mergeCells(metaRowIdx, 1, metaRowIdx, headers.length);
    const c = ws.getCell(metaRowIdx, 1);
    c.value = line;
    c.font  = { name: "Calibri", size: 9, color: { argb: "FF64748B" }, italic: true };
    c.alignment = { horizontal: "center" };
    ws.getRow(metaRowIdx).height = 16;
    metaRowIdx++;
  });

  // blank separator
  ws.getRow(metaRowIdx).height = 6;
  metaRowIdx++;

  // ── Column header row ─────────────────────────────────────────────────────
  const hdrRowIdx = metaRowIdx;
  const hdrRow = ws.getRow(hdrRowIdx);
  hdrRow.height = 22;
  headers.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1);
    cell.value = h;
    cell.font  = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  // ── Data rows ─────────────────────────────────────────────────────────────
  rows.forEach((row, idx) => {
    const dataRowIdx = hdrRowIdx + 1 + idx;
    const wsRow = ws.getRow(dataRowIdx);
    wsRow.height = 18;
    const isAlt = idx % 2 === 1;
    headers.forEach((h, i) => {
      const cell = wsRow.getCell(i + 1);
      cell.value = row[h] ?? "";
      cell.font  = { name: "Calibri", size: 9, color: { argb: "FF1E293B" } };
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: isAlt ? "FF" + LBLUE.replace("#","") : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", wrapText: false };
      cell.border = thinBorder;

      // Colour-code Status column
      if (h === "Status") {
        const v = String(row[h]).toLowerCase();
        cell.font = { ...cell.font, bold: true,
          color: { argb: v === "approved" ? "FF166534" : v === "rejected" ? "FF991B1B" : "FF92400E" }
        };
        cell.fill = { type: "pattern", pattern: "solid",
          fgColor: { argb: v === "approved" ? "FFDCFCE7" : v === "rejected" ? "FFFEE2E2" : "FFFEF3C7" }
        };
      }
    });
  });

  // ── Column widths (auto-fit by content) ──────────────────────────────────
  const COL_WIDTHS = {
    "Event Name":    30, "Student Name": 22, "Email":        32,
    "College":       24, "Phone":        14, "Status":       12,
    "Registered On": 16,
  };
  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = COL_WIDTHS[h] || 18;
  });

  // ── Freeze header rows ────────────────────────────────────────────────────
  ws.views = [{ state: "frozen", ySplit: hdrRowIdx, activeCell: `A${hdrRowIdx + 1}` }];

  // ── Auto-filter on header row ─────────────────────────────────────────────
  ws.autoFilter = {
    from: { row: hdrRowIdx, column: 1 },
    to:   { row: hdrRowIdx, column: headers.length },
  };

  return wb;
};

/**
 * Build a structured JSON export object.
 */
const buildJSON = (rows, meta) => ({
  report: {
    title:       meta.title,
    generatedAt: meta.generatedAt,
    ...(meta.eventTitle ? { event: meta.eventTitle } : {}),
    totalRegistrations: rows.length,
    ...(meta.totalEvents !== undefined ? { totalEvents: meta.totalEvents } : {}),
  },
  registrations: rows,
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE EVENT EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/*
EXPORT REGISTRATIONS - CSV FORMAT
*/
export const exportRegistrationsCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    const registrations = await Registration.find({ eventId })
      .populate("userId", "name email college phone")
      .sort({ createdAt: -1 });
    if (registrations.length === 0)
      return res.status(400).json({ message: "No registrations to export" });

    const data = formatRegistrationData(registrations, event.title);
    const csv  = buildCSV(data, {
      title:       `Registration Report — ${event.title}`,
      generatedAt: new Date().toLocaleDateString("en-IN"),
      extra:       [`Total Registrations: ${data.length}`],
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",
      `attachment; filename="registrations_${Date.now()}.csv"`);
    res.send("\uFEFF" + csv); // BOM so Excel opens UTF-8 correctly
  } catch (error) {
    res.status(500).json({ message: "Failed to export CSV" });
  }
};

/*
EXPORT REGISTRATIONS - EXCEL FORMAT
*/
export const exportRegistrationsExcel = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    const registrations = await Registration.find({ eventId })
      .populate("userId", "name email college phone")
      .sort({ createdAt: -1 });
    if (registrations.length === 0)
      return res.status(400).json({ message: "No registrations to export" });

    const data = formatRegistrationData(registrations, event.title);
    const wb   = await buildExcelWorkbook(data, "Registrations", {
      title:       `Registration Report — ${event.title}`,
      generatedAt: new Date().toLocaleDateString("en-IN"),
      extra:       [`Total Registrations: ${data.length}`, "Confidential — Admin Use Only"],
    });

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",
      `attachment; filename="registrations_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: "Failed to export Excel" });
  }
};

/*
EXPORT REGISTRATIONS - PDF FORMAT
*/
export const exportRegistrationsPDF = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const registrations = await Registration.find({ eventId })
      .populate("userId", "name email college phone")
      .sort({ createdAt: -1 });

    if (registrations.length === 0) {
      return res.status(400).json({ message: "No registrations to export" });
    }

    const data = formatRegistrationData(registrations, event.title);

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    let filename = `registrations_${event.title}_${Date.now()}.pdf`;
    filename = filename.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    const MARGIN      = 40;
    const PAGE_W      = doc.page.width - MARGIN * 2;   // 762 in landscape A4
    const PAGE_H      = doc.page.height;
    const HEADER_FILL = "#1e40af";
    const ALT_FILL    = "#eff6ff";
    const BORDER      = "#cbd5e1";
    const ROW_H       = 24;
    const HEADER_H    = 26;
    const PAD_X       = 6;
    const PAD_Y_HDR   = 8;
    const PAD_Y_ROW   = 7;

    // Columns — widths sum to PAGE_W (762)
    const cols = [
      { label: "Student Name", key: "Student Name", w: 150 },
      { label: "Email",        key: "Email",         w: 195 },
      { label: "College",      key: "College",       w: 160 },
      { label: "Phone",        key: "Phone",         w: 90  },
      { label: "Status",       key: "Status",        w: 77  },
      { label: "Date",         key: "Registered On", w: 90  },
    ];

    // ── helper: draw one cell background (no text) ──────────────────────────
    const fillCell = (x, y, w, h, bgColor) => {
      doc.save();
      doc.rect(x, y, w, h)
         .fillColor(bgColor)
         .strokeColor(BORDER)
         .lineWidth(0.4)
         .fillAndStroke();
      doc.restore();
    };

    // ── helper: draw text clipped inside a cell — resets cursor after ───────
    const cellText = (text, x, y, w, fontSize, fontName, color) => {
      // Measure and truncate manually so text never overflows
      doc.font(fontName).fontSize(fontSize);
      const maxW = w - PAD_X * 2;
      let t = String(text || "");
      while (t.length > 0 && doc.widthOfString(t) > maxW) {
        t = t.slice(0, -1);
      }
      if (t !== String(text || "") && t.length > 1) t = t.slice(0, -1) + "…";

      // Use doc.text with explicit x,y — MUST pass lineBreak:false and reset
      doc.save();
      doc.fillColor(color)
         .text(t, x + PAD_X, y, { lineBreak: false, width: maxW });
      doc.restore();
    };

    // ── helper: draw a full row ──────────────────────────────────────────────
    const drawTableRow = (rowValues, y, isHeader, isAlt) => {
      const h = isHeader ? HEADER_H : ROW_H;
      const textY = y + (isHeader ? PAD_Y_HDR : PAD_Y_ROW);
      const fontSize = isHeader ? 9 : 8;
      const fontName = isHeader ? "Helvetica-Bold" : "Helvetica";
      const textColor = isHeader ? "#ffffff" : "#1e293b";

      // Pass 1 — backgrounds
      let x = MARGIN;
      cols.forEach((col) => {
        const bg = isHeader ? HEADER_FILL : (isAlt ? ALT_FILL : "#ffffff");
        fillCell(x, y, col.w, h, bg);
        x += col.w;
      });

      // Pass 2 — text (separate loop so fills never obscure text)
      x = MARGIN;
      cols.forEach((col) => {
        const val = isHeader ? col.label : (rowValues[col.key] || "");
        cellText(val, x, textY, col.w, fontSize, fontName, textColor);
        x += col.w;
      });
    };

    // ── helper: draw table header row and return next Y ─────────────────────
    const drawTableHeader = (y) => {
      drawTableRow(null, y, true, false);
      return y + HEADER_H;
    };

    // ════════════════════════════════════════════════════════════════════════
    // PAGE HEADER
    // ════════════════════════════════════════════════════════════════════════
    // Blue accent bar at top
    doc.save()
       .rect(0, 0, doc.page.width, 6)
       .fillColor(HEADER_FILL)
       .fill()
       .restore();

    let curY = MARGIN + 6;

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a")
       .text("Registration Report", MARGIN, curY, { width: PAGE_W, align: "center" });
    curY += 28;

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1e40af")
       .text(event.title, MARGIN, curY, { width: PAGE_W, align: "center" });
    curY += 18;

    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
       .text(
         `Generated: ${new Date().toLocaleDateString("en-IN")}   ·   Total Registrations: ${data.length}`,
         MARGIN, curY, { width: PAGE_W, align: "center" }
       );
    curY += 20;

    // Thin divider line
    doc.save()
       .moveTo(MARGIN, curY)
       .lineTo(MARGIN + PAGE_W, curY)
       .strokeColor("#e2e8f0")
       .lineWidth(1)
       .stroke()
       .restore();
    curY += 12;

    // ════════════════════════════════════════════════════════════════════════
    // TABLE
    // ════════════════════════════════════════════════════════════════════════
    curY = drawTableHeader(curY);

    data.forEach((row, idx) => {
      // Page break — leave 50pt at bottom for footer
      if (curY + ROW_H > PAGE_H - 50) {
        doc.addPage();
        // Re-draw accent bar on new page
        doc.save().rect(0, 0, doc.page.width, 6).fillColor(HEADER_FILL).fill().restore();
        curY = MARGIN;
        curY = drawTableHeader(curY);
      }
      drawTableRow(row, curY, false, idx % 2 === 1);
      curY += ROW_H;
    });

    // ════════════════════════════════════════════════════════════════════════
    // FOOTER
    // ════════════════════════════════════════════════════════════════════════
    const footerY = PAGE_H - 30;
    doc.save()
       .moveTo(MARGIN, footerY)
       .lineTo(MARGIN + PAGE_W, footerY)
       .strokeColor("#e2e8f0")
       .lineWidth(0.5)
       .stroke()
       .restore();

    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
       .text(`Total Registrations: ${data.length}`, MARGIN, footerY + 6, { width: PAGE_W / 2 });
    doc.text("Confidential — Admin Use Only", MARGIN, footerY + 6,
             { width: PAGE_W, align: "right" });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Failed to export PDF" });
  }
};

/*
EXPORT REGISTRATIONS - JSON FORMAT
*/
export const exportRegistrationsJSON = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    const registrations = await Registration.find({ eventId })
      .populate("userId", "name email college phone")
      .sort({ createdAt: -1 });
    if (registrations.length === 0)
      return res.status(400).json({ message: "No registrations to export" });

    const data = formatRegistrationData(registrations, event.title);
    const json = buildJSON(data, {
      title:       "Registration Report",
      generatedAt: new Date().toISOString(),
      eventTitle:  event.title,
    });

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition",
      `attachment; filename="registrations_${Date.now()}.json"`);
    res.send(JSON.stringify(json, null, 2));
  } catch (error) {
    res.status(500).json({ message: "Failed to export JSON" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL EVENTS EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const getAllRegData = async (adminId) => {
  const events = await Event.find({ createdBy: adminId });
  const eventIds = events.map((e) => e._id);
  const registrations = await Registration.find({ eventId: { $in: eventIds } })
    .populate("userId", "name email college phone")
    .populate("eventId", "title")
    .sort({ createdAt: -1 });
  return { events, registrations };
};

/*
EXPORT ALL REGISTRATIONS - CSV FORMAT
*/
export const exportAllRegistrationsCSV = async (req, res) => {
  try {
    const { events, registrations } = await getAllRegData(req.user._id);
    if (registrations.length === 0)
      return res.status(400).json({ message: "No registrations to export" });

    const data = registrations.map((reg) => ({
      "Event Name":    reg.eventId?.title || "Unknown",
      "Student Name":  reg.userId?.name   || "Unknown",
      "Email":         reg.userId?.email  || "N/A",
      "College":       reg.userId?.college || "N/A",
      "Phone":         reg.userId?.phone  || "N/A",
      "Status":        reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      "Registered On": new Date(reg.createdAt).toLocaleDateString("en-IN"),
    }));

    const csv = buildCSV(data, {
      title:       "All Registrations Report",
      generatedAt: new Date().toLocaleDateString("en-IN"),
      extra: [
        `Total Events: ${events.length}`,
        `Total Registrations: ${data.length}`,
      ],
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",
      `attachment; filename="all_registrations_${Date.now()}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export CSV" });
  }
};

/*
EXPORT ALL REGISTRATIONS - EXCEL FORMAT
*/
export const exportAllRegistrationsExcel = async (req, res) => {
  try {
    const { events, registrations } = await getAllRegData(req.user._id);
    if (registrations.length === 0)
      return res.status(400).json({ message: "No registrations to export" });

    const data = registrations.map((reg) => ({
      "Event Name":    reg.eventId?.title || "Unknown",
      "Student Name":  reg.userId?.name   || "Unknown",
      "Email":         reg.userId?.email  || "N/A",
      "College":       reg.userId?.college || "N/A",
      "Phone":         reg.userId?.phone  || "N/A",
      "Status":        reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      "Registered On": new Date(reg.createdAt).toLocaleDateString("en-IN"),
    }));

    const wb = await buildExcelWorkbook(data, "All Registrations", {
      title:       "All Registrations Report",
      generatedAt: new Date().toLocaleDateString("en-IN"),
      extra: [
        `Total Events: ${events.length}   ·   Total Registrations: ${data.length}`,
        "Confidential — Admin Use Only",
      ],
    });

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",
      `attachment; filename="all_registrations_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: "Failed to export Excel" });
  }
};

/*
EXPORT ALL REGISTRATIONS - JSON FORMAT
*/
export const exportAllRegistrationsJSON = async (req, res) => {
  try {
    const { events, registrations } = await getAllRegData(req.user._id);
    if (registrations.length === 0)
      return res.status(400).json({ message: "No registrations to export" });

    const data = registrations.map((reg) => ({
      "Event Name":    reg.eventId?.title || "Unknown",
      "Student Name":  reg.userId?.name   || "Unknown",
      "Email":         reg.userId?.email  || "N/A",
      "College":       reg.userId?.college || "N/A",
      "Phone":         reg.userId?.phone  || "N/A",
      "Status":        reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      "Registered On": new Date(reg.createdAt).toLocaleDateString("en-IN"),
    }));

    const json = buildJSON(data, {
      title:       "All Registrations Report",
      generatedAt: new Date().toISOString(),
      totalEvents: events.length,
    });

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition",
      `attachment; filename="all_registrations_${Date.now()}.json"`);
    res.send(JSON.stringify(json, null, 2));
  } catch (error) {
    res.status(500).json({ message: "Failed to export JSON" });
  }
};

/*
EXPORT ALL REGISTRATIONS - PDF FORMAT
*/
export const exportAllRegistrationsPDF = async (req, res) => {
  try {
    const adminId = req.user._id;

    const events = await Event.find({ createdBy: adminId });
    const eventIds = events.map((e) => e._id);

    const registrations = await Registration.find({ eventId: { $in: eventIds } })
      .populate("userId", "name email college phone")
      .populate("eventId", "title")
      .sort({ createdAt: -1 });

    if (registrations.length === 0) {
      return res.status(400).json({ message: "No registrations to export" });
    }

    const MARGIN      = 40;
    const PAGE_W      = 841 - MARGIN * 2;  // A4 landscape width = 841pt
    const PAGE_H      = 595;               // A4 landscape height = 595pt
    const HEADER_FILL = "#1e40af";
    const ALT_FILL    = "#eff6ff";
    const BORDER      = "#cbd5e1";
    const ROW_H       = 24;
    const HEADER_H    = 26;
    const PAD_X       = 6;
    const PAD_Y_HDR   = 8;
    const PAD_Y_ROW   = 7;

    // 7 columns — widths sum to PAGE_W (761)
    const cols = [
      { label: "Event Name",   key: "Event Name",    w: 160 },
      { label: "Student Name", key: "Student Name",  w: 120 },
      { label: "Email",        key: "Email",         w: 168 },
      { label: "College",      key: "College",       w: 130 },
      { label: "Phone",        key: "Phone",         w: 80  },
      { label: "Status",       key: "Status",        w: 63  },
      { label: "Date",         key: "Registered On", w: 80  },
    ];

    const doc = new PDFDocument({ margin: MARGIN, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="all_registrations_${Date.now()}.pdf"`);
    doc.pipe(res);

    const fillCell = (x, y, w, h, bgColor) => {
      doc.save();
      doc.rect(x, y, w, h)
         .fillColor(bgColor)
         .strokeColor(BORDER)
         .lineWidth(0.4)
         .fillAndStroke();
      doc.restore();
    };

    const drawCellText = (text, x, y, w, fontSize, fontName, color) => {
      doc.font(fontName).fontSize(fontSize);
      const maxW = w - PAD_X * 2;
      let t = String(text || "");
      while (t.length > 0 && doc.widthOfString(t) > maxW) t = t.slice(0, -1);
      if (t !== String(text || "") && t.length > 1) t = t.slice(0, -1) + "…";
      doc.save();
      doc.fillColor(color).text(t, x + PAD_X, y, { lineBreak: false, width: maxW });
      doc.restore();
    };

    const drawTableRow = (rowObj, y, isHeader, isAlt) => {
      const h = isHeader ? HEADER_H : ROW_H;
      const textY = y + (isHeader ? PAD_Y_HDR : PAD_Y_ROW);
      // Pass 1: backgrounds
      let x = MARGIN;
      cols.forEach((col) => {
        fillCell(x, y, col.w, h, isHeader ? HEADER_FILL : (isAlt ? ALT_FILL : "#ffffff"));
        x += col.w;
      });
      // Pass 2: text
      x = MARGIN;
      cols.forEach((col) => {
        const val = isHeader ? col.label : (rowObj[col.key] || "");
        drawCellText(val, x, textY, col.w,
          isHeader ? 9 : 8,
          isHeader ? "Helvetica-Bold" : "Helvetica",
          isHeader ? "#ffffff" : "#1e293b");
        x += col.w;
      });
    };

    const drawTableHeader = (y) => {
      drawTableRow(null, y, true, false);
      return y + HEADER_H;
    };

    // ── Accent bar ───────────────────────────────────────────────────────────
    doc.save().rect(0, 0, 841, 6).fillColor(HEADER_FILL).fill().restore();

    let curY = MARGIN + 6;

    // ── Title ────────────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a")
       .text("All Registrations Report", MARGIN, curY, { width: PAGE_W, align: "center" });
    curY += 28;

    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
       .text(
         `Generated: ${new Date().toLocaleDateString("en-IN")}   ·   Total Events: ${events.length}   ·   Total Registrations: ${registrations.length}`,
         MARGIN, curY, { width: PAGE_W, align: "center" }
       );
    curY += 16;

    doc.save()
       .moveTo(MARGIN, curY).lineTo(MARGIN + PAGE_W, curY)
       .strokeColor("#e2e8f0").lineWidth(1).stroke()
       .restore();
    curY += 12;

    // ── Table ────────────────────────────────────────────────────────────────
    const rowData = registrations.map((reg) => ({
      "Event Name":    reg.eventId?.title || "Unknown",
      "Student Name":  reg.userId?.name   || "Unknown",
      "Email":         reg.userId?.email  || "N/A",
      "College":       reg.userId?.college || "N/A",
      "Phone":         reg.userId?.phone  || "N/A",
      "Status":        reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      "Registered On": new Date(reg.createdAt).toLocaleDateString("en-IN"),
    }));

    curY = drawTableHeader(curY);

    rowData.forEach((row, idx) => {
      if (curY + ROW_H > PAGE_H - 50) {
        doc.addPage();
        doc.save().rect(0, 0, 841, 6).fillColor(HEADER_FILL).fill().restore();
        curY = MARGIN;
        curY = drawTableHeader(curY);
      }
      drawTableRow(row, curY, false, idx % 2 === 1);
      curY += ROW_H;
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = PAGE_H - 30;
    doc.save()
       .moveTo(MARGIN, footerY).lineTo(MARGIN + PAGE_W, footerY)
       .strokeColor("#e2e8f0").lineWidth(0.5).stroke()
       .restore();
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
       .text(`Total Registrations: ${registrations.length}`, MARGIN, footerY + 6, { width: PAGE_W / 2 });
    doc.text("Confidential — Admin Use Only", MARGIN, footerY + 6,
             { width: PAGE_W, align: "right" });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Failed to export PDF" });
  }
};
/*
GET STUDENTS FOR COLLEGE ADMIN (students registered to their events)
*/
export const getMyEventStudents = async (req, res) => {
  try {
    const adminId = req.user._id;

    const events = await Event.find({ createdBy: adminId }).select("_id title").lean();
    const eventIds = events.map((e) => e._id);

    const registrations = await Registration.find({ eventId: { $in: eventIds } })
      .populate("userId", "name email college phone status createdAt")
      .populate("eventId", "title")
      .lean();

    // Deduplicate students (a student may register for multiple events)
    const studentMap = new Map();
    registrations.forEach((reg) => {
      if (reg.userId && !studentMap.has(String(reg.userId._id))) {
        studentMap.set(String(reg.userId._id), reg.userId);
      }
    });

    res.json(Array.from(studentMap.values()));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students" });
  }
};