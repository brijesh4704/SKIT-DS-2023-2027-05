
const mongoose = require("mongoose");

const isValidLatitude = (value) =>
  Number.isFinite(value) && value >= -90 && value <= 90;

const isValidLongitude = (value) =>
  Number.isFinite(value) && value >= -180 && value <= 180;

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
      enum: [
        "A+", "A-", "B+", "B-",
        "AB+", "AB-", "O+", "O-",
        "UNKNOWN",
      ],
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
          validate: {
            validator: (value) =>
              value == null || isValidLatitude(value),
            message: "Invalid latitude",
          },
        },

        longitude: {
          type: Number,
          min: -180,
          max: 180,
          validate: {
            validator: (value) =>
              value == null || isValidLongitude(value),
            message: "Invalid longitude",
          },
        },

        geoPoint: {
          type: {
            type: String,
            enum: ["Point"],
          },

          coordinates: {
            type: [Number],
            validate: {
              validator: function (value) {
                if (value == null) return true;

                if (!Array.isArray(value) || value.length !== 2) {
                  return false;
                }

                const [longitude, latitude] = value;

                return (
                  isValidLongitude(longitude) &&
                  isValidLatitude(latitude)
                );
              },
              message:
                "Invalid GeoJSON coordinates. Expected [longitude, latitude].",
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
      min: 0,
    },

    medicalEligible: {
      type: Boolean,
      default: false,
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

// GeoJSON coordinates must be [longitude, latitude].
donorSchema.index({
  "location.coordinates.geoPoint": "2dsphere",
});

donorSchema.index({
  bloodGroup: 1,
  isAvailable: 1,
  medicalEligible: 1,
});

module.exports = mongoose.model("Donor", donorSchema);
