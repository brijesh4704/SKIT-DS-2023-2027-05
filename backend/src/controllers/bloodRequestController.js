const User = require("../models/User");
const mongoose = require("mongoose");

const BloodRequest = require("../models/BloodRequest");
const Donor = require("../models/Donor");
const Donation = require("../models/Donation");
const Notification = require("../models/Notification");
const MatchHistory = require("../models/MatchHistory");
const InventoryTransaction = require("../models/InventoryTransaction");
const BloodInventory = require("../models/BloodInventory");

const {
  findSmartDonors,
} = require("../services/aiMatchingService");

const {
  sendPushToUser,
} = require("../services/pushNotificationService");

// =====================================================
// BLOOD GROUP COMPATIBILITY
// =====================================================

const compatibleBloodGroups = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],

  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],

  "AB+": [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
  ],

  "AB-": [
    "A-",
    "B-",
    "AB-",
    "O-",
  ],

  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

// =====================================================
// HAVERSINE DISTANCE
// =====================================================

const calculateDistance = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

// =====================================================
// URGENCY PRIORITY
// =====================================================

const urgencyPriority = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// =====================================================
// ACCESS FILTER
// =====================================================

const buildRequestAccessFilter = (
  req
) => {
  const filter = {
    _id: req.params.id,
  };

  if (
    req.user.role ===
    "HOSPITAL"
  ) {
    filter.createdBy =
      req.user._id;

    return filter;
  }

  if (
    req.user.role ===
    "BLOOD_BANK"
  ) {
    filter.bloodBank =
      req.user._id;

    return filter;
  }

  if (
    req.user.role ===
    "ADMIN"
  ) {
    return filter;
  }

  return null;
};

// =====================================================
// SAVE AI MATCH HISTORY
// =====================================================

const saveMatchHistory = async (
  bloodRequest,
  rankedDonors
) => {
  if (
    !rankedDonors.length
  ) {
    return;
  }

  const compatibleGroups =
    compatibleBloodGroups[
      bloodRequest.bloodGroup
    ] || [];

  const operations =
    rankedDonors.map(
      (match) => ({
        updateOne: {
          filter: {
            bloodRequest:
              bloodRequest._id,

            donor:
              match.donor._id,
          },

          update: {
            $set: {
              bloodGroup:
                match.donor
                  .bloodGroup,

              urgency:
                bloodRequest
                  .urgency,

              distance:
                match.distance,

              matchScore:
                match.matchScore,

              isCompatible:
                compatibleGroups.includes(
                  match.donor
                    .bloodGroup
                ),

              donorFeatures: {
                totalDonations:
                  match.donor
                    .totalDonations ||
                  0,

                responseRate:
                  match.donor
                    .responseRate ||
                  0,

                rating:
                  match.donor
                    .rating ||
                  0,

                medicalEligible:
                  match.donor
                    .medicalEligible ||
                  false,

                emergencyAvailable:
                  match.donor
                    .emergencyAvailable ||
                  false,

                isVerified:
                  match.donor
                    .user
                    ?.isVerified ||
                  false,
              },

              requestFeatures: {
                unitsRequired:
                  bloodRequest
                    .unitsRequired,
              },
            },

            $setOnInsert: {
              donorResponse:
                "PENDING",

              responseTime:
                null,

              donationSuccessful:
                null,
            },
          },

          upsert: true,
        },
      })
    );

  await MatchHistory.bulkWrite(
    operations,
    {
      ordered: false,
    }
  );
};

// =====================================================
// CREATE BLOOD REQUEST
// =====================================================

