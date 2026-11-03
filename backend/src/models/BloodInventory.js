const mongoose = require("mongoose");

const bloodInventorySchema = new mongoose.Schema(
  {
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ],
    },

    unitsAvailable: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    reservedUnits: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
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

// ==========================================
// UNIQUE INVENTORY INDEX
// ==========================================
// One inventory record per blood group per blood bank

bloodInventorySchema.index(
  {
    bloodBank: 1,
    bloodGroup: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// ACTIVE INVENTORY INDEX
// ==========================================

bloodInventorySchema.index({
  bloodBank: 1,
  isActive: 1,
});

module.exports = mongoose.model(
  "BloodInventory",
  bloodInventorySchema
);