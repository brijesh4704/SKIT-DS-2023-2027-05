const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const verificationRoutes = require("./routes/verificationRoutes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/verification", verificationRoutes);

module.exports = app;