const createBloodRequest = async (
  req,
  res
) => {
  try {
    const {
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      city,
      location,
      contactName,
      contactPhone,
      urgency,
    } = req.body;

    if (
      req.user.role !==
      "HOSPITAL"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Only hospitals can create blood requests",
        });
    }

    if (
      !location ||
      !location.coordinates ||
      location.coordinates
        .latitude == null ||
      location.coordinates
        .longitude == null
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Location coordinates are required",
        });
    }

    const bloodRequest =
      await BloodRequest.create({
        patientName,
        bloodGroup,
        unitsRequired,
        hospitalName,
        city,
        location,
        contactName,
        contactPhone,
        urgency,
        createdBy:
          req.user._id,
      });

    // =================================================
    // NOTIFY MATCHING DONORS
    // =================================================

    try {
      const compatibleGroups =
        compatibleBloodGroups[
          bloodRequest.bloodGroup
        ];

      if (
        compatibleGroups
      ) {
        const matchingDonors =
          await Donor.find({
            bloodGroup: {
              $in:
                compatibleGroups,
            },

            "location.city": {
              $regex:
                `^${bloodRequest.city}$`,
              $options: "i",
            },

            isAvailable:
              true,

            medicalEligible:
              true,

            user: {
              $ne:
                req.user._id,
            },
          })
            .populate(
              "user",
              "name phone isVerified isActive"
            )
            .select(
              "user bloodGroup location"
            );

        const activeDonors =
          matchingDonors.filter(
            (donor) =>
              donor.user &&
              donor.user
                .isActive ===
                true
          );

        if (
          activeDonors.length >
          0
        ) {
          const notifications =
            activeDonors.map(
              (donor) => ({
                recipient:
                  donor.user
                    ._id,

                type:
                  "BLOOD_REQUEST",

                title:
                  "New Blood Request",

                message:
                  `A new ${bloodRequest.bloodGroup} blood request is available in ${bloodRequest.city}.`,

                bloodRequest:
                  bloodRequest._id,
              })
            );

          // Save in-app notifications
          const createdNotifications =
            await Notification.insertMany(
              notifications
            );

          // Send browser push
          await Promise.all(
            createdNotifications.map(
              async (
                notification
              ) => {
                try {
                  await sendPushToUser(
                    notification.recipient,
                    {
                      title:
                        "🩸 New Blood Request",

                      message:
                        notification.message,

                      tag:
                        `blood-request-${bloodRequest._id}`,

                      url:
                        "/donor/requests",

                      notificationId:
                        notification._id.toString(),

                      bloodRequestId:
                        bloodRequest._id.toString(),
                    }
                  );
                } catch (
                  pushError
                ) {
                  console.error(
                    "Donor push notification error:",
                    pushError
                  );
                }
              }
            )
          );
        }
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Matching donor notification error:",
        notificationError
      );
    }

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Blood request created successfully",

        bloodRequest,
      });
  } catch (error) {
    console.error(
      "Create blood request error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Server error while creating blood request",
      });
  }
};

// =====================================================
// GET MY HOSPITAL BLOOD REQUESTS
// =====================================================

const getMyHospitalBloodRequests =
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "HOSPITAL"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only hospitals can view their blood requests",
          });
      }

      const requests =
        await BloodRequest.find({
          createdBy:
            req.user._id,
        })
          .populate(
            "createdBy",
            "name email phone"
          )
          .sort({
            createdAt: -1,
          });

      return res
        .status(200)
        .json({
          success: true,

          count:
            requests.length,

          requests,
        });
    } catch (error) {
      console.error(
        "Get my hospital blood requests error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while fetching your blood requests",
        });
    }
  };

// =====================================================
// GET OPEN BLOOD REQUESTS
// =====================================================

const getBloodRequests =
  async (req, res) => {
    try {
      const requests =
        await BloodRequest.find({
          status: "OPEN",
        })
          .populate(
            "createdBy",
            "name"
          )
          .sort({
            createdAt: -1,
          });

      return res
        .status(200)
        .json({
          success: true,

          count:
            requests.length,

          requests,
        });
    } catch (error) {
      console.error(
        "Get blood requests error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while fetching blood requests",
        });
    }
  };

// =====================================================
// GET AI MATCHES
// =====================================================

const getMatchingDonors =
  async (req, res) => {
    try {
      if (
        ![
          "HOSPITAL",
          "BLOOD_BANK",
          "ADMIN",
        ].includes(
          req.user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to view donor matches",
          });
      }

      const accessFilter =
        buildRequestAccessFilter(
          req
        );

      if (
        !accessFilter
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to access this request",
          });
      }

      const bloodRequest =
        await BloodRequest.findOne(
          accessFilter
        );

      if (
        !bloodRequest
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Blood request not found or you are not authorized to access it",
          });
      }

      const rankedDonors =
        await findSmartDonors(
          bloodRequest
        );

      const filteredDonors =
        rankedDonors.filter(
          (match) => {
            const donorUserId =
              match.donor
                .user?._id;

            if (
              !donorUserId
            ) {
              return true;
            }

            return (
              donorUserId.toString() !==
              req.user._id.toString()
            );
          }
        );

      await saveMatchHistory(
        bloodRequest,
        filteredDonors
      );

      const priority =
        urgencyPriority[
          bloodRequest.urgency
        ] || 1;

      return res
        .status(200)
        .json({
          success: true,

          message:
            "AI donor matching completed successfully",

          bloodRequest: {
            _id:
              bloodRequest._id,

            bloodGroup:
              bloodRequest.bloodGroup,

            unitsRequired:
              bloodRequest.unitsRequired,

            city:
              bloodRequest.city,

            urgency:
              bloodRequest.urgency,

            priority,

            status:
              bloodRequest.status,

            location:
              bloodRequest.location,
          },

          compatibleBloodGroups:
            compatibleBloodGroups[
              bloodRequest
                .bloodGroup
            ] || [],

          count:
            filteredDonors.length,

          matchingDonors:
            filteredDonors,
        });
    } catch (error) {
      console.error(
        "AI donor matching error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while performing AI donor matching",

          ...(process.env
            .NODE_ENV !==
          "production"
            ? {
                error:
                  error.message,
              }
            : {}),
        });
    }
  };

