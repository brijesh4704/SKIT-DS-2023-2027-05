const express = require("express");

const router = express.Router();

const {
  createBloodBatch,
  getMyBloodBatches,
  updateExpiredBatches,
  updateBloodBatch,
} = require("../controllers/bloodBatchController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");

const validateObjectId = require("../middleware/validateObjectId");

const {
  createBloodBatchSchema,
  updateBloodBatchSchema,
} = require("../validators/bloodBatchValidator");

// ======================================================
// SWAGGER DOCUMENTATION
// ======================================================

/**
 * @swagger
 * tags:
 *   - name: Blood Batches
 *     description: Blood batch and expiry management APIs
 */

/**
 * @swagger
 * /api/blood-batches:
 *   post:
 *     summary: Create a blood batch
 *     description: Creates a new blood batch and adds its units to the blood bank inventory.
 *     tags: [Blood Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             batchNumber: "BATCH-2026-001"
 *             bloodGroup: "B-"
 *             units: 5
 *             collectionDate: "2026-09-12"
 *             expiryDate: "2026-11-05"
 *     responses:
 *       201:
 *         description: Blood batch created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       409:
 *         description: Duplicate batch number
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  validate(createBloodBatchSchema),
  createBloodBatch
);

/**
 * @swagger
 * /api/blood-batches/my:
 *   get:
 *     summary: Get blood batches
 *     description: Returns blood batches belonging to the authenticated blood bank. Administrators can access batches across blood banks.
 *     tags: [Blood Batches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blood batches retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/my",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  getMyBloodBatches
);

/**
 * @swagger
 * /api/blood-batches/update-expired:
 *   patch:
 *     summary: Update expired blood batches
 *     description: Finds expired blood batches and updates their status and inventory accordingly.
 *     tags: [Blood Batches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired blood batches processed successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/update-expired",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  updateExpiredBatches
);

/**
 * @swagger
 * /api/blood-batches/{id}:
 *   patch:
 *     summary: Update a blood batch
 *     description: Updates a blood batch belonging to the authenticated blood bank. Administrators can update batches across blood banks.
 *     tags: [Blood Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blood batch MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             expiryDate: "2026-11-10"
 *             status: "ACTIVE"
 *     responses:
 *       200:
 *         description: Blood batch updated successfully
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       404:
 *         description: Blood batch not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  validateObjectId("id"),
  validate(updateBloodBatchSchema),
  updateBloodBatch
);

module.exports = router;