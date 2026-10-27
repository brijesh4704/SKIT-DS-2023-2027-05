const mongoose = require("mongoose");
const BloodBatch = require("../models/BloodBatch");
const BloodInventory = require("../models/BloodInventory");
const InventoryTransaction = require("../models/InventoryTransaction");

// ===============================
// CREATE BLOOD BATCH
// ===============================
const createBloodBatch = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      bloodGroup,
      batchNumber,
      unitsCollected,
      collectionDate,
      expiryDate,
    } = req.body;

    if (
      !bloodGroup ||
      !batchNumber ||
      !unitsCollected ||
      !collectionDate ||
      !expiryDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All batch fields are required",
      });
    }

    if (new Date(expiryDate) <= new Date(collectionDate)) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be after collection date",
      });
    }

    let result;

    await session.withTransaction(async () => {
      const [batch] = await BloodBatch.create(
        [
          {
            bloodBank: req.user._id,
            bloodGroup,
            batchNumber,
            unitsCollected,
            unitsAvailable: unitsCollected,
            collectionDate,
            expiryDate,
          },
        ],
        { session }
      );

      let inventory = await BloodInventory.findOne({
        bloodBank: req.user._id,
        bloodGroup,
      }).session(session);

      if (!inventory) {
        const [createdInventory] = await BloodInventory.create(
          [
            {
              bloodBank: req.user._id,
              bloodGroup,
              unitsAvailable: 0,
              reservedUnits: 0,
            },
          ],
          { session }
        );

        inventory = createdInventory;
      }

      const previousUnits = inventory.unitsAvailable;

      inventory.unitsAvailable += unitsCollected;
      inventory.lastUpdated = new Date();

      await inventory.save({ session });

      await InventoryTransaction.create(
        [
          {
            bloodBank: req.user._id,
            inventory: inventory._id,
            bloodGroup,
            type: "RECEIVED",
            units: unitsCollected,
            previousUnits,
            newUnits: inventory.unitsAvailable,
            reference: batch._id,
            notes: `Blood batch ${batchNumber} added to inventory`,
            performedBy: req.user._id,
          },
        ],
        { session }
      );

      result = {
        batch,
        inventory,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Blood batch created and inventory updated successfully",
      ...result,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Batch number already exists for this blood bank",
      });
    }

    console.error("Create blood batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create blood batch",
    });
  } finally {
    await session.endSession();
  }
};

// ===============================
// GET MY BLOOD BATCHES
// ===============================
const getMyBloodBatches = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "BLOOD_BANK") {
      query.bloodBank = req.user._id;
    }

    const batches = await BloodBatch.find(query)
      .sort({ expiryDate: 1 })
      .populate("bloodBank", "name email phone");

    return res.status(200).json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Get blood batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blood batches",
    });
  }
};