// =====================================================
// DONOR ACCEPT / REJECT
// =====================================================

const respondToBloodRequest =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      if (
        req.user.role !==
        "DONOR"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only donors can respond to blood requests",
          });
      }

      const {
        status,
      } = req.body;

      if (
        ![
          "ACCEPTED",
          "REJECTED",
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Status must be ACCEPTED or REJECTED",
          });
      }

      let result = null;

      await session.withTransaction(
        async () => {
          const donor =
            await Donor.findOne({
              user:
                req.user._id,
            }).session(session);

          if (
            !donor
          ) {
            const error =
              new Error(
                "Donor profile not found"
              );

            error.statusCode =
              404;

            throw error;
          }

          const bloodRequest =
            await BloodRequest.findById(
              req.params.id
            ).session(session);

          if (
            !bloodRequest
          ) {
            const error =
              new Error(
                "Blood request not found"
              );

            error.statusCode =
              404;

            throw error;
          }

          if (
            bloodRequest.status !==
            "OPEN"
          ) {
            const error =
              new Error(
                "This blood request is no longer open"
              );

            error.statusCode =
              400;

            throw error;
          }

          const compatibleGroups =
            compatibleBloodGroups[
              bloodRequest
                .bloodGroup
            ];

          if (
            !compatibleGroups
          ) {
            const error =
              new Error(
                "Invalid blood group"
              );

            error.statusCode =
              400;

            throw error;
          }

          if (
            !compatibleGroups.includes(
              donor.bloodGroup
            )
          ) {
            const error =
              new Error(
                "Donor blood group is not compatible with this request"
              );

            error.statusCode =
              400;

            throw error;
          }

          const respondedAt =
            new Date();

          const update = {
            $push: {
              donorResponses: {
                donor:
                  donor._id,

                status,

                respondedAt,
              },
            },
          };

          if (
            status ===
            "ACCEPTED"
          ) {
            update.$set = {
              status:
                "DONOR_ACCEPTED",
            };
          }

          const updatedRequest =
            await BloodRequest.findOneAndUpdate(
              {
                _id:
                  bloodRequest._id,

                status:
                  "OPEN",

                donorResponses: {
                  $not: {
                    $elemMatch: {
                      donor:
                        donor._id,
                    },
                  },
                },
              },

              update,

              {
                new: true,
                session,
              }
            );

          if (
            !updatedRequest
          ) {
            const existing =
              await BloodRequest.findById(
                bloodRequest._id
              ).session(session);

            const alreadyResponded =
              existing?.donorResponses
                ?.some(
                  (response) =>
                    response.donor.toString() ===
                    donor._id.toString()
                );

            const error =
              new Error(
                alreadyResponded
                  ? "You have already responded to this blood request"
                  : "This blood request is no longer open"
              );

            error.statusCode =
              400;

            throw error;
          }

          // =====================================
          // MATCH HISTORY
          // =====================================

          const matchHistory =
            await MatchHistory.findOne({
              bloodRequest:
                bloodRequest._id,

              donor:
                donor._id,
            })
              .sort({
                createdAt: -1,
              })
              .session(
                session
              );

          let responseTime =
            null;

          if (
            matchHistory
          ) {
            responseTime =
              Math.max(
                0,
                Math.round(
                  (
                    respondedAt -
                    matchHistory.createdAt
                  ) /
                    (
                      1000 *
                      60
                    )
                )
              );

            matchHistory.donorResponse =
              status;

            matchHistory.responseTime =
              responseTime;

            await matchHistory.save({
              session,
            });
          }

          // =====================================
          // REQUESTER NOTIFICATION
          // =====================================

          const notificationDocs =
            await Notification.create(
              [
                {
                  recipient:
                    bloodRequest.createdBy,

                  type:
                    status ===
                    "ACCEPTED"
                      ? "DONOR_ACCEPTED"
                      : "DONOR_REJECTED",

                  title:
                    status ===
                    "ACCEPTED"
                      ? "Donor Accepted Your Request"
                      : "Donor Rejected Your Request",

                  message:
                    status ===
                    "ACCEPTED"
                      ? "A donor has accepted your blood request."
                      : "A donor has rejected your blood request.",

                  bloodRequest:
                    bloodRequest._id,
                },
              ],
              {
                session,
              }
            );

          result = {
            request:
              updatedRequest,

            donor,

            status,

            respondedAt,

            responseTime,

            notification: {
              recipient:
                bloodRequest.createdBy.toString(),

              notificationId:
                notificationDocs[0]._id.toString(),

              bloodRequestId:
                bloodRequest._id.toString(),

              title:
                status === "ACCEPTED"
                  ? "🩸 Donor Accepted Your Request"
                  : "Donor Rejected Your Request",

              message:
                status === "ACCEPTED"
                  ? "A donor has accepted your blood request."
                  : "A donor has rejected your blood request.",
            },
          };
        }
      );

      // =================================================
      // SEND PUSH AFTER TRANSACTION COMMIT
      // =================================================

      if (
        result?.notification
      ) {
        try {
          await sendPushToUser(
            result.notification
              .recipient,
            {
              title:
                result.notification
                  .title,

              message:
                result.notification
                  .message,

              tag:
                `blood-request-${result.notification.bloodRequestId}`,

              url:
                "/hospital",

              notificationId:
                result.notification
                  .notificationId,

              bloodRequestId:
                result.notification
                  .bloodRequestId,
            }
          );
        } catch (
          pushError
        ) {
          console.error(
            "Donor response push notification error:",
            pushError
          );
        }
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            status ===
            "ACCEPTED"
              ? "Blood request accepted successfully"
              : "Blood request rejected successfully",

          response: {
            requestId:
              result.request
                ._id,

            donorId:
              result.donor
                ._id,

            status:
              result.status,

            respondedAt:
              result.respondedAt,

            responseTimeMinutes:
              result.responseTime,
          },
        });
    } catch (error) {
      console.error(
        "Respond to blood request error:",
        error
      );

      return res
        .status(
          error.statusCode ||
            500
        )
        .json({
          success: false,

          message:
            error.statusCode
              ? error.message
              : "Server error while responding to blood request",

          ...(process.env
            .NODE_ENV !==
          "production"
            ? {
                error:
                  error.message,
              }
            : {}),
        });
    } finally {
      await session.endSession();
    }
  };

