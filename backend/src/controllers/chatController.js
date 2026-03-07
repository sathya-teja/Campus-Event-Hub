import { getChatResponse } from "../services/aiService.js";

const MAX_MESSAGE_LENGTH = 500;

export const chatHandler = async (req, res) => {
  try {
    const { message } = req.body;

    // Validate presence
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    const trimmed = message.trim();

    // Validate not empty after trim
    if (!trimmed) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Validate length
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
      });
    }

    const response = await getChatResponse(trimmed, req.user);

    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Chat failed" });
  }
};