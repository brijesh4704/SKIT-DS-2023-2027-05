require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// ===============================
// BLOOD BANK DEMO LOGIN DETAILS
// ===============================

const BLOOD_BANK_NAME = "BloodLink Central Blood Bank";
const BLOOD_BANK_EMAIL = "bloodbank.demo@bloodlink.ai";
const BLOOD_BANK_PHONE = "9123456786";
const BLOOD_BANK_PASSWORD = "BloodBank@2026!";

// ===============================
// DATABASE CONNECTION
// ===============================

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("❌ MongoDB URI nahi mila.");
  console.error(
    "Please .env me MONGO_URI / MONGODB_URI / DATABASE_URL set karo."
  );
  process.exit(1);
}

// ===============================
// CREATE / UPDATE BLOOD BANK USER
// ===============================

async function createBloodBankUser() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB connected");

    // Check existing account
    let user = await User.findOne({
      email: BLOOD_BANK_EMAIL.toLowerCase(),
    });

    const hashedPassword = await bcrypt.hash(BLOOD_BANK_PASSWORD, 12);

    if (user) {
      // Don't accidentally convert another role
      if (user.role !== "BLOOD_BANK") {
        console.error(
          `❌ Is email par already ${user.role} account exist karta hai.`
        );
        console.error(
          "Role change nahi kiya gaya. Dusra email use karo."
        );
        return;
      }

      // Update existing Blood Bank
      user.name = BLOOD_BANK_NAME;
      user.phone = BLOOD_BANK_PHONE;
      user.password = hashedPassword;

      user.isActive = true;

      // Verification bypass for demo account
      user.isVerified = true;
      user.emailVerified = true;
      user.phoneVerified = true;

      await user.save();

      console.log("♻️ Existing Blood Bank account updated.");
    } else {
      // Create new Blood Bank
      user = await User.create({
        name: BLOOD_BANK_NAME,
        email: BLOOD_BANK_EMAIL.toLowerCase(),
        phone: BLOOD_BANK_PHONE,
        password: hashedPassword,

        role: "BLOOD_BANK",

        isActive: true,

        // Demo account verification
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
      });

      console.log("🎉 New Blood Bank account created.");
    }

    console.log("\n========================================");
    console.log("🏦 BLOOD BANK LOGIN");
    console.log("========================================");
    console.log(`Name     : ${BLOOD_BANK_NAME}`);
    console.log(`Email    : ${BLOOD_BANK_EMAIL}`);
    console.log(`Password : ${BLOOD_BANK_PASSWORD}`);
    console.log(`Role     : BLOOD_BANK`);
    console.log("========================================\n");

    console.log("👉 Login API:");
    console.log("POST /api/auth/login");

    console.log("\n✅ Blood Bank login ready!");
  } catch (error) {
    console.error("\n❌ Error creating Blood Bank user:");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB disconnected");
  }
}

createBloodBankUser();