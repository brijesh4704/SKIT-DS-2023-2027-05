const mongoose = require("mongoose");

const BloodInventory = require("../models/BloodInventory");
const BloodRequest = require("../models/BloodRequest");
const InventoryTransaction = require("../models/InventoryTransaction");
const Notification = require("../models/Notification");

// =====================================================
// VALID BLOOD GROUPS
// =====================================================

const VALID_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

// =====================================================
// POST /api/inventory
// Add / update blood inventory
// Private - BLOOD_BANK / ADMIN
// =====================================================

const upsertInventory = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      bloodGroup,
      unitsAvailable,
      reservedUnits,
      bloodBankId,
    } = req.body;

    // ==========================================
    // BASIC VALIDATION
    // ==========================================

    if (
      !bloodGroup ||
      unitsAvailable === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Blood group and units available are required",
      });
    }

    if (
      !VALID_BLOOD_GROUPS.includes(
        bloodGroup
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blood group",
      });
    }

    const units = Number(
      unitsAvailable
    );

    if (
      !Number.isInteger(units) ||
      units < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Units available must be a non-negative integer",
      });
    }

    // ==========================================
    // DETERMINE TARGET BLOOD BANK
    // ==========================================

    let targetBloodBankId =
      req.user._id;

    if (
      req.user.role === "ADMIN"
    ) {
      if (
        !bloodBankId ||
        !mongoose.Types.ObjectId.isValid(
          bloodBankId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Admin must provide a valid bloodBankId",
        });
      }

      targetBloodBankId =
        bloodBankId;
    }

    // ==========================================
    // RESERVED UNITS
    // ==========================================
    //
    // Existing reserved units are preserved.
    // Manual API cannot arbitrarily overwrite
    // active reservations.
    // ==========================================

    let result;

    await session.withTransaction(
      async () => {
        const inventory =
          await BloodInventory.findOne({
            bloodBank:
              targetBloodBankId,

            bloodGroup,

            isActive: true,
          }).session(session);

        // ==========================================
        // CREATE NEW INVENTORY
        // ==========================================

        if (!inventory) {
          const [createdInventory] =
            await BloodInventory.create(
              [
                {
                  bloodBank:
                    targetBloodBankId,

                  bloodGroup,

                  unitsAvailable:
                    units,

                  reservedUnits:
                    0,

                  lastUpdated:
                    new Date(),

                  isActive: true,
                },
              ],
              { session }
            );

          const transactionResult =
            await InventoryTransaction.create(
              [
                {
                  bloodBank:
                    targetBloodBankId,

                  inventory:
                    createdInventory._id,

                  bloodGroup,

                  type:
                    "ADJUSTMENT",

                  units,

                  previousUnits:
                    0,

                  newUnits:
                    units,

                  reference:
                    null,

                  notes:
                    "Initial inventory created",

                  performedBy:
                    req.user._id,
                },
              ],
              { session }
            );

          result = {
            inventory:
              createdInventory,

            transaction:
              transactionResult[0],
          };

          return;
        }

        // ==========================================
        // RESERVED STOCK PROTECTION
        // ==========================================

        const existingReserved =
          inventory.reservedUnits || 0;

        if (
          units <
          existingReserved
        ) {
          const error =
            new Error(
              `Units available cannot be lower than reserved units (${existingReserved})`
            );

          error.statusCode = 400;

          throw error;
        }

        const previousUnits =
          inventory.unitsAvailable;

        inventory.unitsAvailable =
          units;

        inventory.lastUpdated =
          new Date();

        await inventory.save({
          session,
        });

        // ==========================================
        // AUDIT TRANSACTION
        // ==========================================

        const transactionResult =
          await InventoryTransaction.create(
            [
              {
                bloodBank:
                  targetBloodBankId,

                inventory:
                  inventory._id,

                bloodGroup,

                type:
                  "ADJUSTMENT",

                units:
                  Math.abs(
                    units -
                      previousUnits
                  ),

                previousUnits,

                newUnits:
                  units,

                reference:
                  null,

                notes:
                  "Inventory manually adjusted",

                performedBy:
                  req.user._id,
              },
            ],
            { session }
          );

        result = {
          inventory,
          transaction:
            transactionResult[0],
        };
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Blood inventory updated successfully",
      inventory:
        result.inventory,
      transaction:
        result.transaction,
    });
  } catch (error) {
    console.error(
      "Upsert inventory error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Server error",

      ...(process.env.NODE_ENV !==
        "production" && {
        error:
          error.message,
      }),
    });
  } finally {
    await session.endSession();
  }
};

// =====================================================
// GET /api/inventory/my
// Get blood bank inventory
// BLOOD_BANK -> own
// ADMIN -> all
// =====================================================

