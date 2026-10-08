const express = require("express");

const {
  getVerificationStatus,
  getTestData,
} = require("../controllers/verificationController");

const router = express.Router();

router.get(
  "/status",
  getVerificationStatus
);

router.get(
  "/test-data",
  getTestData
);

module.exports = router;
