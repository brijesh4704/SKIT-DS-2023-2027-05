const express = require("express");

const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");

const {
  saveEligibilitySchema,
} = require("../validators/eligibilityValidator");

const {
  saveEligibilityProfile,
  assessEligibility,
  getMyEligibility,
} = require("../controllers/eligibilityController");

// ======================================================
// SWAGGER DOCUMENTATION
// ======================================================

/**
 * @swagger
 * tags:
 *   - name: Eligibility
 *     description: Donor eligibility assessment APIs
 */

/**
 * @swagger
 * /api/eligibility:
 *   post:
 *     summary: Save donor eligibility profile
 *     description: Saves or updates the authenticated donor's health and eligibility questionnaire.
 *     tags: [Eligibility]
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
 *             age: 24
 *             weight: 65
 *             lastDonationDate: null
 *             hadRecentIllness: false
 *             takingMedication: false
 *             hadRecentSurgery: false
 *             recentTattooOrPiercing: false
 *             hasChronicDisease: false
 *             recentInfection: false
 *     responses:
 *       200:
 *         description: Eligibility profile saved successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Donor role required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  protect,
  authorize("DONOR"),
  validate(saveEligibilitySchema),
  saveEligibilityProfile
);


router.get(
  "/me",
  protect,
  authorize("DONOR"),
  getMyEligibility
);

/**
 * @swagger
 * /api/eligibility/assess:
 *   post:
 *     summary: Assess donor eligibility
 *     description: Evaluates the authenticated donor's eligibility using the configured eligibility rules and returns the assessment result.
 *     tags: [Eligibility]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Eligibility assessment completed successfully
 *       400:
 *         description: Eligibility information is incomplete or invalid
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Donor role required
 *       404:
 *         description: Eligibility profile not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/assess",
  protect,
  authorize("DONOR"),
  assessEligibility
);

module.exports = router;