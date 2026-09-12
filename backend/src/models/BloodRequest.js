const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
      trim: true,
    },

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

    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      coordinates: {
        latitude: {
          type: Number,
          required: true,
        },

        longitude: {
          type: Number,
          required: true,
        },
      },
    },

    contactName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    urgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
    },

    // ==========================================
    // BLOOD REQUEST LIFECYCLE STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "OPEN",
        "DONOR_ACCEPTED",
        "IN_PROGRESS",
        "FULFILLED",
        "CANCELLED",
      ],
      default: "OPEN",
    },

    // ==========================================
    // BLOOD BANK ALLOCATION
    // ==========================================

    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reservedUnits: {
      type: Number,
      default: 0,
      min: 0,
    },

    issuedUnits: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // DONOR ACCEPT / REJECT RESPONSES
    // ==========================================

    donorResponses: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Donor",
          required: true,
        },

        status: {
          type: String,
          enum: ["PENDING", "ACCEPTED", "REJECTED"],
          default: "PENDING",
        },

        respondedAt: {
          type: Date,
          default: null,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// REQUEST STATUS + LATEST REQUESTS INDEX
// ==========================================

bloodRequestSchema.index({
  status: 1,
  createdAt: -1,
});

// ==========================================
// BLOOD REQUEST SEARCH / MATCHING INDEX
// ==========================================

bloodRequestSchema.index({
  bloodGroup: 1,
  status: 1,
  city: 1,
});

// ==========================================
// USER REQUEST HISTORY INDEX
// ==========================================

bloodRequestSchema.index({
  createdBy: 1,
  createdAt: -1,
});

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);