const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");
const User = require("../models/User");

let mongoServer;

// Increase timeout for downloading MongoDB binaries if not cached
jest.setTimeout(60000);

// Mock email service and verification service since we don't want to actually send emails or do external calls during tests
jest.mock("../services/emailService", () => ({
  sendEmailOTP: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/verificationService", () => ({
  verifyHospital: jest.fn().mockResolvedValue({ verified: true, status: "VERIFIED" }),
  verifyBloodBank: jest.fn().mockResolvedValue({ verified: true, status: "VERIFIED" }),
  sha256File: jest.fn().mockReturnValue("testhash"),
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe("Auth API", () => {
  describe("POST /api/auth/register/donor", () => {
    it("should register a new donor successfully and require email verification", async () => {
      const donorData = {
        name: "Test Donor",
        email: "testdonor@example.com",
        phone: "9876543210",
        password: "Password123",
        bloodGroup: "O+",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001"
      };

      const res = await request(app)
        .post("/api/auth/register/donor")
        .send(donorData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresEmailVerification).toBe(true);
      
      const user = await User.findOne({ email: donorData.email });
      expect(user).toBeTruthy();
      expect(user.role).toBe("DONOR");
      
      // Test that the bug is fixed (these fields should exist in the document now)
      expect(user.emailVerificationOTP).toBeDefined();
      expect(user.emailVerificationOTPExpires).toBeDefined();
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/auth/register/donor")
        .send({
          name: "Incomplete Donor",
        });
      
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should prevent login if email is not verified", async () => {
      // First register a donor
      const donorData = {
        name: "Login Test Donor",
        email: "logintest@example.com",
        phone: "9876543211",
        password: "Password123",
        bloodGroup: "B+",
        city: "Delhi",
        state: "Delhi"
      };

      await request(app)
        .post("/api/auth/register/donor")
        .send(donorData);

      // Now try to login
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: donorData.email,
          password: donorData.password
        });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/verify your email/i);
    });
  });
});
