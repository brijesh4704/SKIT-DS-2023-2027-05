const Joi = require("joi");

const saveEligibilitySchema = Joi.object({
  age: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required(),

  weight: Joi.number()
    .min(30)
    .max(300)
    .required(),

  lastDonationDate: Joi.date()
    .iso()
    .max("now")
    .optional()
    .allow(null),

  hadRecentIllness: Joi.boolean()
    .optional()
    .default(false),

  takingMedication: Joi.boolean()
    .optional()
    .default(false),

  hadRecentSurgery: Joi.boolean()
    .optional()
    .default(false),

  recentTattooOrPiercing: Joi.boolean()
    .optional()
    .default(false),

  hasChronicDisease: Joi.boolean()
    .optional()
    .default(false),

  recentInfection: Joi.boolean()
    .optional()
    .default(false),

  notes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow(""),

  screeningStatus: Joi.string().max(100).optional().allow(null, ""),
  screeningSummary: Joi.string().max(2000).optional().allow(""),
  screeningFlags: Joi.array().items(Joi.object().unknown(true)).optional(),
  medicalDocument: Joi.object({
    name: Joi.string().max(255).allow(""),
    confidence: Joi.number().min(0).max(1),
    matchedTerms: Joi.array().items(Joi.string()).default([]),
    verifiedAt: Joi.date().iso().allow(null),
  }).optional(),
});

module.exports = {
  saveEligibilitySchema,
};