// ===============================
// UPDATE BLOOD BATCH
// ===============================
const updateBloodBatch = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { expiryDate, unitsAvailable } = req.body;

    const batchQuery = {
      _id: req.params.id,
    };

    if (req.user.role === "BLOOD_BANK") {
      batchQuery.bloodBank = req.user._id;
    }

    let result;

    await session.withTransaction(async () => {
      const batch = await BloodBatch.findOne(batchQuery).session(session);

      if (!batch) {
        const error = new Error("Blood batch not found");
        error.statusCode = 404;
        throw error;
      }

      const oldUnitsAvailable = batch.unitsAvailable;

      // ==========================================
      // EXPIRY DATE UPDATE
      // ==========================================
      if (expiryDate !== undefined) {
        if (new Date(expiryDate) <= new Date(batch.collectionDate)) {
          const error = new Error(
            "Expiry date must be after collection date"
          );
          error.statusCode = 400;
          throw error;
        }

        batch.expiryDate = expiryDate;
      }

      // ==========================================
      // UNITS UPDATE
      // ==========================================
      if (unitsAvailable !== undefined) {
        if (
          !Number.isInteger(unitsAvailable) ||
          unitsAvailable < 0 ||
          unitsAvailable > batch.unitsCollected
        ) {
          const error = new Error("Invalid unitsAvailable value");
          error.statusCode = 400;
          throw error;
        }

        const unitsDifference = unitsAvailable - oldUnitsAvailable;

        // No inventory change required if units are unchanged.
        if (unitsDifference !== 0) {
          const inventory = await BloodInventory.findOne({
            bloodBank: batch.bloodBank,
            bloodGroup: batch.bloodGroup,
          }).session(session);

          if (!inventory) {
            const error = new Error(
              "Inventory record not found for this blood batch"
            );
            error.statusCode = 404;
            throw error;
          }

          // If reducing batch units, don't allow inventory
          // to go below the currently reserved amount.
          const newInventoryUnits =
            inventory.unitsAvailable + unitsDifference;

          if (newInventoryUnits < inventory.reservedUnits) {
            const error = new Error(
              "Cannot reduce batch units below reserved inventory"
            );
            error.statusCode = 400;
            throw error;
          }

          if (newInventoryUnits < 0) {
            const error = new Error(
              "Insufficient inventory for this batch adjustment"
            );
            error.statusCode = 400;
            throw error;
          }

          const previousInventoryUnits = inventory.unitsAvailable;

          inventory.unitsAvailable = newInventoryUnits;
          inventory.lastUpdated = new Date();

          await inventory.save({ session });

          await InventoryTransaction.create(
            [
              {
                bloodBank: batch.bloodBank,
                inventory: inventory._id,
                bloodGroup: batch.bloodGroup,
                type: "ADJUSTMENT",
                units: Math.abs(unitsDifference),
                previousUnits: previousInventoryUnits,
                newUnits: newInventoryUnits,
                reference: batch._id,
                notes:
                  unitsDifference > 0
                    ? `Blood batch ${batch.batchNumber} units increased from ${oldUnitsAvailable} to ${unitsAvailable}`
                    : `Blood batch ${batch.batchNumber} units reduced from ${oldUnitsAvailable} to ${unitsAvailable}`,
                performedBy: req.user._id,
              },
            ],
            { session }
          );
        }

        batch.unitsAvailable = unitsAvailable;

        if (unitsAvailable === 0) {
          batch.status = "DEPLETED";
        } else if (new Date(batch.expiryDate) <= new Date()) {
          batch.status = "EXPIRED";
        } else {
          batch.status = "AVAILABLE";
        }
      } else {
        // If only expiry date is changed, keep status consistent.
        if (batch.unitsAvailable === 0) {
          batch.status = "DEPLETED";
        } else if (new Date(batch.expiryDate) <= new Date()) {
          batch.status = "EXPIRED";
        } else {
          batch.status = "AVAILABLE";
        }
      }

      await batch.save({ session });

      const updatedInventory = await BloodInventory.findOne({
        bloodBank: batch.bloodBank,
        bloodGroup: batch.bloodGroup,
      }).session(session);

      result = {
        batch,
        inventory: updatedInventory,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Blood batch and inventory updated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Update blood batch error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Failed to update blood batch",
    });
  } finally {
    await session.endSession();
  }
};

// ===============================
// EXPIRE BLOOD BATCHES - CORE LOGIC
// ===============================
const expireBloodBatches = async (bloodBankId = null) => {
  const session = await mongoose.startSession();

  try {
    const now = new Date();

    const query = {
      expiryDate: { $lt: now },
      status: "AVAILABLE",
      unitsAvailable: { $gt: 0 },
    };

    if (bloodBankId) {
      query.bloodBank = bloodBankId;
    }

    let expiredCount = 0;
    let totalExpiredUnits = 0;

    await session.withTransaction(async () => {
      const expiredBatches = await BloodBatch.find(query).session(session);

      for (const batch of expiredBatches) {
        const expiredUnits = batch.unitsAvailable;

        const inventory = await BloodInventory.findOne({
          bloodBank: batch.bloodBank,
          bloodGroup: batch.bloodGroup,
        }).session(session);

        if (inventory) {
          const previousUnits = inventory.unitsAvailable;

          const newUnits = Math.max(
            inventory.reservedUnits,
            inventory.unitsAvailable - expiredUnits
          );

          const actualExpiredUnits = previousUnits - newUnits;

          inventory.unitsAvailable = newUnits;
          inventory.lastUpdated = new Date();

          await inventory.save({ session });

          if (actualExpiredUnits > 0) {
            await InventoryTransaction.create(
              [
                {
                  bloodBank: batch.bloodBank,
                  inventory: inventory._id,
                  bloodGroup: batch.bloodGroup,
                  type: "EXPIRED",
                  units: actualExpiredUnits,
                  previousUnits,
                  newUnits,
                  reference: batch._id,
                  notes: `Expired blood batch ${batch.batchNumber}`,
                  performedBy: batch.bloodBank,
                },
              ],
              { session }
            );
          }
        }

        batch.status = "EXPIRED";
        batch.unitsAvailable = 0;

        await batch.save({ session });

        expiredCount++;
        totalExpiredUnits += expiredUnits;
      }
    });

    return {
      modifiedCount: expiredCount,
      totalExpiredUnits,
    };
  } finally {
    await session.endSession();
  }
};

// ===============================
// UPDATE EXPIRED BATCHES
// ===============================
const updateExpiredBatches = async (req, res) => {
  try {
    // ADMIN -> all blood banks
    // BLOOD_BANK -> only own blood bank
    const bloodBankId =
      req.user.role === "ADMIN" ? null : req.user._id;

    const result = await expireBloodBatches(bloodBankId);

    return res.status(200).json({
      success: true,
      message: "Expired batches and inventory updated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Update expired batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update expired batches",
    });
  }
};

module.exports = {
  createBloodBatch,
  getMyBloodBatches,
  updateExpiredBatches,
  updateBloodBatch,
  expireBloodBatches,
};