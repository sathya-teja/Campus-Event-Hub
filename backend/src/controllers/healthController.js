// controllers/healthController.js
import mongoose from "mongoose";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Registration from "../models/Registration.js";


export const getHealthStatus = async (req, res) => {
  try {
    const startTime = Date.now();

    // ── Database ─────────────────────────────────────────────────────────────
    let dbStatus = "unhealthy";
    let dbConnected = false;

    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        dbStatus = "operational";
        dbConnected = true;
      } else {
        dbStatus = "disconnected";
      }
    } catch (dbError) {
      console.error("Database health check failed:", dbError.message);
      dbStatus = "unhealthy";
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    let totalUsers = 0;
    let usersHealthy = false;
    try {
      totalUsers = await User.countDocuments();
      usersHealthy = true;
    } catch (e) { console.error("User count failed:", e.message); }

    let pendingAdmins = 0;
    try {
      pendingAdmins = await User.countDocuments({ role: "college_admin", status: "pending" });
    } catch (e) { console.error("Pending admin count failed:", e.message); }

    // ── Events ────────────────────────────────────────────────────────────────
    let totalEvents = 0;
    let eventsHealthy = false;
    try {
      totalEvents = await Event.countDocuments();
      eventsHealthy = true;
    } catch (e) { console.error("Event count failed:", e.message); }

    let activeEvents = 0;
    try {
      activeEvents = await Event.countDocuments({ endDate: { $gt: new Date() } });
    } catch (e) { console.error("Active events count failed:", e.message); }

    // ── Registrations ─────────────────────────────────────────────────────────
    let totalRegistrations = 0;
    let registrationsHealthy = false;
    try {
      totalRegistrations = await Registration.countDocuments();
      registrationsHealthy = true;
    } catch (e) { console.error("Registration count failed:", e.message); }

    // ── Build services ────────────────────────────────────────────────────────
    const services = {
      api: {
        status: "operational",           // always operational if we reach this point
        latency: `${Date.now() - startTime}ms`,
        uptime: process.uptime(),
      },
      auth: {
        status: usersHealthy ? "operational" : "unhealthy",   // relies on User model
        lastChecked: new Date().toISOString(),
      },
      database: {
        status: dbStatus,
        connected: dbConnected,
        readyState: mongoose.connection.readyState,
      },
      events: {
        status: eventsHealthy ? "operational" : "unhealthy",  // flag-based, not count-based
        totalEvents,
        activeEvents,
      },
      registrations: {
        status: registrationsHealthy ? "operational" : "unhealthy",
        totalRegistrations,
      },
      notifications: {
        status: "operational",
        sseSupported: true,
      },
      fileUpload: {
        status: "operational",
        storage: "Cloudinary/Multer configured",
      },
    };

    // ── Overall status ────────────────────────────────────────────────────────
    let overallStatus = "healthy";

    for (const service of Object.values(services)) {
      if (service.status === "unhealthy") {
        overallStatus = "unhealthy";
        break;
      }
      if (service.status === "disconnected" || service.status === "unknown") {
        overallStatus = "degraded";
      }
    }

    // Database disconnected is always critical
    if (!dbConnected) overallStatus = "unhealthy";

    res.status(200).json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      stats: {
        users: totalUsers,
        events: totalEvents,
        registrations: totalRegistrations,
        pendingAdmins,
      },
      performance: {
        responseTime: `${Date.now() - startTime}ms`,
        databaseQueryTime: `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};


export const runHealthCheck = async (req, res) => {
  try {
    const startTime = Date.now();
    const checks = [];

    // 1. Database
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        checks.push({
          service: "database",
          status: "passed",
          latency: `${Date.now() - startTime}ms`,
          details: "Connected and responding",
        });
      } else {
        checks.push({
          service: "database",
          status: "failed",
          error: `Database not connected (readyState: ${mongoose.connection.readyState})`,
        });
      }
    } catch (error) {
      checks.push({ service: "database", status: "failed", error: error.message });
    }

    // 2. Auth (User model)
    try {
      const user = await User.findOne().select("_id").lean();
      checks.push({
        service: "auth",
        status: "passed",
        details: user ? "User model accessible" : "No users found but model works",
      });
    } catch (error) {
      checks.push({ service: "auth", status: "failed", error: error.message });
    }

    // 3. Events
    try {
      const event = await Event.findOne().select("_id").lean();
      checks.push({
        service: "events",
        status: "passed",
        details: event ? "Event model accessible" : "No events yet but model works",
      });
    } catch (error) {
      checks.push({ service: "events", status: "failed", error: error.message });
    }

    // 4. Registrations
    try {
      const registration = await Registration.findOne().select("_id").lean();
      checks.push({
        service: "registrations",
        status: "passed",
        details: registration ? "Registration model accessible" : "No registrations yet but model works",
      });
    } catch (error) {
      checks.push({ service: "registrations", status: "failed", error: error.message });
    }

    // 5. API (always passes if we reach this line)
    checks.push({ service: "api", status: "passed", details: "API is responding" });

    // ── Determine final status ────────────────────────────────────────────────
    const totalLatency = Date.now() - startTime;
    const allPassed = checks.every(c => c.status === "passed");

    let finalStatus = "healthy";
    if (!allPassed) {
      const dbFailed = checks.some(c => c.service === "database" && c.status === "failed");
      finalStatus = dbFailed ? "unhealthy" : "degraded";
    }

    console.log(`✅ Health check completed: ${finalStatus.toUpperCase()} in ${totalLatency}ms`);

    res.status(200).json({
      success: true,
      status: finalStatus,
      timestamp: new Date().toISOString(),
      checks,
      totalLatency: `${totalLatency}ms`,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === "passed").length,
        failed: checks.filter(c => c.status === "failed").length,
      },
    });

  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error.message,
    });
  }
};