// =====================================================
// UPDATE BLOOD REQUEST STATUS
// =====================================================

const updateBloodRequestStatus =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      if (
        ![
          "HOSPITAL",
          "BLOOD_BANK",
          "ADMIN",
        ].includes(
          req.user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to update request status",
          });
      }

      const {
        status,
      } = req.body;

      const validStatuses =
        [
          "OPEN",
          "DONOR_ACCEPTED",
          "IN_PROGRESS",
          "FULFILLED",
          "CANCELLED",
        ];

      if (
        !validStatuses.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid status",
          });
      }

      let result = {
        bloodRequest:
          null,

        inventory:
          null,

        transaction:
          null,

        releasedUnits:
          0,

        notification:
          null,
      };

      await session.withTransaction(
        async () => {
          const accessFilter =
            buildRequestAccessFilter(
              req
            );

          if (
            !accessFilter
          ) {
            const error =
              new Error(
                "You are not authorized to access this request"
              );

            error.statusCode =
              403;

            throw error;
          }

          const bloodRequest =
            await BloodRequest.findOne(
              accessFilter
            ).session(session);

          if (
            !bloodRequest
          ) {
            const error =
              new Error(
                "Blood request not found or you are not authorized to update it"
              );

            error.statusCode =
              404;

            throw error;
          }

          const allowedTransitions =
            {
              OPEN: [
                "DONOR_ACCEPTED",
                "CANCELLED",
              ],

              DONOR_ACCEPTED: [
                "IN_PROGRESS",
                "CANCELLED",
              ],

              IN_PROGRESS: [
                "FULFILLED",
                "CANCELLED",
              ],

              FULFILLED:
                [],

              CANCELLED:
                [],
            };

          if (
            !allowedTransitions[
              bloodRequest
                .status
            ]?.includes(status)
          ) {
            const error =
              new Error(
                `Cannot change status from ${bloodRequest.status} to ${status}`
              );

            error.statusCode =
              400;

            throw error;
          }

          if (
            status ===
              "CANCELLED" &&
            bloodRequest
              .reservedUnits >
              0
          ) {
            if (
              !bloodRequest
                .bloodBank
            ) {
              const error =
                new Error(
                  "Cannot cancel request because no blood bank is assigned"
                );

              error.statusCode =
                400;

              throw error;
            }

            const reservedUnits =
              bloodRequest
                .reservedUnits;

            const inventory =
              await BloodInventory.findOneAndUpdate(
                {
                  bloodBank:
                    bloodRequest
                      .bloodBank,

                  bloodGroup:
                    bloodRequest
                      .bloodGroup,

                  isActive:
                    true,

                  $expr: {
                    $gte: [
                      "$reservedUnits",
                      reservedUnits,
                    ],
                  },
                },

                {
                  $inc: {
                    reservedUnits:
                      -reservedUnits,
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

            if (
              !inventory
            ) {
              const error =
                new Error(
                  "Unable to release reserved blood from inventory"
                );

              error.statusCode =
                400;

              throw error;
            }

            const transactionResult =
              await InventoryTransaction.create(
                [
                  {
                    bloodBank:
                      bloodRequest
                        .bloodBank,

                    inventory:
                      inventory._id,

                    bloodGroup:
                      bloodRequest
                        .bloodGroup,

                    type:
                      "RELEASED",

                    units:
                      reservedUnits,

                    previousUnits:
                      inventory
                        .unitsAvailable,

                    newUnits:
                      inventory
                        .unitsAvailable,

                    reference:
                      bloodRequest
                        ._id,

                    notes:
                      `Reserved blood released because request ${bloodRequest._id} was cancelled`,

                    performedBy:
                      req.user
                        ._id,
                  },
                ],

                {
                  session,
                }
              );

            result.inventory =
              inventory;

            result.transaction =
              transactionResult[0];

            result.releasedUnits =
              reservedUnits;
          }

          if (
            status ===
            "CANCELLED"
          ) {
            bloodRequest.status =
              "CANCELLED";

            bloodRequest.reservedUnits =
              0;
          } else {
            bloodRequest.status =
              status;
          }

          await bloodRequest.save({
            session,
          });

          // ==========================================
// FULFILLED → CREATE DONATION RECORD
// ==========================================

if (status === "FULFILLED") {
  // ------------------------------------------
  // Blood Bank must be assigned
  // ------------------------------------------

  if (!bloodRequest.bloodBank) {
    const error = new Error(
      "A Blood Bank must be assigned before the request can be fulfilled"
    );

    error.statusCode = 400;

    throw error;
  }

  // ------------------------------------------
  // Find the donor who accepted this request
  // ------------------------------------------

  const acceptedResponse =
    bloodRequest.donorResponses.find(
      (response) =>
        response.status === "ACCEPTED"
    );

  if (!acceptedResponse) {
    const error = new Error(
      "No accepted donor is linked to this blood request"
    );

    error.statusCode = 400;

    throw error;
  }

  // ------------------------------------------
  // Prevent duplicate donation record
  // ------------------------------------------

  const existingDonation =
    await Donation.findOne({
      donor:
        acceptedResponse.donor,

      bloodRequest:
        bloodRequest._id,

      status: {
        $in: [
          "SCHEDULED",
          "PENDING_VERIFICATION",
          "COMPLETED",
        ],
      },
    }).session(session);

  if (!existingDonation) {
    // ----------------------------------------
    // Get donor profile
    // ----------------------------------------

    const donor =
      await Donor.findById(
        acceptedResponse.donor
      ).session(session);

    if (!donor) {
      const error = new Error(
        "Accepted donor profile not found"
      );

      error.statusCode = 404;

      throw error;
    }

    // ----------------------------------------
    // Create pending donation
    // ----------------------------------------

    const [donation] =
      await Donation.create(
        [
          {
            donor:
              donor._id,

            bloodRequest:
              bloodRequest._id,

            bloodGroup:
              donor.bloodGroup,

            unitsDonated:
              Number(
                bloodRequest.unitsRequired || 1
              ),

            donationDate:
              new Date(),

            donationCenter:
              bloodRequest.bloodBank,

            city:
              bloodRequest.city ||
              donor.location?.city ||
              "",

            status:
              "PENDING_VERIFICATION",

            isVerified:
              false,

            verifiedBy:
              null,

            verifiedAt:
              null,

            rejectionReason:
              "",

            notes:
              "Automatically created after the linked blood request was fulfilled.",
          },
        ],
        {
          session,
        }
      );

    // ----------------------------------------
    // Store donation in result
    // ----------------------------------------

    result = {
      ...(result || {}),
      bloodRequest,
      donation,
      inventory: null,
      transaction: null,
      releasedUnits: 0,
    };
  }
}

          // =====================================
          // FULFILLED NOTIFICATION
          // =====================================

          if (
            status ===
            "FULFILLED"
          ) {
            const notificationDocs =
              await Notification.create(
                [
                  {
                    recipient:
                      bloodRequest
                        .createdBy,

                    type:
                      "REQUEST_FULFILLED",

                    title:
                      "Blood Request Fulfilled",

                    message:
                      "Your blood request has been fulfilled successfully.",

                    bloodRequest:
                      bloodRequest._id,
                  },
                ],
                {
                  session,
                }
              );

            result.notification = {
              recipient:
                bloodRequest.createdBy.toString(),

              notificationId:
                notificationDocs[0]._id.toString(),

              bloodRequestId:
                bloodRequest._id.toString(),

              title:
                "🩸 Blood Request Fulfilled",

              message:
                "Your blood request has been fulfilled successfully.",
            };
          }

          // =====================================
          // CANCELLED NOTIFICATION
          // =====================================

          if (
            status ===
            "CANCELLED"
          ) {
            const notificationDocs =
              await Notification.create(
                [
                  {
                    recipient:
                      bloodRequest
                        .createdBy,

                    type:
                      "REQUEST_CANCELLED",

                    title:
                      "Blood Request Cancelled",

                    message:
                      "Your blood request has been cancelled.",

                    bloodRequest:
                      bloodRequest._id,
                  },
                ],
                {
                  session,
                }
              );

            result.notification = {
              recipient:
                bloodRequest.createdBy.toString(),

              notificationId:
                notificationDocs[0]._id.toString(),

              bloodRequestId:
                bloodRequest._id.toString(),

              title:
                "🚫 Blood Request Cancelled",

              message:
                "Your blood request has been cancelled.",
            };
          }

          result.bloodRequest =
            bloodRequest;
        }
      );

      // =================================================
      // SEND PUSH AFTER TRANSACTION COMMIT
      // =================================================

      if (
        result?.notification
      ) {
        try {
          await sendPushToUser(
            result.notification
              .recipient,
            {
              title:
                result.notification
                  .title,

              message:
                result.notification
                  .message,

              tag:
                `blood-request-${result.notification.bloodRequestId}`,

              url:
                "/hospital",

              notificationId:
                result.notification
                  .notificationId,

              bloodRequestId:
                result.notification
                  .bloodRequestId,
            }
          );
        } catch (
          pushError
        ) {
          console.error(
            "Request status push notification error:",
            pushError
          );
        }
      }

      return res.status(200).json({
  success: true,

  message:
    status === "FULFILLED"
      ? "Blood request fulfilled and donation submitted for Blood Bank verification"
      : status === "CANCELLED"
        ? "Blood request cancelled and reserved blood released successfully"
        : "Blood request status updated successfully",

  bloodRequest:
    result.bloodRequest,

  ...(status === "FULFILLED" && {
    donation:
      result.donation || null,

    donationStatus:
      result.donation
        ? "PENDING_VERIFICATION"
        : null,
  }),

  ...(status === "CANCELLED" && {
    releasedUnits:
      result.releasedUnits,

    inventory:
      result.inventory,

    transaction:
      result.transaction,
  }),
});
    } catch (error) {
      console.error(
        "Update blood request status error:",
        error
      );

      return res
        .status(
          error.statusCode ||
            500
        )
        .json({
          success: false,

          message:
            error.statusCode
              ? error.message
              : "Server error",

          ...(process.env
            .NODE_ENV !==
          "production"
            ? {
                error:
                  error.message,
              }
            : {}),
        });
    } finally {
      await session.endSession();
    }
  };

// =====================================================
// GET DONOR RESPONSES
// =====================================================

const getDonorResponses =
  async (req, res) => {
    try {
      if (
        ![
          "HOSPITAL",
          "BLOOD_BANK",
          "ADMIN",
        ].includes(
          req.user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to view donor responses",
          });
      }

      const accessFilter =
        buildRequestAccessFilter(
          req
        );

      if (
        !accessFilter
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to access this request",
          });
      }

      const bloodRequest =
        await BloodRequest.findOne(
          accessFilter
        ).populate({
          path:
            "donorResponses.donor",

          populate: {
            path:
              "user",

            select:
              "name email phone",
          },
        });

      if (
        !bloodRequest
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Blood request not found or you are not authorized to access it",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          requestId:
            bloodRequest._id,

          bloodGroup:
            bloodRequest.bloodGroup,

          unitsRequired:
            bloodRequest.unitsRequired,

          status:
            bloodRequest.status,

          responses:
            bloodRequest.donorResponses,
        });
    } catch (error) {
      console.error(
        "Get donor responses error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while fetching donor responses",
        });
    }
  };

