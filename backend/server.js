import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import adminRoutes from "./src/routes/adminRoutes.js";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import eventRoutes from "./src/routes/EventRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import registrationRoutes from "./src/routes/registrationRoutes.js";
import compression from "compression";      // ← add this
import passport from "./src/config/passport.js";



dotenv.config();
const app = express();

// Connect database
connectDB();

// Security middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ← add this
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "http://localhost:5000"],
      },
    },
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(compression());                     // ← add this (before body parser)


// Body parser
app.use(express.json());
// NoSQL injection sanitizer
app.use((req, res, next) => {
  if (req.body) {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// ✅ NEW: Initialize Passport (no sessions — JWT only)
app.use(passport.initialize());

// ✅ Serve uploaded images (only once)
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/", (req, res) => {
  res.status(200).send("CampusEventHub API running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/registrations", registrationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});