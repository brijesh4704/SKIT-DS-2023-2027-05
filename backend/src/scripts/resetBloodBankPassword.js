const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

const EMAIL = "bloodbank.demo@bloodlink.ai";
const NEW_PASSWORD = "BloodBank@123";

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const user = await User.findOne({ email: EMAIL });

    if (!user) {
      console.log("❌ Blood Bank user not found");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    user.password = hashedPassword;

    await user.save();

    console.log("================================");
    console.log("✅ PASSWORD RESET SUCCESSFULLY");
    console.log("Email:", EMAIL);
    console.log("Password:", NEW_PASSWORD);
    console.log("================================");

    process.exit(0);

  } catch (error) {
    console.error("❌ Password reset failed:");
    console.error(error);
    process.exit(1);
  }
}

resetPassword();