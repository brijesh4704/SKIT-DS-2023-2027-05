const Joi = require("joi");

const updateDonorProfileSchema = Joi.object({
  bloodGroup: Joi.string()
    .valid(
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-"
    )
    .optional(),

  dateOfBirth: Joi.date()
    .iso()
    .max("now")
    .optional(),

  gender: Joi.string()
    .valid("MALE", "FEMALE", "OTHER")
    .optional(),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  state: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

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

  coordinates: Joi.object({
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .required(),

    longitude: Joi.number()
      .min(-180)
      .max(180)
      .required(),
  }).optional(),

  emergencyAvailable: Joi.boolean()
    .optional(),
});

const updateAvailabilitySchema = Joi.object({
  isAvailable: Joi.boolean()
    .optional(),

  emergencyAvailable: Joi.boolean()
    .optional(),
}).or("isAvailable", "emergencyAvailable");

const searchDonorSchema = Joi.object({
  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
    .optional(),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional(),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional(),

  radius: Joi.number()
    .min(1)
    .max(500)
    .optional(),

  emergencyAvailable: Joi.boolean()
    .optional(),

  isAvailable: Joi.boolean()
    .optional()
});

module.exports = {
  updateDonorProfileSchema,
  updateAvailabilitySchema,
  searchDonorSchema
};