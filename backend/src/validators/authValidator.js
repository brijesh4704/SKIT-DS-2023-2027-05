const Joi = require("joi");

// ==========================================
// COMMON VALUES
// ==========================================

const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "UNKNOWN",
];

const publicRoles = [
  "DONOR",
  "HOSPITAL",
  "BLOOD_BANK",
];

// ==========================================
// REGISTER USER
// ==========================================

const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Please provide a valid 10-digit Indian phone number.",
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required(),

  role: Joi.string()
    .valid(...publicRoles)
    .default("DONOR"),

  // Hospital verification identity
  hfrId: Joi.string()
    .trim()
    .max(100)
    .when("role", {
      is: "HOSPITAL",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  registrationNumber: Joi.string()
    .trim()
    .max(120)
    .when("role", {
      is: "HOSPITAL",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  registrationAuthority: Joi.string()
    .trim()
    .max(150)
    .optional(),

  // Organization details
  address: Joi.string()
    .trim()
    .max(500)
    .when("role", {
      is: Joi.valid("HOSPITAL", "BLOOD_BANK"),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .when("role", {
      is: Joi.valid("HOSPITAL", "BLOOD_BANK"),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  state: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .when("role", {
      is: Joi.valid("HOSPITAL", "BLOOD_BANK"),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .optional(),

  officialEmail: Joi.string()
    .trim()
    .lowercase()
    .email()
    .optional(),

  contactPersonName: Joi.string()
    .trim()
    .max(100)
    .optional(),

  contactPersonDesignation: Joi.string()
    .trim()
    .max(120)
    .optional(),

  website: Joi.string()
    .trim()
    .uri()
    .optional(),

  // Blood-bank verification identity
  licenseNumber: Joi.string()
    .trim()
    .max(120)
    .when("role", {
      is: "BLOOD_BANK",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  eraktkoshId: Joi.string()
    .trim()
    .max(120)
    .optional(),

  firstRegistrationDate: Joi.date()
    .iso()
    .optional(),

  licenseStartDate: Joi.date()
    .iso()
    .optional(),

  licenseEndDate: Joi.date()
    .iso()
    .greater(Joi.ref("licenseStartDate"))
    .optional(),

  category: Joi.string()
    .trim()
    .max(120)
    .optional(),

  dghsSupported: Joi.string()
    .trim()
    .max(50)
    .optional(),

  componentFacility: Joi.string()
    .trim()
    .max(50)
    .optional(),

  apheresisFacility: Joi.string()
    .trim()
    .max(50)
    .optional(),

  helplineNumber: Joi.string()
    .trim()
    .max(30)
    .optional(),

  donorTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(100)),
      Joi.string().max(1000)
    )
    .optional(),

  donationTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(100)),
      Joi.string().max(1000)
    )
    .optional(),

  componentTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(100)),
      Joi.string().max(2000)
    )
    .optional(),

  bagTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(100)),
      Joi.string().max(2000)
    )
    .optional(),

  ttiTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(100)),
      Joi.string().max(1000)
    )
    .optional(),
});

// ==========================================
// DONOR REGISTER
// ==========================================

const donorRegisterSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Please provide a valid 10-digit Indian phone number.",
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .required(),

  // Blood group is optional during registration.
  // UNKNOWN means donor does not know it yet.
  bloodGroup: Joi.string()
    .valid(...bloodGroups)
    .default("UNKNOWN"),

  dateOfBirth: Joi.date()
    .iso()
    .max("now")
    .optional(),

  gender: Joi.string()
    .valid(
      "MALE",
      "FEMALE",
      "OTHER"
    )
    .optional(),

  // Location
  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  state: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Please provide a valid 6-digit pincode.",
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional(),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional(),

  isAvailable: Joi.boolean()
    .optional(),

  emergencyAvailable: Joi.boolean()
    .optional(),
});

// ==========================================
// LOGIN
// ==========================================

const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  password: Joi.string()
    .min(6)
    .max(128)
    .required(),
});

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),
});

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(6)
    .max(128)
    .required(),
});

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  registerSchema,
  donorRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};