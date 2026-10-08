const User = require("../models/User");
const Donor = require("../models/Donor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");

const Hospital = require("../models/Hospital");
const BloodBank = require("../models/Bloodbank");

const { sendEmailOTP } = require("../services/emailService");
const {
  verifyHospital,
  verifyBloodBank,
  sha256File,
} = require("../services/verificationService");

// ==========================================
// CONFIG
// ==========================================

const JWT_EXPIRES_IN = "7d";

const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;

const EMAIL_OTP_EXPIRES_MS = 10 * 60 * 1000;

// Publicly allowed registration roles.
// ADMIN must NEVER be created through public registration.
const PUBLIC_REGISTRATION_ROLES = [
  "DONOR",
  "HOSPITAL",
  "BLOOD_BANK",
];

// ==========================================
// HELPER - GENERATE JWT
// ==========================================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// ==========================================
// HELPER - GENERATE OTP
// ==========================================

const generateOTP = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

// ==========================================
// HELPER - HASH OTP
// ==========================================

const hashOTP = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

// ==========================================
// DONOR REGISTER
// ==========================================
// @route   POST /api/auth/register/donor
// @access  Public

const registerDonor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      bloodGroup,
      dateOfBirth,
      gender,
      city,
      state,
      pincode,
      latitude,
      longitude,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !bloodGroup ||
      !city ||
      !state
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, phone, password, blood group, city and state are required",
      });
    }

    // ==========================================
    // NORMALIZE EMAIL
    // ==========================================

    const normalizedEmail =
      email.toLowerCase().trim();

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User already exists with this email or phone",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: "DONOR",

      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
    });

    // ==========================================
    // BUILD GEOJSON POINT
    // ==========================================

    const hasValidCoordinates =
      latitude !== undefined &&
      latitude !== null &&
      longitude !== undefined &&
      longitude !== null &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude));

    const coordinates = {
      latitude:
        latitude !== undefined
          ? Number(latitude)
          : undefined,

      longitude:
        longitude !== undefined
          ? Number(longitude)
          : undefined,
    };

    // GeoJSON uses:
    // [longitude, latitude]

    if (hasValidCoordinates) {
      coordinates.geoPoint = {
        type: "Point",
        coordinates: [
          Number(longitude),
          Number(latitude),
        ],
      };
    }

    // ==========================================
    // CREATE DONOR PROFILE
    // ==========================================

    const donor = await Donor.create({
      user: user._id,

      bloodGroup,

      dateOfBirth:
        dateOfBirth || null,

      gender,

      location: {
        city,
        state,
        pincode,
        coordinates,
      },
    });

    // ==========================================
    // GENERATE EMAIL OTP
    // ==========================================

    const otp = generateOTP();

    const hashedOTP = hashOTP(otp);

    user.emailVerificationOTP =
      hashedOTP;

    user.emailVerificationOTPExpires =
      Date.now() + EMAIL_OTP_EXPIRES_MS;

    await user.save();

    // ==========================================
    // SEND EMAIL OTP
    // ==========================================

    await sendEmailOTP(
      user.email,
      otp
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "Donor registration successful. Please verify your email using the OTP sent to your email.",

      requiresEmailVerification: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },

      donor,
    });
  } catch (error) {
    console.error(
      "Donor Register Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while registering donor",
    });
  }
};

// ==========================================
// REGISTER USER
// ==========================================
// @route   POST /api/auth/register
// @access  Public

