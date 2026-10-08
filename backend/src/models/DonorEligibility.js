const mongoose = require("mongoose");

const donorEligibilitySchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donor",
      required: true,
      unique: true,
    },

    age: {
      type: Number,
      min: 0,
      max: 100,
    },

    weight: {
      type: Number,
      min: 0,
    },

    lastDonationDate: {
      type: Date,
      default: null,
    },

    hadRecentIllness: {
      type: Boolean,
      default: false,
    },

    takingMedication: {
      type: Boolean,
      default: false,
    },

    hadRecentSurgery: {
      type: Boolean,
      default: false,
    },

    recentTattooOrPiercing: {
      type: Boolean,
      default: false,
    },

    hasChronicDisease: {
      type: Boolean,
      default: false,
    },

    recentInfection: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "ELIGIBLE",
        "TEMPORARILY_INELIGIBLE",
        "MEDICAL_REVIEW",
        "NOT_ASSESSED",
      ],
      default: "NOT_ASSESSED",
    },

    screeningStatus: {
      type: String,
      default: null,
      trim: true,
    },

    screeningSummary: {
      type: String,
      default: "",
      trim: true,
    },

    screeningFlags: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    medicalDocument: {
      name: { type: String, default: "" },
      path: { type: String, default: "" },
      sha256: { type: String, default: "" },

      // Classification confidence answers "does this look medical?"
      // It does NOT answer "is this an authentic report?"
      confidence: { type: Number, default: 0, min: 0, max: 1 },

      matchedTerms: { type: [String], default: [] },

      verificationStatus: {
        type: String,
        enum: [
          "NOT_SUBMITTED",
          "UNVERIFIED",
          "VERIFIED",
          "REJECTED",
          "UNAVAILABLE",
        ],
        default: "NOT_SUBMITTED",
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

      issuerName: {
        type: String,
        default: "",
        trim: true,
      },

      issuerId: {
        type: String,
        default: "",
        trim: true,
      },

      reportReference: {
        type: String,
        default: "",
        trim: true,
      },

      verifiedAt: { type: Date, default: null },
    },

    nextEligibleDate: {
      type: Date,
      default: null,
    },

    lastAssessmentDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// ELIGIBILITY REMINDER / DATE INDEX
// ==========================================

donorEligibilitySchema.index({
  status: 1,
  nextEligibleDate: 1,
});

module.exports = mongoose.model(
  "DonorEligibility",
  donorEligibilitySchema
);