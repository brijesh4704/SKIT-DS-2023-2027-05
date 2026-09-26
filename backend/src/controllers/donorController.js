const Donor = require("../models/Donor");
const DonorEligibility = require("../models/DonorEligibility");
const EligibilityRule = require("../models/EligibilityRule");

// ==========================================
// BLOOD GROUP COMPATIBILITY
// ==========================================
// Red Blood Cell (RBC) donor compatibility

const compatibleDonorGroups = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],

  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],

  "AB+": [
    "AB+",
    "AB-",
    "A+",
    "A-",
    "B+",
    "B-",
    "O+",
    "O-",
  ],

  "AB-": [
    "AB-",
    "A-",
    "B-",
    "O-",
  ],

  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

// ==========================================
// CALCULATE DISTANCE BETWEEN TWO LOCATIONS
// ==========================================

const calculateDistance = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const R = 6371; // Earth radius in KM

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

// ==========================================
// GET DONOR PROFILE
// ==========================================
// GET /api/donors/profile
// ==========================================

const getDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({
      user: req.user._id,
    }).populate("user", "-password");

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      donor,
    });
  } catch (error) {
    console.error(
      "Get Donor Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching donor profile",
    });
  }
};

// ==========================================
// UPDATE DONOR PROFILE
// ==========================================
// PUT /api/donors/profile
// ==========================================

const updateDonorProfile = async (req, res) => {
  try {
    const {
      bloodGroup,
      dateOfBirth,
      gender,
      city,
      state,
      pincode,
      latitude,
      longitude,
      coordinates,
      emergencyAvailable,
    } = req.body;

    const donor = await Donor.findOne({
      user: req.user._id,
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found",
      });
    }

    // ------------------------------------------
    // BASIC FIELDS
    // ------------------------------------------

    if (bloodGroup !== undefined) {
      donor.bloodGroup = bloodGroup;
    }

    if (dateOfBirth !== undefined) {
      donor.dateOfBirth = dateOfBirth;
    }

    if (gender !== undefined) {
      donor.gender = gender;
    }

    // ------------------------------------------
    // LOCATION
    // ------------------------------------------

    if (!donor.location) {
      donor.location = {};
    }

    if (city !== undefined) {
      donor.location.city = city;
    }

    if (state !== undefined) {
      donor.location.state = state;
    }

    if (pincode !== undefined) {
      donor.location.pincode = pincode;
    }

    // ------------------------------------------
    // COORDINATES
    // ------------------------------------------

    if (!donor.location.coordinates) {
      donor.location.coordinates = {};
    }

    let updatedLatitude = null;
    let updatedLongitude = null;

    if (latitude !== undefined) {
      updatedLatitude = Number(latitude);

      donor.location.coordinates.latitude =
        updatedLatitude;
    } else if (
      coordinates?.latitude !== undefined
    ) {
      updatedLatitude =
        Number(coordinates.latitude);

      donor.location.coordinates.latitude =
        updatedLatitude;
    }

    if (longitude !== undefined) {
      updatedLongitude = Number(longitude);

      donor.location.coordinates.longitude =
        updatedLongitude;
    } else if (
      coordinates?.longitude !== undefined
    ) {
      updatedLongitude =
        Number(coordinates.longitude);

      donor.location.coordinates.longitude =
        updatedLongitude;
    }

    // ------------------------------------------
    // UPDATE GEOJSON POINT
    // ------------------------------------------

    const currentLatitude =
      updatedLatitude ??
      donor.location.coordinates.latitude;

    const currentLongitude =
      updatedLongitude ??
      donor.location.coordinates.longitude;

    if (
      currentLatitude !== undefined &&
      currentLongitude !== undefined &&
      Number.isFinite(
        Number(currentLatitude)
      ) &&
      Number.isFinite(
        Number(currentLongitude)
      )
    ) {
      donor.location.coordinates.geoPoint = {
        type: "Point",

        coordinates: [
          Number(currentLongitude),
          Number(currentLatitude),
        ],
      };
    }

    // ------------------------------------------
    // EMERGENCY AVAILABILITY
    // ------------------------------------------

    if (
      emergencyAvailable !== undefined
    ) {
      donor.emergencyAvailable =
        emergencyAvailable;
    }

    await donor.save();

    return res.status(200).json({
      success: true,
      message:
        "Donor profile updated successfully",
      donor,
    });
  } catch (error) {
    console.error(
      "Update Donor Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating donor profile",
    });
  }
};