const registerUser = async (req, res) => {
  let createdUser = null;
  let createdOrganization = null;

  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      registrationNumber,
      hfrId,
      registrationAuthority,
      address,
      city,
      state,
      pincode,
      contactPersonName,
      contactPersonDesignation,
      officialEmail,
      website,
      ownershipType,
      facilityType,
      numberOfBeds,
      licenseNumber,
      eraktkoshId,
      dghsSupported,
      componentFacility,
      apheresisFacility,
      helplineNumber,
      donorTypes,
      donationTypes,
      componentTypes,
      bagTypes,
      ttiTypes,
      firstRegistrationDate,
      licenseStartDate,
      licenseEndDate,
      category,
    } = req.body;

    const requestedRole = role || "DONOR";

    if (
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    if (
      !PUBLIC_REGISTRATION_ROLES.includes(
        requestedRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This role cannot be registered through the public endpoint",
      });
    }

    const existingUser =
      await User.findOne({
        $or: [
          { email: normalizedEmail },
          { phone },
        ],
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User already exists with this email or phone",
      });
    }

    // =====================================================
    // ORGANIZATION VERIFICATION
    // =====================================================
    // Hospital/Blood Bank registration is NOT accepted merely
    // because a user uploaded a certificate. The submitted
    // identity is checked against the configured trusted
    // registry adapter before a user account is created.
    // =====================================================

    let organizationVerification = {
      verified: false,
      status: "NOT_REQUIRED",
      source: "",
      message: "",
    };

    let organizationDocument = null;

    if (
      requestedRole === "HOSPITAL" ||
      requestedRole === "BLOOD_BANK"
    ) {
      organizationDocument =
        req.files?.organizationDocument?.[0] ||
        req.files?.licenseDocument?.[0] ||
        null;

      if (!organizationDocument) {
        return res.status(400).json({
          success: false,
          code: "ORGANIZATION_DOCUMENT_REQUIRED",
          message:
            "An official hospital/blood-bank registration or licence document is required.",
        });
      }

      if (
        requestedRole === "HOSPITAL" &&
        (!registrationNumber ||
          !hfrId ||
          !address ||
          !city ||
          !state)
      ) {
        return res.status(400).json({
          success: false,
          code: "HOSPITAL_DETAILS_REQUIRED",
          message:
            "Hospital HFR ID, registration number, address, city and state are required.",
        });
      }

      if (
        requestedRole === "BLOOD_BANK" &&
        (!licenseNumber ||
          !address ||
          !city ||
          !state)
      ) {
        return res.status(400).json({
          success: false,
          code: "BLOOD_BANK_DETAILS_REQUIRED",
          message:
            "Blood-bank licence number, address, city and state are required.",
        });
      }

      const commonOrganizationInput = {
        city,
        state,
        pincode,
        officialEmail:
          officialEmail ||
          normalizedEmail,
      };

      if (requestedRole === "HOSPITAL") {
        organizationVerification =
          await verifyHospital({
            ...commonOrganizationInput,
            hospitalName: name,
            hfrId,
            registrationNumber,
            registrationAuthority,
            documentSha256:
              sha256File(
                organizationDocument.path
              ),
          });
      } else {
        organizationVerification =
          await verifyBloodBank({
            ...commonOrganizationInput,
            bloodBankName: name,
            eraktkoshId,
            licenseNumber,
            licenseStartDate,
            licenseEndDate,
            documentSha256:
              sha256File(
                organizationDocument.path
              ),
          });
      }

      if (!organizationVerification.verified) {
        // The uploaded certificate is never treated as proof by
        // itself. Keep the failed file only when the caller needs
        // to inspect it during development; otherwise remove it.
        if (
          organizationDocument.path &&
          fs.existsSync(organizationDocument.path)
        ) {
          try {
            fs.unlinkSync(organizationDocument.path);
          } catch {}
        }

        const statusCode =
          organizationVerification.status ===
          "UNAVAILABLE"
            ? 503
            : 422;

        return res.status(statusCode).json({
          success: false,
          code:
            organizationVerification.status ===
            "UNAVAILABLE"
              ? "VERIFICATION_PROVIDER_UNAVAILABLE"
              : "ORGANIZATION_NOT_VERIFIED",
          verificationStatus:
            organizationVerification.status,
          verificationSource:
            organizationVerification.source,
          message:
            organizationVerification.message ||
            "The organization could not be independently verified.",
        });
      }
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    createdUser = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: requestedRole,

      isVerified: false,
      emailVerified: false,
      phoneVerified: false,

      organizationVerified:
        requestedRole === "DONOR"
          ? false
          : organizationVerification.verified,

      organizationVerificationStatus:
        requestedRole === "DONOR"
          ? "NOT_REQUIRED"
          : organizationVerification.status,

      organizationVerificationSource:
        organizationVerification.source || "",

      organizationVerificationMessage:
        organizationVerification.message || "",

      organizationVerifiedAt:
        organizationVerification.verified
          ? new Date()
          : null,
    });

    // =====================================================
    // CREATE VERIFIED ORGANIZATION PROFILE
    // =====================================================

    if (requestedRole === "HOSPITAL") {
      const documentHash =
        sha256File(organizationDocument.path);

      createdOrganization =
        await Hospital.create({
          user: createdUser._id,
          hospitalName: name,
          registrationNumber,
          hfrId,
          registrationAuthority,
          officialEmail:
            officialEmail ||
            normalizedEmail,
          website: website || "",
          ownershipType: ownershipType || "",
          facilityType: facilityType || "",
          numberOfBeds:
            Number.isFinite(Number(numberOfBeds))
              ? Number(numberOfBeds)
              : 0,
          address,
          city,
          state,
          pincode,
          contactPerson: {
            name:
              contactPersonName ||
              name,
            designation:
              contactPersonDesignation ||
              "Authorized Representative",
            phone,
          },
          registrationDocument: {
            name:
              organizationDocument.originalname,
            path:
              organizationDocument.path,
            sha256: documentHash,
            uploadedAt: new Date(),
          },
          isVerified: true,
          isActive: true,
          verificationStatus: "VERIFIED",
          verificationSource:
            organizationVerification.source,
          verificationMessage:
            organizationVerification.message,
          verifiedAt: new Date(),
        });
    }

    if (requestedRole === "BLOOD_BANK") {
      const documentHash =
        sha256File(organizationDocument.path);

      createdOrganization =
        await BloodBank.create({
          user: createdUser._id,
          bloodBankName: name,
          licenseNumber,
          eraktkoshId:
            eraktkoshId || "",
          firstRegistrationDate:
            firstRegistrationDate || null,
          licenseStartDate:
            licenseStartDate || null,
          licenseEndDate:
            licenseEndDate || null,
          category: category || "",
          dghsSupported: dghsSupported || "",
          componentFacility: componentFacility || "",
          apheresisFacility: apheresisFacility || "",
          helplineNumber: helplineNumber || "",
          numberOfBeds:
            Number.isFinite(Number(numberOfBeds))
              ? Number(numberOfBeds)
              : 0,
          donorTypes:
            Array.isArray(donorTypes)
              ? donorTypes
              : donorTypes
              ? String(donorTypes)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [],
          donationTypes:
            Array.isArray(donationTypes)
              ? donationTypes
              : donationTypes
              ? String(donationTypes)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [],
          componentTypes:
            Array.isArray(componentTypes)
              ? componentTypes
              : componentTypes
              ? String(componentTypes)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [],
          bagTypes:
            Array.isArray(bagTypes)
              ? bagTypes
              : bagTypes
              ? String(bagTypes)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [],
          ttiTypes:
            Array.isArray(ttiTypes)
              ? ttiTypes
              : ttiTypes
              ? String(ttiTypes)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [],
          officialEmail:
            officialEmail ||
            normalizedEmail,
          address,
          city,
          state,
          pincode,
          contactPerson: {
            name:
              contactPersonName ||
              name,
            designation:
              contactPersonDesignation ||
              "Authorized Representative",
            phone,
          },
          registrationDocument: {
            name:
              organizationDocument.originalname,
            path:
              organizationDocument.path,
            sha256: documentHash,
            uploadedAt: new Date(),
          },
          isVerified: true,
          isActive: true,
          verificationStatus: "VERIFIED",
          verificationSource:
            organizationVerification.source,
          verificationMessage:
            organizationVerification.message,
          verifiedAt: new Date(),
        });
    }

    // =====================================================
    // EMAIL OTP
    // =====================================================

    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);

    createdUser.emailVerificationOTP =
      hashedOTP;

    createdUser.emailVerificationOTPExpires =
      Date.now() + EMAIL_OTP_EXPIRES_MS;

    await createdUser.save();

    await sendEmailOTP(
      createdUser.email,
      otp
    );

    return res.status(201).json({
      success: true,

      message:
        requestedRole === "DONOR"
          ? "Registration successful. Please verify your email using the OTP sent to your email."
          : "Organization verified and registered successfully. Please verify your email using the OTP sent to your email.",

      requiresEmailVerification: true,

      organizationVerification:
        requestedRole === "DONOR"
          ? null
          : {
              status:
                organizationVerification.status,
              verified:
                organizationVerification.verified,
              source:
                organizationVerification.source,
              message:
                organizationVerification.message,
            },

      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role,
        organizationVerified:
          createdUser.organizationVerified,
      },
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error
    );

    // Best-effort rollback so a half-created account is
    // never left behind when organization profile creation fails.
    try {
      const failedDocument =
        req.files?.organizationDocument?.[0] ||
        req.files?.licenseDocument?.[0];

      if (
        failedDocument?.path &&
        fs.existsSync(failedDocument.path)
      ) {
        fs.unlinkSync(failedDocument.path);
      }
      if (createdOrganization?._id) {
        await createdOrganization.deleteOne();
      }

      if (createdUser?._id) {
        await User.findByIdAndDelete(
          createdUser._id
        );
      }
    } catch (rollbackError) {
      console.error(
        "Registration rollback failed:",
        rollbackError.message
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while registering user",
    });
  }
};


  // ==========================================
