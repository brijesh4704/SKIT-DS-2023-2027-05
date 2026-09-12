const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },

    location: {
      address: {
        type: String,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      state: {
        type: String,
        required: true,
        trim: true,
      },

      pincode: {
        type: String,
        trim: true,
      },

      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90,
        },

        longitude: {
          type: Number,
          min: -180,
          max: 180,
        },

        // GeoJSON Point
        geoPoint: {
          type: {
            type: String,
            enum: ["Point"],
          },

          coordinates: {
            type: [Number],

            validate: {
              validator: function (value) {
                return (
                  value.length === 2 &&
                  value[0] >= -180 &&
                  value[0] <= 180 &&
                  value[1] >= -90 &&
                  value[1] <= 90
                );
              },

              message: "Invalid GeoJSON coordinates",
            },
          },
        },
      },
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    lastDonationDate: {
      type: Date,
      default: null,
    },

    totalDonations: {
      type: Number,
      default: 0,
    },

    medicalEligible: {
      type: Boolean,
      default: true,
    },

    emergencyAvailable: {
      type: Boolean,
      default: true,
    },

    responseRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
  },

  {
    timestamps: true,
  }
);

// ==========================================
// GEOSPATIAL INDEX
// ==========================================

donorSchema.index({
  "location.coordinates.geoPoint": "2dsphere",
});

// ==========================================
// DONOR SEARCH INDEX
// ==========================================

donorSchema.index({
  bloodGroup: 1,
  isAvailable: 1,
  medicalEligible: 1,
});

module.exports = mongoose.model("Donor", donorSchema);