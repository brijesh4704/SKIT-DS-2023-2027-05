const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    hfrId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    registrationAuthority: {
      type: String,
      default: "",
      trim: true,
    },

    officialEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    ownershipType: {
      type: String,
      default: "",
      trim: true,
    },

    facilityType: {
      type: String,
      default: "",
      trim: true,
    },

    numberOfBeds: {
      type: Number,
      default: 0,
      min: 0,
    },

    registrationDocument: {
      name: { type: String, default: "" },
      path: { type: String, default: "" },
      sha256: { type: String, default: "" },
      uploadedAt: { type: Date, default: null },
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "UNAVAILABLE"],
      default: "PENDING",
    },

    verificationSource: {
      type: String,
      default: "",
      trim: true,
    },

    verificationMessage: {
      type: String,
      default: "",
      trim: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    address: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    pincode: {
      type: String,
    },

    coordinates: {
      latitude: Number,
      longitude: Number,
    },

    contactPerson: {
      name: String,
      designation: String,
      phone: String,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hospital", hospitalSchema);