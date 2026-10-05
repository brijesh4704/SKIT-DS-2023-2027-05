const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["DONOR", "HOSPITAL", "BLOOD_BANK", "ADMIN"],
      default: "DONOR",
    },

    profileImage: {
      type: String,
      default: "",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    emailVerificationOTP: {
      type: String,
      default: null,
    },

    emailVerificationOTPExpires: {
      type: Date,
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    organizationVerified: {
      type: Boolean,
      default: false,
    },

    organizationVerificationStatus: {
      type: String,
      default: "NOT_REQUIRED",
    },

    organizationVerificationSource: {
      type: String,
      default: "",
    },

    organizationVerificationMessage: {
      type: String,
      default: "",
    },

    organizationVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// USER ROLE / STATUS INDEX
// ==========================================

userSchema.index({
  role: 1,
  isActive: 1,
  isVerified: 1,
});

// ==========================================
// PASSWORD RESET TOKEN INDEX
// ==========================================

userSchema.index({
  resetPasswordToken: 1,
});

module.exports = mongoose.model("User", userSchema);