const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

require("dotenv").config();

const connectDB = require("./config/db");

// ==========================================
// ROUTES
// ==========================================

const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const bloodRequestRoutes = require("./routes/bloodRequestRoutes");
const pushRoutes = require("./routes/pushRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const eligibilityRoutes = require("./routes/eligibilityRoutes");
const donationRoutes = require("./routes/donationRoutes");
const bloodInventoryRoutes = require("./routes/bloodInventoryRoutes");
const hospitalInventoryRoutes = require("./routes/hospitalInventoryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bloodBatchRoutes = require("./routes/bloodBatchRoutes");
const aiMatchingRoutes = require("./routes/aiMatchingRoutes");
const matchHistoryRoutes = require("./routes/matchHistoryRoutes");
const mlRoutes = require("./routes/mlRoutes");
const screeningRoutes = require("./routes/screeningRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const adminAlertRoutes = require("./routes/adminAlertRoutes");
const adminRiskRoutes = require("./routes/adminRiskRoutes");
// Analytics route
const analyticsRoutes = require("./routes/analyticsRoutes");
const verificationRoutes = require("./routes/verificationRoutes");

// ==========================================
// MIDDLEWARE
// ==========================================

const errorMiddleware = require("./middleware/errorMiddleware");
const notFoundMiddleware = require("./middleware/notFoundMiddleware");

// ==========================================
// BACKGROUND JOBS
// ==========================================

const startBloodExpiryJob = require("../jobs/bloodExpiryJob");
const startEligibilityReminderJob = require("../jobs/eligibilityReminderJob");

// ==========================================
// APP
// ==========================================

const app = express();

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(helmet());

app.use(express.json());

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

app.use("/api/donors", donorRoutes);

app.use("/api/blood-requests", bloodRequestRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/push", pushRoutes);

app.use("/api/eligibility", eligibilityRoutes);

app.use("/api/donations", donationRoutes);

app.use("/api/inventory", bloodInventoryRoutes);

// Hospital-owned blood inventory (separate from blood-bank inventory)
app.use("/api/blood-inventory", hospitalInventoryRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/blood-batches", bloodBatchRoutes);

app.use("/api/ai", aiMatchingRoutes);

app.use("/api/match-history", matchHistoryRoutes);

app.use("/api/ml", mlRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/screening", screeningRoutes);

app.use("/api/verification", verificationRoutes);

// ==========================================
// AUDIT LOGS
// ==========================================

app.use(
  "/api/admin/audit-logs",
  auditLogRoutes
);

app.use("/api/admin/alerts", adminAlertRoutes);

app.use("/api/admin/risk", adminRiskRoutes);



// ==========================================
// TEST ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BloodLink AI Backend is running 🩸🤖",
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "BloodLink AI API",
  });
});

// ==========================================
// SWAGGER API DOCS
// ==========================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// ==========================================
// 404 NOT FOUND HANDLER
// ==========================================

app.use(notFoundMiddleware);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(errorMiddleware);

// ==========================================
// SERVER STARTUP
// ==========================================

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // Connect MongoDB first
    await connectDB();

    // Start background jobs only after DB connection
    startBloodExpiryJob();
    startEligibilityReminderJob();

    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log(
        `🩸 BloodLink AI Backend running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = async (signal) => {
  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    console.log("HTTP server closed.");

    try {
      const mongoose = require("mongoose");

      await mongoose.connection.close();

      console.log("MongoDB connection closed.");

      process.exit(0);
    } catch (error) {
      console.error(
        "Error while closing MongoDB:",
        error.message
      );

      process.exit(1);
    }
  });
};

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});