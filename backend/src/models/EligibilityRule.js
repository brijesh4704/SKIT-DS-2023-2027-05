const mongoose = require("mongoose");

const eligibilityRuleSchema = new mongoose.Schema(
  {
    ruleKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    ruleName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    waitingDays: {
      type: Number,
      min: 0,
      default: 0,
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

module.exports = mongoose.model(
  "EligibilityRule",
  eligibilityRuleSchema
);