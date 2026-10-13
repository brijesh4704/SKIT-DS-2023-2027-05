const mongoose = require("mongoose");

const emergencyRequestSchema = new mongoose.Schema(
  {
    // Kis hospital/user ne request create ki
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },

    // Patient details
    patient: {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      age: {
        type: Number,
      },

      gender: {
        type: String,
        enum: ["MALE", "FEMALE", "OTHER"],
      },
    },

    // Blood requirement
    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
    },

    // Priority
    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
    },

    reason: {
      type: String,
      trim: true,
    },

    // Location
    location: {
      address: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    // Request status
    status: {
      type: String,
      enum: [
        "PENDING",
        "MATCHING",
        "NOTIFIED",
        "PARTIALLY_FULFILLED",
        "FULFILLED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "PENDING",
    },

    // AI matching info
    aiMatchingStartedAt: {
      type: Date,
      default: null,
    },

    aiMatchCompletedAt: {
      type: Date,
      default: null,
    },

    matchedDonorsCount: {
      type: Number,
      default: 0,
    },

    notifiedDonorsCount: {
      type: Number,
      default: 0,
    },

    acceptedDonorsCount: {
      type: Number,
      default: 0,
    },

    fulfilledUnits: {
      type: Number,
      default: 0,
    },

    requiredBefore: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "EmergencyRequest",
  emergencyRequestSchema
);