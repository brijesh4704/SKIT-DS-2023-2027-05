const Joi = require("joi");

const bloodRequestSchema = Joi.object({
  patientName: Joi.string().trim().min(2).max(100).required(),

  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
    .required(),

  unitsRequired: Joi.number().integer().min(1).max(20).required(),

  hospitalName: Joi.string().trim().min(2).max(200).required(),

  city: Joi.string().trim().min(2).max(100).required(),

  location: Joi.object({
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }).required(),
  }).required(),

  contactName: Joi.string().trim().min(2).max(100).required(),

  contactPhone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Please provide a valid 10-digit Indian phone number.",
    }),

  urgency: Joi.string()
    .valid("LOW", "MEDIUM", "HIGH", "CRITICAL")
    .default("HIGH"),
});

module.exports = {
  bloodRequestSchema,
};