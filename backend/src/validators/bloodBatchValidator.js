const Joi = require("joi");

const bloodGroupSchema = Joi.string().valid(
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-"
);

const createBloodBatchSchema = Joi.object({
  bloodGroup: bloodGroupSchema.required(),

  batchNumber: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  unitsCollected: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .required(),

  collectionDate: Joi.date()
    .iso()
    .max("now")
    .required(),

  expiryDate: Joi.date()
    .iso()
    .required(),
});

const updateBloodBatchSchema = Joi.object({
  expiryDate: Joi.date()
    .iso()
    .optional(),

  unitsAvailable: Joi.number()
    .integer()
    .min(0)
    .optional(),
})
.min(1);

module.exports = {
  createBloodBatchSchema,
  updateBloodBatchSchema,
};