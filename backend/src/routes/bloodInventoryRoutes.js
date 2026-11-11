const express = require("express");

const router = express.Router();

// ==========================================
// BLOOD INVENTORY CONTROLLER
// ==========================================

const {
  upsertInventory,
  getMyInventory,
  getBloodGroupInventory,
  reserveBloodForRequest,
} = require("../controllers/bloodInventoryController");

// ==========================================
// INVENTORY TRANSACTION CONTROLLER
// ==========================================

const {
  createInventoryTransaction,
  issueBloodForRequest,
  getInventoryTransactions,
} = require("../controllers/inventoryTransactionController");

// ==========================================
// MIDDLEWARE
// ==========================================

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");
const validateParams = require("../middleware/validateParams");

// ==========================================
// VALIDATORS
// ==========================================

const {
  upsertInventorySchema,
  reserveBloodSchema,
  bloodGroupParamSchema,
} = require("../validators/bloodInventoryValidator");

const {
  createInventoryTransactionSchema,
  issueBloodSchema,
} = require("../validators/inventoryTransactionValidator");

// ======================================================
// SWAGGER DOCUMENTATION
// ======================================================

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Blood inventory and stock management APIs
 */

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Add or update blood inventory
 *     description: Creates or updates blood inventory for a blood bank.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             bloodGroup: "B-"
 *             units: 10
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  validate(upsertInventorySchema),
  upsertInventory
);

/**
 * @swagger
 * /api/inventory/reserve:
 *   post:
 *     summary: Reserve blood for a request
 *     description: Reserves available blood inventory against a blood request.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             bloodRequestId: "6aa3ac72ce0506fe5780886d"
 *             units: 2
 *     responses:
 *       200:
 *         description: Blood reserved successfully
 *       400:
 *         description: Validation failed or insufficient inventory
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       404:
 *         description: Blood request or inventory not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/reserve",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  validate(reserveBloodSchema),
  reserveBloodForRequest
);

/**
 * @swagger
 * /api/inventory/issue:
 *   post:
 *     summary: Issue reserved blood
 *     description: Issues previously reserved blood against a blood request and completes the request workflow.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             bloodRequestId: "6aa3ac72ce0506fe5780886d"
 *             units: 2
 *     responses:
 *       200:
 *         description: Blood issued successfully
 *       400:
 *         description: Validation failed or insufficient reserved stock
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       404:
 *         description: Blood request or inventory not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/issue",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  validate(issueBloodSchema),
  issueBloodForRequest
);

/**
 * @swagger
 * /api/inventory/my:
 *   get:
 *     summary: Get blood inventory
 *     description: Returns inventory belonging to the authenticated blood bank. Administrators can access all inventory.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/my",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  getMyInventory
);

/**
 * @swagger
 * /api/inventory/transaction:
 *   post:
 *     summary: Create inventory transaction
 *     description: Creates an inventory audit transaction for stock movement.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example:
 *             bloodGroup: "B-"
 *             type: "RECEIVED"
 *             units: 5
 *             reason: "New blood stock received"
 *     responses:
 *       201:
 *         description: Inventory transaction created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/transaction",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  validate(createInventoryTransactionSchema),
  createInventoryTransaction
);

/**
 * @swagger
 * /api/inventory/transactions:
 *   get:
 *     summary: Get inventory transactions
 *     description: Returns inventory transaction history. Blood banks see their own transactions while administrators can access all transactions.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory transactions retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Blood bank or admin role required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/transactions",
  protect,
  authorize("BLOOD_BANK", "ADMIN"),
  getInventoryTransactions
);

/**
 * @swagger
 * /api/inventory/{bloodGroup}:
 *   get:
 *     summary: Get blood group availability
 *     description: Returns current inventory availability for a specific blood group.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bloodGroup
 *         required: true
 *         schema:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         description: Blood group to check
 *     responses:
 *       200:
 *         description: Blood availability retrieved successfully
 *       400:
 *         description: Invalid blood group
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Hospital, blood bank or admin role required
 *       404:
 *         description: Blood group inventory not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:bloodGroup",
  protect,
  authorize(
    "HOSPITAL",
    "BLOOD_BANK",
    "ADMIN"
  ),
  validateParams(bloodGroupParamSchema),
  getBloodGroupInventory
);

module.exports = router;