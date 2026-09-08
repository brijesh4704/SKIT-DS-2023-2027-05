const mongoose = require("mongoose");

const bloodBankSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    bloodBankName: {
      type: String,
      required: true,
      trim: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    eraktkoshId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    firstRegistrationDate: {
      type: Date,
      default: null,
    },

    licenseStartDate: {
      type: Date,
      default: null,
    },

    licenseEndDate: {
      type: Date,
      default: null,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    dghsSupported: {
      type: String,
      default: "",
      trim: true,
    },

    componentFacility: {
      type: String,
      default: "",
      trim: true,
    },

    apheresisFacility: {
      type: String,
      default: "",
      trim: true,
    },

    helplineNumber: {
      type: String,
      default: "",
      trim: true,
    },

    numberOfBeds: {
      type: Number,
      default: 0,
      min: 0,
    },

    donorTypes: {
      type: [String],
      default: [],
    },

    donationTypes: {
      type: [String],
      default: [],
    },

    componentTypes: {
      type: [String],
      default: [],
    },

    bagTypes: {
      type: [String],
      default: [],
    },

    ttiTypes: {
      type: [String],
      default: [],
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

    pincode: String,

    coordinates: {
      latitude: Number,
      longitude: Number,
    },

    contactPerson: {
      name: String,
      designation: String,
      phone: String,
    },

    operatingHours: {
      type: String,
      default: "24/7",
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

module.exports = mongoose.model("BloodBank", bloodBankSchema);