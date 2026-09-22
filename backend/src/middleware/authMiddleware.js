const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===============================
// PROTECT ROUTES
// ===============================
const protect = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // ===============================
    // CHECK ACCOUNT STATUS
    // ===============================
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    // In production, organization accounts must have passed
    // independent organization verification before protected
    // hospital/blood-bank functionality is exposed. This is
    // opt-in so existing local development accounts are not
    // unexpectedly locked during migration.
    if (
      process.env.ENFORCE_ORG_VERIFICATION === "true" &&
      ["HOSPITAL", "BLOOD_BANK"].includes(user.role) &&
      !user.organizationVerified
    ) {
      return res.status(403).json({
        success: false,
        code: "ORGANIZATION_NOT_VERIFIED",
        message:
          "This organization account has not passed independent verification.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// ===============================
// AUTHORIZE ROLES
// ===============================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this route.",
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};