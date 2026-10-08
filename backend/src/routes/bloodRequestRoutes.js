const express = require("express");

const router = express.Router();

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");
const validateObjectId = require("../middleware/validateObjectId");

const {
  bloodRequestSchema,
} = require("../validators/bloodRequestValidator");

const {
  createBloodRequest,
  getBloodRequests,
  getMyHospitalBloodRequests,
  getMatchingDonors,
  respondToBloodRequest,
  getDonorResponses,

  // NEW
  getBloodBanks,
  assignBloodBank,

  updateBloodRequestStatus,
  deleteBloodRequest,
  getDonorAvailableRequests,
} = require("../controllers/bloodRequestController");

// ======================================================
// SWAGGER DOCUMENTATION
// ======================================================

/**
 * @swagger
 * tags:
 *   - name: Blood Requests
 *     description: Blood request and request lifecycle APIs
 */

/**
 * @swagger
 * /api/blood-requests:
 *   post:
 *     summary: Create a blood request
 *     description: Creates a new blood request and notifies compatible available donors.
 *     tags: [Blood Requests]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  protect,
  validate(bloodRequestSchema),
  createBloodRequest
);

/**
 * @swagger
 * /api/blood-requests:
 *   get:
 *     summary: Get open blood requests
 *     description: Returns currently open blood requests accessible to the authenticated user.
 *     tags: [Blood Requests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  protect,
  getBloodRequests
);

// ======================================================
// MY HOSPITAL BLOOD REQUESTS
// ======================================================

router.get(
  "/my",
  protect,
  authorize("HOSPITAL"),
  getMyHospitalBloodRequests
);

// ======================================================
// DONOR AVAILABLE BLOOD REQUESTS
// ======================================================

router.get(
  "/donor/available",
  protect,
  authorize("DONOR"),
  getDonorAvailableRequests
);

// ======================================================
// BLOOD BANK DIRECTORY
// ======================================================
// Hospital/Admin can get available Blood Banks
// ======================================================

router.get(
  "/blood-banks",
  protect,
  authorize("HOSPITAL", "ADMIN"),
  getBloodBanks
);

// ======================================================
// AI MATCHING
// ======================================================

router.get(
  "/:id/matches",
  protect,
  validateObjectId("id"),
  getMatchingDonors
);

// ======================================================
// DONOR RESPONSES
// ======================================================

router.get(
  "/:id/responses",
  protect,
  validateObjectId("id"),
  getDonorResponses
);

// ======================================================
// DONOR ACCEPT / REJECT
// ======================================================

router.patch(
  "/:id/respond",
  protect,
  authorize("DONOR"),
  validateObjectId("id"),
  respondToBloodRequest
);

// ======================================================
// ASSIGN BLOOD BANK
// ======================================================
// Hospital/Admin assigns a Blood Bank to a request
// ======================================================

router.patch(
  "/:id/assign-blood-bank",
  protect,
  authorize("HOSPITAL", "ADMIN"),
  validateObjectId("id"),
  assignBloodBank
);

// ======================================================
// UPDATE BLOOD REQUEST STATUS
// ======================================================

router.patch(
  "/:id/status",
  protect,
  authorize(
    "HOSPITAL",
    "BLOOD_BANK",
    "ADMIN"
  ),
  validateObjectId("id"),
  updateBloodRequestStatus
);

// ======================================================
// DELETE BLOOD REQUEST
// ======================================================

router.delete(
  "/:id",
  protect,
  validateObjectId("id"),
  deleteBloodRequest
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;