const express = require("express");

const router = express.Router();

const {
  getDonorProfile,
  updateDonorProfile,
  updateAvailability,
  searchDonors,
  recordDonation,
} = require("../controllers/donorController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");

const validateQuery = require("../middleware/validateQuery");

const {
  updateDonorProfileSchema,
  updateAvailabilitySchema,
  searchDonorSchema,
} = require("../validators/donorValidator");

// ======================================================
// SWAGGER DOCUMENTATION
// ======================================================

/**
 * @swagger
 * tags:
 *   - name: Donors
 *     description: Donor management APIs
 */

/**
 * @swagger
 * /api/donors/search:
 *   get:
 *     summary: Search for compatible donors
 *     description: Searches available donors using blood group, location, radius and availability filters.
 *     tags: [Donors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         required: false
 *         schema:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         description: Required blood group
 *       - in: query
 *         name: city
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter donors by city
 *       - in: query
 *         name: latitude
 *         required: false
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Search center latitude
 *       - in: query
 *         name: longitude
 *         required: false
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Search center longitude
 *       - in: query
 *         name: radius
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 500
 *         description: Search radius in kilometers
 *       - in: query
 *         name: emergencyAvailable
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter donors available for emergencies
 *       - in: query
 *         name: isAvailable
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter currently available donors
 *     responses:
 *       200:
 *         description: Donor search completed successfully
 *       400:
 *         description: Query validation failed
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/search",
  protect,
  validateQuery(searchDonorSchema),
  searchDonors
);

/**
 * @swagger
 * /api/donors/profile:
 *   get:
 *     summary: Get donor profile
 *     description: Returns the profile of the currently authenticated donor.
 *     tags: [Donors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Donor profile retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Donor role required
 *       404:
 *         description: Donor profile not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/profile",
  protect,
  authorize("DONOR"),
  getDonorProfile
);

/**
 * @swagger
 * /api/donors/profile:
 *   put:
 *     summary: Update donor profile
 *     description: Updates profile, blood group, personal details and location information of the authenticated donor.
 *     tags: [Donors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bloodGroup:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *           example:
 *             bloodGroup: "B-"
 *             city: "Jaipur"
 *             state: "Rajasthan"
 *             pincode: "302001"
 *             latitude: 26.9124
 *             longitude: 75.7873
 *     responses:
 *       200:
 *         description: Donor profile updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Donor role required
 *       404:
 *         description: Donor profile not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/profile",
  protect,
  authorize("DONOR"),
  validate(updateDonorProfileSchema),
  updateDonorProfile
);

/**
 * @swagger
 * /api/donors/availability:
 *   patch:
 *     summary: Update donor availability
 *     description: Updates the donor's normal and emergency availability status.
 *     tags: [Donors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *               emergencyAvailable:
 *                 type: boolean
 *           example:
 *             isAvailable: true
 *             emergencyAvailable: true
 *     responses:
 *       200:
 *         description: Donor availability updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Donor role required
 *       404:
 *         description: Donor not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/availability",
  protect,
  authorize("DONOR"),
  validate(updateAvailabilitySchema),
  updateAvailability
);

/**
 * @swagger
 * /api/donors/donate:
 *   post:
 *     summary: Record a blood donation
 *     description: Allows an authenticated donor to submit a blood donation for verification.
 *     tags: [Donors]
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
 *             units: 1
 *             donationDate: "2026-09-12"
 *             donationCenter: "BloodLink Blood Bank"
 *     responses:
 *       201:
 *         description: Donation recorded successfully
 *       400:
 *         description: Donation validation failed or donor is not eligible
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Donor role required
 *       404:
 *         description: Donor not found
 *       409:
 *         description: Duplicate donation
 *       500:
 *         description: Internal server error
 */
router.post(
  "/donate",
  protect,
  authorize("DONOR"),
  recordDonation
);

module.exports = router;