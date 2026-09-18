const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  registerUser,
  registerDonor,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const validate = require("../middleware/validate");

const {
  registerSchema,
  donorRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authValidator");

const router = express.Router();

// ===============================
// AUTH RATE LIMITER
// ===============================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
});

// ===============================
// SWAGGER DOCUMENTATION
// ===============================

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new BloodLink AI user account.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             name: "Test User"
 *             email: "test@example.com"
 *             phone: "9876543210"
 *             password: "StrongPassword123"
 *             role: "HOSPITAL"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  validate(registerSchema),
  registerUser
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user and returns a JWT token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             email: "test@example.com"
 *             password: "StrongPassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Internal server error
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  loginUser
);

/**
 * @swagger
 * /api/auth/register/donor:
 *   post:
 *     summary: Register a donor
 *     description: Creates a new donor account with donor profile and location information.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             name: "Test Donor"
 *             email: "donor@example.com"
 *             phone: "9876543210"
 *             password: "StrongPassword123"
 *             bloodGroup: "B-"
 *             dateOfBirth: "2002-05-15"
 *             gender: "MALE"
 *             city: "Jaipur"
 *             state: "Rajasthan"
 *             pincode: "302001"
 *             latitude: 26.9124
 *             longitude: 75.7873
 *     responses:
 *       201:
 *         description: Donor registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Donor or user already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register/donor",
  validate(donorRegisterSchema),
  registerDonor
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Generates a password reset token for the specified account.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             email: "test@example.com"
 *     responses:
 *       200:
 *         description: Password reset request processed
 *       400:
 *         description: Validation failed
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: Reset password
 *     description: Resets the user's password using a valid reset token.
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             password: "NewStrongPassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post(
  "/reset-password/:token",
  authLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

module.exports = router;