// =====================================================
// DELETE BLOOD REQUEST
// =====================================================

const deleteBloodRequest =
  async (req, res) => {
    try {
      if (
        ![
          "HOSPITAL",
          "ADMIN",
        ].includes(
          req.user.role
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only hospitals and admins can delete blood requests",
          });
      }

      const accessFilter =
        buildRequestAccessFilter(
          req
        );

      if (
        !accessFilter
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not authorized to delete this request",
          });
      }

      const bloodRequest =
        await BloodRequest.findOne(
          accessFilter
        );

      if (
        !bloodRequest
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Blood request not found or you are not authorized to delete it",
          });
      }

      if (
        bloodRequest
          .reservedUnits > 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Cannot delete a request with reserved blood. Cancel the request first.",
          });
      }

      if (
        bloodRequest.status ===
        "FULFILLED"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Fulfilled blood requests cannot be deleted",
          });
      }

      await BloodRequest.deleteOne({
        _id:
          bloodRequest._id,
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Blood request deleted successfully",
        });
    } catch (error) {
      console.error(
        "Delete blood request error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while deleting blood request",
        });
    }
  };

// =====================================================
// GET BLOOD REQUESTS FOR LOGGED-IN DONOR
// =====================================================

const getDonorAvailableRequests =
  async (req, res) => {
    try {
      // ------------------------------------------
      // ONLY DONORS
      // ------------------------------------------

      if (
        req.user.role !==
        "DONOR"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only donors can access available blood requests",
          });
      }

      // ------------------------------------------
      // FIND DONOR
      // ------------------------------------------

      const donor =
        await Donor.findOne({
          user:
            req.user._id,
        }).populate(
          "user",
          "name email phone isVerified isActive"
        );

      if (!donor) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Donor profile not found",
          });
      }

      // ------------------------------------------
      // USER ACTIVE CHECK
      // ------------------------------------------

      if (
        !donor.user ||
        donor.user.isActive !== true
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Your account is currently inactive",
          });
      }

      // ------------------------------------------
      // DONOR AVAILABILITY
      // ------------------------------------------

      if (
        !donor.isAvailable
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "Donor is currently unavailable",

            count: 0,

            requests: [],
          });
      }

      // ------------------------------------------
      // MEDICAL ELIGIBILITY
      // ------------------------------------------

      const DonorEligibility =
        require(
          "../models/DonorEligibility"
        );

      const eligibility =
        await DonorEligibility.findOne({
          donor:
            donor._id,
        });

      if (
        !eligibility ||
        eligibility.status !==
          "ELIGIBLE" ||
        donor.medicalEligible !==
          true
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "Donor is currently not medically eligible",

            count: 0,

            requests: [],
          });
      }

      // ------------------------------------------
      // DONOR BLOOD GROUP
      // ------------------------------------------

      if (
        !donor.bloodGroup
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "Donor blood group is not configured",

            count: 0,

            requests: [],
          });
      }

      // ------------------------------------------
      // DONOR LOCATION
      // ------------------------------------------

      const donorLatitude =
        Number(
          donor.location
            ?.coordinates
            ?.latitude
        );

      const donorLongitude =
        Number(
          donor.location
            ?.coordinates
            ?.longitude
        );

      const hasDonorCoordinates =
        Number.isFinite(
          donorLatitude
        ) &&
        Number.isFinite(
          donorLongitude
        );

      // ------------------------------------------
      // REQUEST AGE LIMIT
      // ------------------------------------------

      const sevenDaysAgo =
        new Date(
          Date.now() -
            7 *
              24 *
              60 *
              60 *
              1000
        );

      // ------------------------------------------
      // GET OPEN REQUESTS
      // ------------------------------------------

      const requests =
        await BloodRequest.find({
          status: "OPEN",

          createdAt: {
            $gte:
              sevenDaysAgo,
          },

          createdBy: {
            $ne:
              req.user._id,
          },
        })
          .populate(
            "createdBy",
            "name"
          )
          .sort({
            createdAt: -1,
          });

      // ------------------------------------------
      // GET ELIGIBLE REQUESTS
      // ------------------------------------------

      const eligibleRequests =
        requests.filter(
          (request) => {
            const compatibleDonors =
              compatibleBloodGroups[
                request
                  .bloodGroup
              ] || [];

            if (
              !compatibleDonors.includes(
                donor.bloodGroup
              )
            ) {
              return false;
            }

            const alreadyResponded =
              request.donorResponses?.some(
                (response) =>
                  response.donor?.toString() ===
                  donor._id.toString()
              );

            if (
              alreadyResponded
            ) {
              return false;
            }

            return true;
          }
        );

      // ------------------------------------------
      // CALCULATE DISTANCE
      // ------------------------------------------

      const requestsWithDistance =
        eligibleRequests
          .map(
            (request) => {
              const requestLatitude =
                Number(
                  request.location
                    ?.coordinates
                    ?.latitude
                );

              const requestLongitude =
                Number(
                  request.location
                    ?.coordinates
                    ?.longitude
                );

              let distanceKm =
                null;

              if (
                hasDonorCoordinates &&
                Number.isFinite(
                  requestLatitude
                ) &&
                Number.isFinite(
                  requestLongitude
                )
              ) {
                distanceKm =
                  Number(
                    calculateDistance(
                      donorLatitude,
                      donorLongitude,
                      requestLatitude,
                      requestLongitude
                    ).toFixed(2)
                  );
              }

              return {
                ...request.toObject(),

                distanceKm,

                compatibility:
                  "COMPATIBLE",
              };
            }
          )
          .filter(
            (request) => {
              if (
                request.distanceKm ===
                null
              ) {
                return false;
              }

              const radius =
                request.urgency ===
                "CRITICAL"
                  ? 100
                  : 50;

              return (
                request.distanceKm <=
                radius
              );
            }
          );

      // ------------------------------------------
      // SORT
      // ------------------------------------------

      requestsWithDistance.sort(
        (a, b) => {
          const urgencyDifference =
            (
              urgencyPriority[
                b.urgency
              ] || 0
            ) -
            (
              urgencyPriority[
                a.urgency
              ] || 0
            );

          if (
            urgencyDifference !== 0
          ) {
            return urgencyDifference;
          }

          const distanceDifference =
            (
              a.distanceKm ??
              Infinity
            ) -
            (
              b.distanceKm ??
              Infinity
            );

          if (
            distanceDifference !==
            0
          ) {
            return distanceDifference;
          }

          return (
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
          );
        }
      );

      // ------------------------------------------
      // MAX 10 REQUESTS
      // ------------------------------------------

      const limitedRequests =
        requestsWithDistance.slice(
          0,
          10
        );

      // ------------------------------------------
      // RESPONSE
      // ------------------------------------------

      return res
        .status(200)
        .json({
          success: true,

          donor: {
            id:
              donor._id,

            name:
              donor.user?.name ||
              null,

            bloodGroup:
              donor.bloodGroup,

            city:
              donor.location
                ?.city ||
              null,

            state:
              donor.location
                ?.state ||
              null,

            latitude:
              hasDonorCoordinates
                ? donorLatitude
                : null,

            longitude:
              hasDonorCoordinates
                ? donorLongitude
                : null,

            isAvailable:
              donor.isAvailable,

            emergencyAvailable:
              donor.emergencyAvailable,

            medicalEligible:
              donor.medicalEligible,
          },

          compatibleBloodGroups:
            Object.keys(
              compatibleBloodGroups
            ).filter(
              (
                requestBloodGroup
              ) =>
                compatibleBloodGroups[
                  requestBloodGroup
                ].includes(
                  donor.bloodGroup
                )
            ),

          count:
            limitedRequests.length,

          requests:
            limitedRequests,
        });
    } catch (error) {
      console.error(
        "Get donor available requests error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Server error while fetching donor blood requests",

          ...(process.env
            .NODE_ENV !==
          "production"
            ? {
                error:
                  error.message,
              }
            : {}),
        });
    }
  };// =====================================================
