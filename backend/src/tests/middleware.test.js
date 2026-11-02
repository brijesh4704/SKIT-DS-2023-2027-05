const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../models/User");
const Donor = require("../models/Donor");
const BloodRequest = require("../models/BloodRequest");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  registerSchema,
  donorRegisterSchema,
  loginSchema,
} = require("../validators/authValidator");
const {
  updateDonorProfileSchema,
  updateAvailabilitySchema,
  searchDonorSchema,
} = require("../validators/donorValidator");

let mongoServer;

jest.setTimeout(60000);

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  delete process.env.ENFORCE_ORG_VERIFICATION;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Auth Middleware (protect & authorize)", () => {
  it("should reject missing, malformed, or invalid Bearer tokens with 401", async () => {
    for (const authHeader of [undefined, "Basic abc123", "Bearer invalid.jwt.token"]) {
      const req = { headers: authHeader ? { authorization: authHeader } : {} };
      const res = createMockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("should attach sanitized user (without password) for a valid token", async () => {
    const user = await User.create({
      name: "Guard User",
      email: "guard@example.com",
      phone: "9876500001",
      password: "hashedpassword123",
      role: "DONOR",
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.email).toBe("guard@example.com");
    expect(req.user.password).toBeUndefined();
  });

  it("should return 403 when ENFORCE_ORG_VERIFICATION is enabled for unverified hospital", async () => {
    process.env.ENFORCE_ORG_VERIFICATION = "true";

    const hospitalUser = await User.create({
      name: "Unverified Hospital",
      email: "unvhosp@example.com",
      phone: "9876500002",
      password: "hashedpassword123",
      role: "HOSPITAL",
      organizationVerified: false,
    });

    const token = jwt.sign({ id: hospitalUser._id, role: "HOSPITAL" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ORGANIZATION_NOT_VERIFIED" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should safely reject missing req.user with 401 and enforce allowed roles with 403", () => {
    const guard = authorize("HOSPITAL", "ADMIN");

    const noUserReq = {};
    const noUserRes = createMockRes();
    const noUserNext = jest.fn();
    guard(noUserReq, noUserRes, noUserNext);
    expect(noUserRes.status).toHaveBeenCalledWith(401);
    expect(noUserNext).not.toHaveBeenCalled();

    const wrongRoleReq = { user: { role: "DONOR" } };
    const wrongRoleRes = createMockRes();
    const wrongRoleNext = jest.fn();
    guard(wrongRoleReq, wrongRoleRes, wrongRoleNext);
    expect(wrongRoleRes.status).toHaveBeenCalledWith(403);
    expect(wrongRoleNext).not.toHaveBeenCalled();

    const validReq = { user: { role: "HOSPITAL" } };
    const validRes = createMockRes();
    const validNext = jest.fn();
    guard(validReq, validRes, validNext);
    expect(validNext).toHaveBeenCalledTimes(1);
  });
});

describe("Validation Middleware & Joi Schemas", () => {
  it("should strip unknown fields and normalize email via validate middleware", () => {
    const middleware = validate(loginSchema);
    const req = {
      body: {
        email: "  USER@Example.COM ",
        password: "Password123",
        injectedAdminFlag: true,
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({
      email: "user@example.com",
      password: "Password123",
    });
  });

  it("should enforce phone, pincode, coordinate bounds, and availability rules", () => {
    const { error: badPhone } = donorRegisterSchema.validate({
      name: "Ravi",
      email: "ravi@example.com",
      phone: "1234567890",
      password: "Password123",
      city: "Jaipur",
      state: "Rajasthan",
    });
    expect(badPhone).toBeDefined();

    const { error: badHospital } = registerSchema.validate({
      name: "Demo Hospital",
      email: "hosp@example.com",
      phone: "9876543210",
      password: "Password123",
      role: "HOSPITAL",
    });
    expect(badHospital).toBeDefined();

    const { error: badCoords } = updateDonorProfileSchema.validate({
      latitude: 120,
      pincode: "3020",
    });
    expect(badCoords).toBeDefined();

    const { error: emptyAvail } = updateAvailabilitySchema.validate({});
    expect(emptyAvail).toBeDefined();

    const { error: validSearch } = searchDonorSchema.validate({
      bloodGroup: "O-",
      radius: 25,
      isAvailable: true,
    });
    expect(validSearch).toBeUndefined();
  });
});

describe("Mongoose Domain Model Constraints", () => {
  it("should reject invalid GeoJSON coordinates on Donor and enforce BloodRequest minimums", async () => {
    const userId = new mongoose.Types.ObjectId();

    const badDonor = new Donor({
      user: userId,
      bloodGroup: "O+",
      location: {
        city: "Jaipur",
        state: "Rajasthan",
        coordinates: {
          geoPoint: {
            type: "Point",
            coordinates: [250, 26.9],
          },
        },
      },
    });
    await expect(badDonor.validate()).rejects.toThrow();

    const badReq = new BloodRequest({
      patientName: "Patient A",
      bloodGroup: "O+",
      unitsRequired: 0,
      hospitalName: "SMS Hospital",
      city: "Jaipur",
      location: { coordinates: { latitude: 26.9, longitude: 75.8 } },
      contactName: "Dr. Sharma",
      contactPhone: "9876543210",
      createdBy: userId,
    });
    await expect(badReq.validate()).rejects.toThrow();
  });
});