const getMyInventory = async (
  req,
  res
) => {
  try {
    const filter = {
      isActive: true,
    };

    if (
      req.user.role ===
      "BLOOD_BANK"
    ) {
      filter.bloodBank =
        req.user._id;
    }

    const inventory =
      await BloodInventory.find(
        filter
      )
        .populate(
          "bloodBank",
          "name email phone"
        )
        .sort({
          bloodGroup: 1,
        });

    return res.status(200).json({
      success: true,
      count:
        inventory.length,
      inventory,
    });
  } catch (error) {
    console.error(
      "Get inventory error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
};

// =====================================================
// GET /api/inventory/:bloodGroup
// Check blood availability
// Private - HOSPITAL / BLOOD_BANK / ADMIN
// =====================================================

const getBloodGroupInventory = async (
  req,
  res
) => {
  try {
    const {
      bloodGroup,
    } = req.params;

    if (
      !VALID_BLOOD_GROUPS.includes(
        bloodGroup
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blood group",
      });
    }

    const inventory =
      await BloodInventory.find({
        bloodGroup,
        isActive: true,
      })
        .populate(
          "bloodBank",
          "name"
        )
        .sort({
          unitsAvailable: -1,
        });

    if (
      inventory.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          `No active inventory found for blood group ${bloodGroup}`,
      });
    }

    // ==========================================
    // SAFE PUBLIC-STYLE AVAILABILITY RESPONSE
    // ==========================================

    const safeInventory =
      inventory.map(
        (item) => ({
          bloodBank:
            item.bloodBank
              ? {
                  id:
                    item.bloodBank
                      ._id,

                  name:
                    item.bloodBank
                      .name,
                }
              : null,

          bloodGroup:
            item.bloodGroup,

          // Only usable units.
          unitsAvailable:
            Math.max(
              0,
              item.unitsAvailable -
                (item.reservedUnits ||
                  0)
            ),
        })
      );

    return res.status(200).json({
      success: true,
      bloodGroup,
      count:
        safeInventory.length,
      inventory:
        safeInventory,
    });
  } catch (error) {
    console.error(
      "Get blood group inventory error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
};

// =====================================================
// POST /api/inventory/reserve
// Reserve blood units for a blood request
// Private - BLOOD_BANK / ADMIN
// =====================================================

const reserveBloodForRequest =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const {
        requestId,
        units,
      } = req.body;

      if (
        !requestId ||
        units === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Request ID and units are required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          requestId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid request ID",
        });
      }

      const reserveUnits =
        Number(units);

      if (
        !Number.isInteger(
          reserveUnits
        ) ||
        reserveUnits <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Units must be a positive integer",
        });
      }

      let result;

      await session.withTransaction(
        async () => {
          const bloodRequest =
            await BloodRequest.findById(
              requestId
            ).session(session);

          if (!bloodRequest) {
            const error =
              new Error(
                "Blood request not found"
              );

            error.statusCode = 404;

            throw error;
          }

          if (
            bloodRequest.status ===
              "FULFILLED" ||
            bloodRequest.status ===
              "CANCELLED"
          ) {
            const error =
              new Error(
                `Cannot reserve blood for a ${bloodRequest.status} request`
              );

            error.statusCode = 400;

            throw error;
          }

          const remainingUnits =
            bloodRequest.unitsRequired -
            bloodRequest.reservedUnits;

          if (
            reserveUnits >
            remainingUnits
          ) {
            const error =
              new Error(
                `Only ${remainingUnits} units are remaining to reserve`
              );

            error.statusCode = 400;

            throw error;
          }

          const targetBloodBankId =
            req.user.role ===
            "ADMIN"
              ? bloodRequest.bloodBank ||
                req.user._id
              : req.user._id;

          // ==========================================
          // ADMIN MUST HAVE ASSIGNED BLOOD BANK
          // ==========================================

          if (
            req.user.role ===
              "ADMIN" &&
            !bloodRequest.bloodBank
          ) {
            const error =
              new Error(
                "Request must be assigned to a blood bank before reservation"
              );

            error.statusCode = 400;

            throw error;
          }

          // ==========================================
          // ATOMIC INVENTORY RESERVATION
          // ==========================================

          const inventory =
            await BloodInventory.findOneAndUpdate(
              {
                bloodBank:
                  targetBloodBankId,

                bloodGroup:
                  bloodRequest.bloodGroup,

                isActive: true,

                $expr: {
                  $gte: [
                    {
                      $subtract: [
                        "$unitsAvailable",
                        "$reservedUnits",
                      ],
                    },
                    reserveUnits,
                  ],
                },
              },
              {
                $inc: {
                  reservedUnits:
                    reserveUnits,
                },

                $set: {
                  lastUpdated:
                    new Date(),
                },
              },
              {
                new: true,
                session,
              }
            );

          if (!inventory) {
            const error =
              new Error(
                `Only enough usable ${bloodRequest.bloodGroup} blood is not available`
              );

            error.statusCode = 400;

            throw error;
          }

          // ==========================================
          // ASSIGN BLOOD BANK
          // ==========================================

          bloodRequest.bloodBank =
            targetBloodBankId;

          bloodRequest.reservedUnits +=
            reserveUnits;

          bloodRequest.status =
            "IN_PROGRESS";

          await bloodRequest.save({
            session,
          });

          const previousReservedUnits =
            inventory.reservedUnits -
            reserveUnits;

          await InventoryTransaction.create(
            [
              {
                bloodBank:
                  targetBloodBankId,

                inventory:
                  inventory._id,

                bloodGroup:
                  bloodRequest.bloodGroup,

                type:
                  "RESERVED",

                units:
                  reserveUnits,

                previousUnits:
                  previousReservedUnits,

                newUnits:
                  inventory.reservedUnits,

                reference:
                  bloodRequest._id,

                notes:
                  `Blood reserved for request ${bloodRequest._id}`,

                performedBy:
                  req.user._id,
              },
            ],
            { session }
          );

          result = {
            bloodRequest,
            inventory,
          };
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Blood reserved successfully",
        bloodRequest:
          result.bloodRequest,
        inventory:
          result.inventory,
      });
    } catch (error) {
      console.error(
        "Reserve blood error:",
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "Server error",

        ...(process.env.NODE_ENV !==
          "production" && {
          error:
            error.message,
        }),
      });
    } finally {
      await session.endSession();
    }
  };

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  upsertInventory,
  getMyInventory,
  getBloodGroupInventory,
  reserveBloodForRequest,
};