// LOGIN
// ==========================================
// @route   POST /api/auth/login
// @access  Public

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // ==========================================
    // NORMALIZE EMAIL
    // ==========================================

    const normalizedEmail =
      email.toLowerCase().trim();

    // ==========================================
    // FIND USER
    // ==========================================

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // ==========================================
    // EMAIL NOT FOUND
    // ==========================================

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "EMAIL_NOT_FOUND",
        message:
          "No account found with this email address. Please check the email or create a new account.",
      });
    }

    // ==========================================
    // ACCOUNT STATUS
    // ==========================================

    // Only explicitly inactive accounts are blocked.
    // This prevents older users with undefined
    // isActive from being treated as inactive.

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message:
          "Your account is inactive. Please contact support.",
      });
    }

    // ==========================================
    // PASSWORD CHECK
    // ==========================================

    if (!user.password) {
      return res.status(500).json({
        success: false,
        code: "PASSWORD_NOT_CONFIGURED",
        message:
          "This account does not have a valid password configured. Please contact support.",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    // ==========================================
    // WRONG PASSWORD
    // ==========================================

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        code: "PASSWORD_INCORRECT",
        message:
          "Incorrect password. Please check your password or use Forgot password.",
      });
    }

    // ==========================================
    // EMAIL VERIFICATION CHECK
    // ==========================================

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,

        message:
          "Please verify your email before logging in.",

        requiresEmailVerification: true,

        email: user.email,
      });
    }

    // ==========================================
    // PHONE VERIFICATION CHECK
    // ==========================================
    // Phone OTP will be implemented next.
    //
    // For now we do NOT block login based on
    // phoneVerified because phone verification
    // has not been implemented yet.

    // ==========================================
    // GENERATE JWT
    // ==========================================

    const token =
      generateToken(user);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,

        emailVerified:
          user.emailVerified,

        isVerified:
          user.isVerified,

        organizationVerified:
          user.organizationVerified,

        organizationVerificationStatus:
          user.organizationVerificationStatus,
      },
    });

  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while logging in",
    });
  }
};