// ==========================================
// UPDATE AVAILABILITY
// ==========================================
// PUT /api/donors/availability
// ==========================================

const updateAvailability = async (
  req,
  res
) => {
  try {
    const {
      isAvailable,
      emergencyAvailable,
    } = req.body;

    const donor = await Donor.findOne({
      user: req.user._id,
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found",
      });
    }

    if (isAvailable !== undefined) {
      donor.isAvailable = isAvailable;
    }

    if (
      emergencyAvailable !== undefined
    ) {
      donor.emergencyAvailable =
        emergencyAvailable;
    }

    await donor.save();

    return res.status(200).json({
      success: true,
      message:
        "Availability updated successfully",
      donor,
    });
  } catch (error) {
    console.error(
      "Update Availability Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating availability",
    });
  }
};

// ==========================================
// SEARCH DONORS NEARBY
// ==========================================
// GET /api/donors/search
// ==========================================

const searchDonors = async (req, res) => {
  try {
    const {
      bloodGroup,
      city,
      latitude,
      longitude,
      radius = 10,
    } = req.query;

    // ------------------------------------------
    // GET ELIGIBLE DONORS
    // ------------------------------------------

    const eligibleDonorRecords =
      await DonorEligibility.find({
        status: "ELIGIBLE",
      }).select("donor");

    const eligibleDonorIds =
      eligibleDonorRecords.map(
        (record) => record.donor
      );

    // ------------------------------------------
    // BASE FILTER
    // ------------------------------------------

    const filter = {
      _id: {
        $in: eligibleDonorIds,
      },

      // Only currently available donors
      isAvailable: true,

      // Exclude current logged-in donor
      user: {
        $ne: req.user._id,
      },
    };

    // ------------------------------------------
    // BLOOD GROUP COMPATIBILITY FILTER
    // ------------------------------------------

    if (bloodGroup) {
      const compatibleGroups =
        compatibleDonorGroups[bloodGroup];

      if (!compatibleGroups) {
        return res.status(400).json({
          success: false,
          message: "Invalid blood group",
        });
      }

      filter.bloodGroup = {
        $in: compatibleGroups,
      };
    }

    // ------------------------------------------
    // CITY FILTER
    // ------------------------------------------

    if (city) {
      filter["location.city"] = {
        $regex: city,
        $options: "i",
      };
    }

    // ------------------------------------------
    // CHECK LATITUDE + LONGITUDE
    // ------------------------------------------

    const hasLatitude =
      latitude !== undefined &&
      latitude !== "";

    const hasLongitude =
      longitude !== undefined &&
      longitude !== "";

    if (
      hasLatitude !== hasLongitude
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Both latitude and longitude are required",
      });
    }

    // ------------------------------------------
    // RADIUS VALIDATION
    // ------------------------------------------

    const searchRadius = Number(radius);

    if (
      !Number.isFinite(searchRadius) ||
      searchRadius <= 0 ||
      searchRadius > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Radius must be between 1 and 100 km",
      });
    }

    let userLatitude = null;
    let userLongitude = null;

    // ------------------------------------------
    // GEO SEARCH
    // ------------------------------------------

    if (
      hasLatitude &&
      hasLongitude
    ) {
      userLatitude = Number(latitude);
      userLongitude = Number(longitude);

      // ------------------------------------------
      // LATITUDE VALIDATION
      // ------------------------------------------

      if (
        !Number.isFinite(userLatitude) ||
        userLatitude < -90 ||
        userLatitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude",
        });
      }

      // ------------------------------------------
      // LONGITUDE VALIDATION
      // ------------------------------------------

      if (
        !Number.isFinite(userLongitude) ||
        userLongitude < -180 ||
        userLongitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid longitude",
        });
      }

      // ------------------------------------------
      // MONGODB GEO QUERY
      // ------------------------------------------

      filter[
        "location.coordinates.geoPoint"
      ] = {
        $near: {
          $geometry: {
            type: "Point",

            coordinates: [
              userLongitude,
              userLatitude,
            ],
          },

          $maxDistance:
            searchRadius * 1000,
        },
      };
    }

    // ------------------------------------------
    // FIND DONORS
    // ------------------------------------------

    const donors = await Donor.find(filter)
      .populate(
        "user",
        "name email phone"
      )
      .select("-__v");

    // ------------------------------------------
    // ADD DISTANCE TO EVERY DONOR
    // ------------------------------------------

    const donorsWithDistance =
      donors.map((donor) => {
        const donorData =
          donor.toObject();

        const donorLatitude =
          donor.location?.coordinates
            ?.latitude;

        const donorLongitude =
          donor.location?.coordinates
            ?.longitude;

        if (
          userLatitude !== null &&
          userLongitude !== null &&
          Number.isFinite(
            Number(donorLatitude)
          ) &&
          Number.isFinite(
            Number(donorLongitude)
          )
        ) {
          donorData.distanceKm =
            Number(
              calculateDistance(
                userLatitude,
                userLongitude,
                Number(donorLatitude),
                Number(donorLongitude)
              ).toFixed(2)
            );
        } else {
          donorData.distanceKm = null;
        }

        return donorData;
      });

    // ------------------------------------------
    // SMART DONOR RANKING
    // ------------------------------------------

    if (
      userLatitude !== null &&
      userLongitude !== null
    ) {
      donorsWithDistance.sort(
        (a, b) => {
          // 1. Emergency available donor first

          if (
            a.emergencyAvailable !==
            b.emergencyAvailable
          ) {
            return a.emergencyAvailable
              ? -1
              : 1;
          }

          // 2. Higher rating first

          if (
            (a.rating ?? 0) !==
            (b.rating ?? 0)
          ) {
            return (
              (b.rating ?? 0) -
              (a.rating ?? 0)
            );
          }

          // 3. Nearest donor first

          return (
            (a.distanceKm ?? Infinity) -
            (b.distanceKm ?? Infinity)
          );
        }
      );
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,

      count:
        donorsWithDistance.length,

      search: {
        bloodGroup:
          bloodGroup || null,

        compatibleDonorGroups:
          bloodGroup
            ? compatibleDonorGroups[
                bloodGroup
              ] || []
            : [],

        city:
          city || null,

        latitude:
          userLatitude !== null
            ? userLatitude
            : null,

        longitude:
          userLongitude !== null
            ? userLongitude
            : null,

        radiusKm:
          searchRadius,
      },

      donors:
        donorsWithDistance,
    });
  } catch (error) {
    console.error(
      "Search Donors Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while searching donors",
    });
  }
};

