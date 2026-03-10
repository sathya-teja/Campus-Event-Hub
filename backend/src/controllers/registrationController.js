import Registration from "../models/Registration.js";
import Event from "../models/Event.js";

/*
REGISTER FOR EVENT
*/
export const registerEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ message: "Event is full" });
    }

    const existing = await Registration.findOne({ userId, eventId });

    if (existing) {
      return res.status(400).json({ message: "Already registered" });
    }

    const registration = await Registration.create({
      userId,
      eventId,
      status: "pending",
    });

    res.status(201).json(registration);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/*
GET STUDENT REGISTRATIONS
*/
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user._id;

    const registrations = await Registration.find({ userId })
      .populate("eventId");

    res.json(registrations);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/*
GET EVENT PARTICIPANTS (ADMIN)
*/
export const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;

    const registrations = await Registration.find({ eventId })
      .populate("userId");

    res.json(registrations);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/*
APPROVE REGISTRATION
*/
export const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.status === "approved") {
      return res.status(400).json({ message: "Already approved" });
    }

    registration.status = "approved";
    await registration.save();

    await Event.findByIdAndUpdate(registration.eventId, {
      $inc: { currentParticipants: 1 },
    });

    res.json(registration);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/*
REJECT REGISTRATION
*/
export const rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );

    res.json(registration);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/*
CANCEL REGISTRATION
*/
export const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.status === "approved") {
      await Event.findByIdAndUpdate(registration.eventId, {
        $inc: { currentParticipants: -1 },
      });
    }

    await registration.deleteOne();

    res.json({ message: "Registration cancelled successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};