// ==========================================
// VERIFY EMAIL OTP
// ==========================================
// @route   POST /api/auth/verify-email-otp
// @access  Public

const verifyEmailOTP = async (req, res) => {
  try {
    const {
      email,
      otp,
    } = req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    // ==========================================
    // OTP FORMAT
    // ==========================================

    if (
      !/^\d{6}$/.test(
        String(otp)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP must be a 6-digit number",
      });
    }

    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      await User.findOne({
        email:
          email.toLowerCase().trim(),
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    // ==========================================
    // ALREADY VERIFIED
    // ==========================================

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already verified",
      });
    }

    // ==========================================
    // CHECK OTP EXISTS
    // ==========================================

    if (
      !user.emailVerificationOTP ||
      !user.emailVerificationOTPExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No active OTP found. Please request a new OTP.",
      });
    }

    // ==========================================
    // CHECK OTP EXPIRY
    // ==========================================

    if (
      Date.now() >
      new Date(
        user.emailVerificationOTPExpires
      ).getTime()
    ) {
      user.emailVerificationOTP =
        null;

      user.emailVerificationOTPExpires =
        null;

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    // ==========================================
    // HASH PROVIDED OTP
    // ==========================================

    const hashedOTP =
      hashOTP(String(otp));

    // ==========================================
    // COMPARE OTP
    // ==========================================

    if (
      hashedOTP !==
      user.emailVerificationOTP
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid OTP",
      });
    }

    // ==========================================
    // VERIFY EMAIL
    // ==========================================

    user.emailVerified = true;

    // isVerified becomes true only after
    // both email and phone are verified.
    //
    // Phone verification will be added next.

    user.isVerified =
      user.emailVerified &&
      user.phoneVerified;

    // ==========================================
    // CLEAR OTP
    // ==========================================

    user.emailVerificationOTP =
      null;

    user.emailVerificationOTPExpires =
      null;

    await user.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "Email verified successfully",

      emailVerified:
        user.emailVerified,

      phoneVerified:
        user.phoneVerified,

      isVerified:
        user.isVerified,
    });
  } catch (error) {
    console.error(
      "Verify Email OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while verifying email",
    });
  }
};

