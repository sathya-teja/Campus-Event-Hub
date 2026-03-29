import mongoose from "mongoose";
import crypto from "crypto";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";



/*
========================================
📲 GET QR CODE  (student only)
GET /api/registrations/:id/qr
========================================
*/
export const getQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid registration ID" });
    }

    const registration = await Registration.findById(id).lean();

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. This is not your registration." });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({ message: "QR code is only available for approved registrations." });
    }

    const event = await Event.findById(registration.eventId).lean();

    if (!event) {
      return res.status(404).json({ message: "Associated event not found." });
    }

    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ message: "This event has already ended." });
    }

    let { qrToken } = registration;

    if (!qrToken) {
      qrToken = crypto.randomBytes(32).toString("hex");
      await Registration.findByIdAndUpdate(id, { qrToken });
    }

    // Compact payload: "<registrationId>.<qrToken>"
    // Much shorter than a JWT — produces a low-density QR that scans fast.
    const qrPayload = `${registration._id.toString()}.${qrToken}`;

    return res.status(200).json({ qrPayload });

  } catch (error) {
    console.error("❌ getQRCode error:", error.message);
    return res.status(500).json({ message: "Failed to generate QR code." });
  }
};

/*
========================================
🎫 GET FULL TICKET  (student only)
GET /api/registrations/:id/ticket
Returns QR payload + event details + student name for the ticket page
========================================
*/
export const getTicket = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid registration ID" });
    }

    const registration = await Registration.findById(id)
      .populate("userId", "name email college profileImage")
      .populate("eventId", "title location startDate endDate category image")
      .lean();

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. This is not your registration." });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({ message: "Ticket is only available for approved registrations." });
    }

    const event = registration.eventId;

    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ message: "This event has already ended." });
    }

    // Generate / reuse the qrToken
    let { qrToken, attendanceCode, attendanceCodeExpiry } = registration;
    const updates = {};

    if (!qrToken) {
      qrToken = crypto.randomBytes(32).toString("hex");
      updates.qrToken = qrToken;
    }

    // Generate / refresh attendance code
    // Refresh if missing or expired (within 1 hour of expiry)
    const codeExpired = !attendanceCodeExpiry || new Date(attendanceCodeExpiry) < new Date();
    if (!attendanceCode || codeExpired) {
      attendanceCode       = Math.floor(100000 + Math.random() * 900000).toString();
      attendanceCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      updates.attendanceCode       = attendanceCode;
      updates.attendanceCodeExpiry = attendanceCodeExpiry;
    }

    if (Object.keys(updates).length > 0) {
      await Registration.findByIdAndUpdate(id, updates);
    }

    const qrPayload = `${registration._id.toString()}.${qrToken}`;

    return res.status(200).json({
      qrPayload,
      attendanceCode,
      attended   : registration.attended,
      attendedAt : registration.attendedAt,
      student    : registration.userId,
      event      : {
        _id       : event._id,
        title     : event.title,
        location  : event.location,
        startDate : event.startDate,
        endDate   : event.endDate,
        category  : event.category,
        image     : event.image,
      },
    });

  } catch (error) {
    console.error("❌ getTicket error:", error.message);
    return res.status(500).json({ message: "Failed to load ticket." });
  }
};

