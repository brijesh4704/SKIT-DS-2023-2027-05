const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("./config/db");
const EligibilityRule = require("./models/EligibilityRule");

const seedRules = async () => {
  try {
    await connectDB();

    await EligibilityRule.findOneAndUpdate(
      { ruleKey: "BLOOD_DONATION_WAITING" },
      {
        ruleKey: "BLOOD_DONATION_WAITING",
        ruleName: "Blood Donation Waiting Period",
        description:
          "Minimum waiting period between blood donations.",
        waitingDays: 90,
        isActive: true,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("✅ Eligibility rules seeded successfully");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding eligibility rules:", error);
    process.exit(1);
  }
};

seedRules();