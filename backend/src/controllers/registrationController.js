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