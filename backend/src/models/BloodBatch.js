const mongoose = require("mongoose");

const bloodBatchSchema = new mongoose.Schema(
  {
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },

    unitsCollected: {
      type: Number,
      required: true,
      min: 1,
    },

    unitsAvailable: {
      type: Number,
      required: true,
      min: 0,
    },

    collectionDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "EXPIRED", "DEPLETED"],
      default: "AVAILABLE",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ==========================================
// UNIQUE BATCH INDEX
// ==========================================
// Same batch number should not be duplicated
// within the same blood bank

bloodBatchSchema.index(
  {
    bloodBank: 1,
    batchNumber: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// EXPIRY MANAGEMENT INDEX
// ==========================================
// Useful for finding batches that are expiring

bloodBatchSchema.index({
  expiryDate: 1,
  status: 1,
});

// ==========================================
// ACTIVE BLOOD STOCK INDEX
// ==========================================
// Useful for finding available batches
// for a specific blood bank and blood group

bloodBatchSchema.index({
  bloodBank: 1,
  bloodGroup: 1,
  status: 1,
  isActive: 1,
});

module.exports = mongoose.model("BloodBatch", bloodBatchSchema);