// GET BLOOD BANKS
// =====================================================

const getBloodBanks = async (req, res) => {
  try {
    if (!["HOSPITAL", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Hospital or Admin can list Blood Banks",
      });
    }

    const bloodBanks = await User.find({
      role: "BLOOD_BANK",
      isActive: { $ne: false },
    })
      .select("name email phone role isVerified")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bloodBanks.length,
      bloodBanks,
    });
  } catch (error) {
    console.error("Get Blood Banks error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load Blood Banks",
    });
  }
};


// =====================================================
// ASSIGN BLOOD BANK
// =====================================================

const assignBloodBank = async (req, res) => {
  try {
    if (!["HOSPITAL", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only Hospital or Admin can assign a Blood Bank",
      });
    }

    const { bloodBankId } = req.body;

    if (
      !bloodBankId ||
      !mongoose.Types.ObjectId.isValid(bloodBankId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid Blood Bank ID is required",
      });
    }

    const bloodBank = await User.findOne({
      _id: bloodBankId,
      role: "BLOOD_BANK",
      isActive: { $ne: false },
    }).select(
      "name email phone role isVerified"
    );

    if (!bloodBank) {
      return res.status(404).json({
        success: false,
        message: "Blood Bank not found or inactive",
      });
    }

    const filter = {
      _id: req.params.id,
    };

    if (req.user.role === "HOSPITAL") {
      filter.createdBy = req.user._id;
    }

    const bloodRequest = await BloodRequest.findOne(
      filter
    );

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message:
          "Blood request not found or not owned by this Hospital",
      });
    }

    if (
      ["FULFILLED", "CANCELLED"].includes(
        bloodRequest.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot assign a Blood Bank to a ${bloodRequest.status} request`,
      });
    }

    bloodRequest.bloodBank = bloodBank._id;

    await bloodRequest.save();

    // Notify Blood Bank
    try {
      await Notification.create({
        recipient: bloodBank._id,

        type: "BLOOD_REQUEST",

        title: "Blood Request Assigned",

        message:
          `${bloodRequest.hospitalName} assigned you a ` +
          `${bloodRequest.bloodGroup} blood request.`,

        bloodRequest: bloodRequest._id,
      });
    } catch (notificationError) {
      console.error(
        "Blood Bank notification error:",
        notificationError
      );
    }

    const populatedRequest =
      await BloodRequest.findById(
        bloodRequest._id
      )
        .populate(
          "bloodBank",
          "name email phone role isVerified"
        )
        .lean();

    return res.status(200).json({
      success: true,

      message:
        `${bloodBank.name} assigned to the request successfully`,

      bloodRequest: populatedRequest,
    });

  } catch (error) {
    console.error(
      "Assign Blood Bank error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to assign Blood Bank",

      ...(process.env.NODE_ENV !== "production"
        ? {
            error: error.message,
          }
        : {}),
    });
  }
};



// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createBloodRequest,
  getBloodRequests,
  getMyHospitalBloodRequests,
  getMatchingDonors,
  respondToBloodRequest,
  updateBloodRequestStatus,
  getDonorResponses,
  deleteBloodRequest,
  getDonorAvailableRequests,
  getBloodBanks,
assignBloodBank,
};