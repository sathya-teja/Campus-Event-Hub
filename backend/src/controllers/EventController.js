import Event from "../models/Event.js";

/* ===============================
   CREATE EVENT
================================= */
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      category,
      startDate,
      endDate,
      location,
      description,
      maxParticipants,
    } = req.body;

    // Trim inputs to prevent space issues
    const titleClean = title?.trim();
    const categoryClean = category?.trim();
    const locationClean = location?.trim();
    const descriptionClean = description?.trim();

    // Validation
    if (
      !titleClean ||
      !categoryClean ||
      !startDate ||
      !endDate ||
      !locationClean ||
      !descriptionClean
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (!maxParticipants || isNaN(maxParticipants) || Number(maxParticipants) < 1) {
      return res.status(400).json({
        message: "Max participants must be at least 1",
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        message: "End date must be after start date",
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const event = await Event.create({
      title: titleClean,
      category: categoryClean,
      startDate,
      endDate,
      location: locationClean,
      description: descriptionClean,
      maxParticipants: Number(maxParticipants),
      image: req.file
        ? req.file.path.replace(/\\/g, "/")
        : null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/* ===============================
   GET ALL EVENTS
================================= */
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ startDate: 1 })
      .populate("createdBy", "name college");

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch events",
      error: error.message,
    });
  }
};

/* ===============================
   GET SINGLE EVENT
================================= */
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name college");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch event",
      error: error.message,
    });
  }
};

/* ===============================
   UPDATE EVENT
================================= */
export const updateEvent = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Ownership check
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const {
      title,
      category,
      startDate,
      endDate,
      location,
      description,
    } = req.body;

    // Trim inputs
    const titleClean = title?.trim();
    const categoryClean = category?.trim();
    const locationClean = location?.trim();
    const descriptionClean = description?.trim();

    // Date validation (only if both provided)
    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      return res.status(400).json({
        message: "End date must be after start date",
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        ...(titleClean && { title: titleClean }),
        ...(categoryClean && { category: categoryClean }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(locationClean && { location: locationClean }),
        ...(descriptionClean && { description: descriptionClean }),
        ...(req.file && {
          image: req.file.path.replace(/\\/g, "/"),
        }),
      },
      { new: true }
    );

    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update event",
      error: error.message,
    });
  }
};

/* ===============================
   DELETE EVENT
================================= */
export const deleteEvent = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await event.deleteOne();

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete event",
      error: error.message,
    });
  }
};

// EventController.js — add this new function
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id })
      .sort({ startDate: 1 })
      .populate("createdBy", "name college");
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
};