// ==========================================
// RESEND EMAIL OTP
// ==========================================
// @route   POST /api/auth/resend-email-otp
// @access  Public

const resendEmailOTP = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    // ==========================================
    // REQUIRED FIELD
    // ==========================================

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    // ==========================================
    // GENERIC RESPONSE
    // ==========================================
    // Prevent account enumeration.

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a new OTP has been sent.",
      });
    }

    // ==========================================
    // ALREADY VERIFIED
    // ==========================================

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already verified",
      });
    }

    // ==========================================
    // GENERATE NEW OTP
    // ==========================================

    const otp =
      generateOTP();

    const hashedOTP =
      hashOTP(otp);

    // ==========================================
    // SAVE OTP
    // ==========================================

    user.emailVerificationOTP =
      hashedOTP;

    user.emailVerificationOTPExpires =
      Date.now() +
      EMAIL_OTP_EXPIRES_MS;

    await user.save();

    // ==========================================
    // SEND OTP
    // ==========================================

    await sendEmailOTP(
      user.email,
      otp
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "A new verification OTP has been sent to your email.",

      expiresIn:
        "10 minutes",
    });
  } catch (error) {
    console.error(
      "Resend Email OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resending OTP",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================
// @route   POST /api/auth/forgot-password
// @access  Public

const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }

    const user =
      await User.findOne({
        email:
          email.toLowerCase().trim(),
      });

    // ==========================================
    // GENERIC RESPONSE
    // Prevent email enumeration
    // ==========================================

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been generated.",
      });
    }

    // ==========================================
    // GENERATE RESET TOKEN
    // ==========================================

    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    // ==========================================
    // HASH TOKEN BEFORE STORAGE
    // ==========================================

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    user.resetPasswordToken =
      hashedToken;

    user.resetPasswordExpires =
      Date.now() +
      RESET_TOKEN_EXPIRES_MS;

    await user.save();

    // ==========================================
    // PRODUCTION
    // ==========================================
    //
    // In production this token should be sent
    // through a trusted email/SMS provider.
    //
    // Never expose the raw token in production.
    // ==========================================

    const response = {
      success: true,

      message:
        "If an account exists with this email, a password reset token has been generated.",

      expiresIn:
        "15 minutes",
    };

    // ==========================================
    // DEVELOPMENT ONLY
    // ==========================================

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      response.resetToken =
        resetToken;
    }

    return res.status(200).json(
      response
    );
  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while processing forgot password request",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================
// @route   POST /api/auth/reset-password/:token
// @access  Public

const resetPassword = async (
  req,
  res
) => {
  try {
    const { token } =
      req.params;

    const { password } =
      req.body;

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and new password are required",
      });
    }

    // ==========================================
    // PASSWORD VALIDATION
    // ==========================================

    if (
      password.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters long",
      });
    }

    // ==========================================
    // HASH INCOMING TOKEN
    // ==========================================

    const hashedToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    // ==========================================
    // FIND VALID TOKEN
    // ==========================================

    const user =
      await User.findOne({
        resetPasswordToken:
          hashedToken,

        resetPasswordExpires: {
          $gt: Date.now(),
        },
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token",
      });
    }

    // ==========================================
    // HASH NEW PASSWORD
    // ==========================================

    user.password =
      await bcrypt.hash(
        password,
        10
      );

    // ==========================================
    // CLEAR RESET TOKEN
    // ==========================================

    user.resetPasswordToken =
      null;

    user.resetPasswordExpires =
      null;

    await user.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login again.",
    });
  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  registerUser,
  registerDonor,
  loginUser,

  verifyEmailOTP,
  resendEmailOTP,

  forgotPassword,
  resetPassword,
};