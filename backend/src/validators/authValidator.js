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

  // ADMIN intentionally excluded
  role: Joi.string()
    .valid(...publicRoles)
    .default("DONOR"),
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

  bloodGroup: Joi.string()
    .valid(...bloodGroups)
    .required(),

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