// ==========================================
// RECORD BLOOD DONATION
// ==========================================
// POST /api/donors/donate
// ==========================================

const recordDonation = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // FIND DONOR
    // ------------------------------------------

    const donor = await Donor.findOne({
      user: req.user._id,
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found",
      });
    }

    // ------------------------------------------
    // GET ACTIVE DONATION WAITING RULE
    // ------------------------------------------

    const donationRule =
      await EligibilityRule.findOne({
        ruleKey:
          "BLOOD_DONATION_WAITING",

        isActive: true,
      });

    if (!donationRule) {
      return res.status(500).json({
        success: false,
        message:
          "Blood donation eligibility rule is not configured",
      });
    }

    // ------------------------------------------
    // RECORD DONATION
    // ------------------------------------------

    donor.lastDonationDate =
      new Date();

    donor.totalDonations =
      (donor.totalDonations || 0) + 1;

    // Donor becomes unavailable
    // after donation

    donor.isAvailable = false;

    await donor.save();

    // ------------------------------------------
    // CALCULATE NEXT ELIGIBLE DATE
    // ------------------------------------------

    const nextEligibleDate =
      new Date(
        donor.lastDonationDate
      );

    nextEligibleDate.setDate(
      nextEligibleDate.getDate() +
        donationRule.waitingDays
    );

    // ------------------------------------------
    // SYNC DONOR ELIGIBILITY
    // ------------------------------------------

    await DonorEligibility.findOneAndUpdate(
      {
        donor: donor._id,
      },

      {
        lastDonationDate:
          donor.lastDonationDate,

        nextEligibleDate,

        status:
          "TEMPORARILY_INELIGIBLE",

        lastAssessmentDate:
          new Date(),
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        "Donation recorded successfully",

      donor,

      nextEligibleDate,

      waitingDays:
        donationRule.waitingDays,
    });
  } catch (error) {
    console.error(
      "Donation record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while recording donation",
    });
  }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getDonorProfile,
  updateDonorProfile,
  updateAvailability,
  searchDonors,
  recordDonation,
};