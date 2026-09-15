const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  registerUser,
  registerDonor,
  loginUser,
  verifyEmailOTP,
  resendEmailOTP,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const validate = require("../middleware/validate");
const { upload } = require("../middleware/uploadMiddleware");

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

  // Development me testing ke liye high limit
  // Production me security limit
  max: process.env.NODE_ENV === "production" ? 10 : 1000,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again after 15 minutes.",
  },
});

// ===============================
// SWAGGER DOCUMENTATION
// ===============================

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and verification APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new BloodLink AI user account and sends an email verification OTP.
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
 *         description: User registered successfully and verification OTP sent
 *       400:
 *         description: Validation failed
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */

router.post(
  "/register",
  upload.fields([
    {
      name: "organizationDocument",
      maxCount: 1,
    },
    {
      name: "licenseDocument",
      maxCount: 1,
    },
  ]),
  validate(registerSchema),
  registerUser
);

/**
 * @swagger
 * /api/auth/register/donor:
 *   post:
 *     summary: Register a donor
 *     description: Creates a new donor account and sends an email verification OTP.
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
 *         description: Donor registered successfully and verification OTP sent
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
 * /api/auth/verify-email-otp:
 *   post:
 *     summary: Verify email OTP
 *     description: Verifies the 6-digit OTP sent to the user's email address.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */

router.post(
  "/verify-email-otp",
  authLimiter,
  verifyEmailOTP
);

/**
 * @swagger
 * /api/auth/resend-email-otp:
 *   post:
 *     summary: Resend email verification OTP
 *     description: Generates and sends a new email verification OTP.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "test@example.com"
 *     responses:
 *       200:
 *         description: New OTP sent
 *       400:
 *         description: Email already verified
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */

router.post(
  "/resend-email-otp",
  authLimiter,
  resendEmailOTP
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a verified user and returns a JWT token.
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
 *       403:
 *         description: Email verification required
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

// ===============================
// EXPORT ROUTER
// ===============================

module.exports = router;