/*
========================================
📷 SCAN QR CODE  (college_admin only)
POST /api/registrations/scan
Body: { qrPayload: "<signed JWT>" }
========================================
*/
export const scanQR = async (req, res) => {
  try {
    const { qrPayload } = req.body;

    if (!qrPayload || typeof qrPayload !== "string" || qrPayload.trim() === "") {
      return res.status(400).json({ message: "QR payload is required." });
    }

    // Parse compact payload: "<registrationId>.<qrToken>"
    const dotIndex = qrPayload.trim().indexOf(".");
    if (dotIndex === -1) {
      return res.status(401).json({ message: "Invalid QR code. Scan failed." });
    }
    const registrationId = qrPayload.trim().slice(0, dotIndex);
    const qrToken        = qrPayload.trim().slice(dotIndex + 1);

    if (!mongoose.Types.ObjectId.isValid(registrationId) || !qrToken) {
      return res.status(400).json({ message: "Malformed QR payload." });
    }

    const registration = await Registration.findById(registrationId).populate("userId", "name email");

    if (!registration) return res.status(404).json({ message: "Registration not found." });

    if (!registration.qrToken || registration.qrToken !== qrToken) {
      return res.status(401).json({ message: "QR code is no longer valid." });
    }

    const event = await Event.findById(registration.eventId);

    if (!event) return res.status(404).json({ message: "Event not found." });

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not manage this event." });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({
        message: `Cannot mark attendance — registration is ${registration.status}.`,
      });
    }

    const now      = new Date();
    const eventEnd = new Date(event.endDate);

    // Only block scanning after the event has fully ended
    if (now > eventEnd) {
      return res.status(400).json({ message: "This event has already ended. Attendance cannot be marked." });
    }

    if (registration.attended) {
      return res.status(400).json({
        message: `Attendance already marked for ${registration.userId.name} at ${new Date(registration.attendedAt).toLocaleString("en-IN")}.`,
      });
    }

    registration.attended   = true;
    registration.attendedAt = new Date();
    await registration.save();

    return res.status(200).json({
      message    : "Attendance marked successfully.",
      student    : { name: registration.userId.name, email: registration.userId.email },
      event      : { title: event.title },
      attendedAt : registration.attendedAt,
    });

  } catch (error) {
    console.error("❌ scanQR error:", error.message);
    return res.status(500).json({ message: "Scan failed. Please try again." });
  }
};

/*
========================================
📊 GET ATTENDANCE FOR AN EVENT  (college_admin only)
GET /api/registrations/attendance/:eventId
========================================
*/
export const getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }

    const event = await Event.findById(eventId).lean();

    if (!event) return res.status(404).json({ message: "Event not found." });

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not manage this event." });
    }

    const registrations = await Registration.find({ eventId, status: "approved" })
      .populate("userId", "name email college phone profileImage")
      .sort({ attended: -1, createdAt: 1 })
      .lean();

    const data = registrations.map((r) => ({
      registrationId : r._id,
      student        : r.userId,
      attended       : r.attended,
      attendedAt     : r.attendedAt,
    }));

    return res.status(200).json({
      eventTitle    : event.title,
      totalApproved : data.length,
      totalAttended : data.filter((d) => d.attended).length,
      registrations : data,
    });

  } catch (error) {
    console.error("❌ getEventAttendance error:", error.message);
    return res.status(500).json({ message: "Failed to fetch attendance." });
  }
};
/*
========================================
🔢 VERIFY ATTENDANCE CODE  (college_admin only)
POST /api/registrations/verify-code
Body: { code: "482916", eventId: "..." }
Fallback when QR scan fails — admin types the
6-digit code shown on the student's ticket.
========================================
*/
export const verifyAttendanceCode = async (req, res) => {
  try {
    const { code, eventId } = req.body;

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({ message: "Please enter a valid 6-digit code." });
    }

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }

    const event = await Event.findById(eventId).lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You do not manage this event." });
    }

    if (new Date(event.endDate) < new Date()) {
      return res.status(400).json({ message: "This event has already ended. Attendance cannot be marked." });
    }

    const registration = await Registration.findOne({
      attendanceCode: code.trim(),
      eventId,
    }).populate("userId", "name email profileImage");

    if (!registration) {
      return res.status(404).json({ message: "Invalid code. No matching registration found." });
    }

    if (!registration.attendanceCodeExpiry || new Date(registration.attendanceCodeExpiry) < new Date()) {
      return res.status(401).json({ message: "This code has expired. Ask the student to refresh their ticket." });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({
        message: `Cannot mark attendance — registration is ${registration.status}.`,
      });
    }

    if (registration.attended) {
      return res.status(400).json({
        message: `Attendance already marked for ${registration.userId.name} at ${new Date(registration.attendedAt).toLocaleString("en-IN")}.`,
      });
    }

    registration.attended   = true;
    registration.attendedAt = new Date();
    await registration.save();

    return res.status(200).json({
      message    : "Attendance marked successfully.",
      student    : { name: registration.userId.name, email: registration.userId.email },
      event      : { title: event.title },
      attendedAt : registration.attendedAt,
    });

  } catch (error) {
    console.error("❌ verifyAttendanceCode error:", error.message);
    return res.status(500).json({ message: "Failed to verify code. Please try again." });
  }
};