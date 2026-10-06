const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");
const { verifyDocument, runAIScreening } = require("../controllers/screeningController");
const { upload } = require("../middleware/uploadMiddleware");

router.post(
  "/verify-document",
  protect,
  authorize("DONOR"),
  upload.single("medicalDocument"),
  verifyDocument
);

router.post(
  "/analyze",
  protect,
  authorize("DONOR"),
  runAIScreening
);

module.exports = router;
