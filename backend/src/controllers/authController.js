const User = require("../models/User");
const Donor = require("../models/Donor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ==========================================
// CONFIG
// ==========================================

const JWT_EXPIRES_IN = "7d";
const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;

// Publicly allowed registration roles.
// ADMIN must NEVER be created through public registration.
const PUBLIC_REGISTRATION_ROLES = [
  "DONOR",
  "HOSPITAL",
  "BLOOD_BANK",
];

// ==========================================
// HELPER - GENERATE JWT
// ==========================================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// ==========================================
// DONOR REGISTER
// ==========================================
// @route   POST /api/auth/register/donor
// @access  Public

const registerDonor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      bloodGroup,
      dateOfBirth,
      gender,
      city,
      state,
      pincode,
      latitude,
      longitude,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !bloodGroup ||
      !city ||
      !state
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, phone, password, blood group, city and state are required",
      });
    }

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User already exists with this email or phone",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "DONOR",
    });

    // ==========================================
    // BUILD GEOJSON POINT
    // ==========================================

    const hasValidCoordinates =
      latitude !== undefined &&
      latitude !== null &&
      longitude !== undefined &&
      longitude !== null &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude));

    const coordinates = {
      latitude:
        latitude !== undefined
          ? Number(latitude)
          : undefined,

      longitude:
        longitude !== undefined
          ? Number(longitude)
          : undefined,
    };

    // GeoJSON uses:
    // [longitude, latitude]

    if (hasValidCoordinates) {
      coordinates.geoPoint = {
        type: "Point",
        coordinates: [
          Number(longitude),
          Number(latitude),
        ],
      };
    }

    // ==========================================
    // CREATE DONOR PROFILE
    // ==========================================

    const donor = await Donor.create({
      user: user._id,

      bloodGroup,

      dateOfBirth:
        dateOfBirth || null,

      gender,

      location: {
        city,
        state,
        pincode,
        coordinates,
      },
    });

    // ==========================================
    // GENERATE JWT
    // ==========================================

    const token = generateToken(user);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "Donor registered successfully",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },

      donor,
    });
  } catch (error) {
    console.error(
      "Donor Register Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while registering donor",
    });
  }
};

// ==========================================
// REGISTER USER
// ==========================================
// @route   POST /api/auth/register
// @access  Public

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields",
      });
    }

    // ==========================================
    // ROLE SECURITY
    // ==========================================

    const requestedRole =
      role || "DONOR";

    // ADMIN can NEVER be created
    // through this public endpoint.
    if (
      !PUBLIC_REGISTRATION_ROLES.includes(
        requestedRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This role cannot be registered through the public endpoint",
      });
    }

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser =
      await User.findOne({
        $or: [{ email }, { phone }],
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User already exists with this email or phone",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: requestedRole,
    });

    // ==========================================
    // GENERATE JWT
    // ==========================================

    const token = generateToken(user);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "User registered successfully",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while registering user",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================
// @route   POST /api/auth/login
// @access  Public

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // ==========================================
    // FIND USER
    // ==========================================

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // ==========================================
    // ACCOUNT STATUS
    // ==========================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive. Please contact support.",
      });
    }

    // ==========================================
    // PASSWORD CHECK
    // ==========================================

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // ==========================================
    // GENERATE JWT
    // ==========================================

    const token = generateToken(user);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while logging in",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================
// @route   POST /api/auth/forgot-password
// @access  Public

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email,
    });

    // ==========================================
    // GENERIC RESPONSE
    // Prevent email enumeration
    // ==========================================

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been generated.",
      });
    }

    // ==========================================
    // GENERATE RESET TOKEN
    // ==========================================

    const resetToken =
      crypto.randomBytes(32).toString("hex");

    // ==========================================
    // HASH TOKEN BEFORE STORAGE
    // ==========================================

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    user.resetPasswordToken =
      hashedToken;

    user.resetPasswordExpires =
      Date.now() +
      RESET_TOKEN_EXPIRES_MS;

    await user.save();

    // ==========================================
    // PRODUCTION
    // ==========================================
    //
    // In production this token should be sent
    // through a trusted email/SMS provider.
    //
    // Never expose the raw token in production.
    // ==========================================

    const response = {
      success: true,

      message:
        "If an account exists with this email, a password reset token has been generated.",

      expiresIn:
        "15 minutes",
    };

    // ==========================================
    // DEVELOPMENT ONLY
    // ==========================================

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      response.resetToken =
        resetToken;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while processing forgot password request",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================
// @route   POST /api/auth/reset-password/:token
// @access  Public

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and new password are required",
      });
    }

    // ==========================================
    // PASSWORD VALIDATION
    // ==========================================

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters long",
      });
    }

    // ==========================================
    // HASH INCOMING TOKEN
    // ==========================================

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    // ==========================================
    // FIND VALID TOKEN
    // ==========================================

    const user = await User.findOne({
      resetPasswordToken:
        hashedToken,

      resetPasswordExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token",
      });
    }

    // ==========================================
    // HASH NEW PASSWORD
    // ==========================================

    user.password =
      await bcrypt.hash(password, 10);

    // ==========================================
    // CLEAR RESET TOKEN
    // ==========================================

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login again.",
    });
  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  registerUser,
  registerDonor,
  loginUser,
  forgotPassword,
  resetPassword,
};