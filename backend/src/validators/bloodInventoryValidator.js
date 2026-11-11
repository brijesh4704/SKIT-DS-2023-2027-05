const Joi = require("joi");

// ==========================================
// BLOOD GROUP
// ==========================================

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

// ==========================================
// UPSERT INVENTORY
// BLOOD_BANK -> bloodBankId not required
// ADMIN -> bloodBankId required
// ==========================================

const upsertInventorySchema = Joi.object({
  bloodGroup: bloodGroupSchema.required(),

  unitsAvailable: Joi.number()
    .integer()
    .min(0)
    .required(),

  // Used by ADMIN to select target blood bank.
  // Controller validates this only when role is ADMIN.
  bloodBankId: Joi.string()
    .hex()
    .length(24)
    .optional(),

  // Kept for backward compatibility,
  // but controller does NOT allow it to overwrite
  // existing reserved units.
  reservedUnits: Joi.number()
    .integer()
    .min(0)
    .optional(),
});

// ==========================================
// RESERVE BLOOD
// ==========================================

const reserveBloodSchema = Joi.object({
  requestId: Joi.string()
    .hex()
    .length(24)
    .required(),

  units: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .required(),
});

// ==========================================
// BLOOD GROUP PARAM
// ==========================================

const bloodGroupParamSchema = Joi.object({
  bloodGroup: bloodGroupSchema.required(),
});

module.exports = {
  upsertInventorySchema,
  reserveBloodSchema,
  bloodGroupParamSchema,
};