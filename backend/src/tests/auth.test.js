const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");
const User = require("../models/User");
const { sendEmailOTP } = require("../services/emailService");

let mongoServer;

jest.setTimeout(60000);

jest.mock("../services/emailService", () => ({
  sendEmailOTP: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/verificationService", () => ({
  verifyHospital: jest.fn().mockResolvedValue({ verified: true, status: "VERIFIED" }),
  verifyBloodBank: jest.fn().mockResolvedValue({ verified: true, status: "VERIFIED" }),
  sha256File: jest.fn().mockReturnValue("testhash"),
}));

const createDonorPayload = (overrides = {}) => ({
  name: "Test Donor",
  email: "testdonor@example.com",
  phone: "9876543210",
  password: "Password123",
  bloodGroup: "O+",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Auth API", () => {
  describe("POST /api/auth/register/donor", () => {
    it("should register a new donor successfully and store hashed OTP", async () => {
      const donorData = createDonorPayload();

      const res = await request(app)
        .post("/api/auth/register/donor")
        .send(donorData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresEmailVerification).toBe(true);
      expect(sendEmailOTP).toHaveBeenCalledWith(donorData.email, expect.stringMatching(/^\d{6}$/));

      const user = await User.findOne({ email: donorData.email });
      expect(user).toBeTruthy();
      expect(user.role).toBe("DONOR");
      expect(user.emailVerificationOTP).toBeDefined();
      expect(user.emailVerificationOTPExpires).toBeDefined();
    });

    it("should return 409 when registering with duplicate email or phone", async () => {
      await request(app).post("/api/auth/register/donor").send(createDonorPayload());

      const dupEmail = await request(app)
        .post("/api/auth/register/donor")
        .send(createDonorPayload({ phone: "9876543299" }));
      expect(dupEmail.status).toBe(409);

      const dupPhone = await request(app)
        .post("/api/auth/register/donor")
        .send(createDonorPayload({ email: "other@example.com" }));
      expect(dupPhone.status).toBe(409);
    });

    it("should return 400 if required fields are missing or phone is invalid", async () => {
      const missingRes = await request(app)
        .post("/api/auth/register/donor")
        .send({ name: "Incomplete Donor" });
      expect(missingRes.status).toBe(400);

      const badPhoneRes = await request(app)
        .post("/api/auth/register/donor")
        .send(createDonorPayload({ phone: "12345" }));
      expect(badPhoneRes.status).toBe(400);
    });
  });

  describe("POST /api/auth/register", () => {
    it("should block public registration with ADMIN role", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Fake Admin",
        email: "admin@example.com",
        phone: "9876543212",
        password: "Password123",
        role: "ADMIN",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should require verification document when registering as HOSPITAL or BLOOD_BANK", async () => {
      const hospitalRes = await request(app).post("/api/auth/register").send({
        name: "City Care Hospital",
        email: "hospital@example.com",
        phone: "9876543213",
        password: "Password123",
        role: "HOSPITAL",
        hfrId: "IN9912345678",
        registrationNumber: "CEA-TEST-RJ-2026-001",
        address: "12 MG Road",
        city: "Jaipur",
        state: "Rajasthan",
      });

      expect(hospitalRes.status).toBe(400);
      expect(hospitalRes.body.code).toBe("ORGANIZATION_DOCUMENT_REQUIRED");

      const bankRes = await request(app).post("/api/auth/register").send({
        name: "Red Cross Bank",
        email: "bank@example.com",
        phone: "9876543214",
        password: "Password123",
        role: "BLOOD_BANK",
        licenseNumber: "BB-TEST-RJ-2026-001",
        address: "45 Station Road",
        city: "Jaipur",
        state: "Rajasthan",
      });

      expect(bankRes.status).toBe(400);
      expect(bankRes.body.code).toBe("ORGANIZATION_DOCUMENT_REQUIRED");
    });
  });

  describe("POST /api/auth/verify-email-otp & /resend-email-otp", () => {
    it("should verify email with valid OTP and reject reuse afterward", async () => {
      const donorData = createDonorPayload({ email: "otpverify@example.com", phone: "9876543215" });
      await request(app).post("/api/auth/register/donor").send(donorData);

      const sentOtp = sendEmailOTP.mock.calls[0][1];

      const wrongRes = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: donorData.email, otp: "000000" });
      expect(wrongRes.status).toBe(400);

      const verifyRes = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: donorData.email, otp: sentOtp });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.emailVerified).toBe(true);

      const reuseRes = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: donorData.email, otp: sentOtp });
      expect(reuseRes.status).toBe(400);
    });

    it("should reject expired OTPs", async () => {
      const donorData = createDonorPayload({ email: "expired@example.com", phone: "9876543216" });
      await request(app).post("/api/auth/register/donor").send(donorData);
      const sentOtp = sendEmailOTP.mock.calls[0][1];

      await User.updateOne(
        { email: donorData.email },
        { emailVerificationOTPExpires: new Date(Date.now() - 60 * 1000) }
      );

      const res = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: donorData.email, otp: sentOtp });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it("should resend a fresh OTP and invalidate the old one", async () => {
      const donorData = createDonorPayload({ email: "resend@example.com", phone: "9876543217" });
      await request(app).post("/api/auth/register/donor").send(donorData);
      const firstOtp = sendEmailOTP.mock.calls[0][1];

      const resendRes = await request(app)
        .post("/api/auth/resend-email-otp")
        .send({ email: donorData.email });
      expect(resendRes.status).toBe(200);
      expect(sendEmailOTP).toHaveBeenCalledTimes(2);

      const secondOtp = sendEmailOTP.mock.calls[1][1];

      if (firstOtp !== secondOtp) {
        const oldTry = await request(app)
          .post("/api/auth/verify-email-otp")
          .send({ email: donorData.email, otp: firstOtp });
        expect(oldTry.status).toBe(400);
      }

      const verifyNew = await request(app)
        .post("/api/auth/verify-email-otp")
        .send({ email: donorData.email, otp: secondOtp });
      expect(verifyNew.status).toBe(200);

      const resendAfterVerify = await request(app)
        .post("/api/auth/resend-email-otp")
        .send({ email: donorData.email });
      expect(resendAfterVerify.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should prevent login if email is not verified", async () => {
      const donorData = createDonorPayload({ email: "unverified@example.com", phone: "9876543211" });
      await request(app).post("/api/auth/register/donor").send(donorData);

      const res = await request(app).post("/api/auth/login").send({
        email: donorData.email,
        password: donorData.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/verify your email/i);
    });

    it("should log in a verified user and return a valid JWT token", async () => {
      const donorData = createDonorPayload({ email: "verified@example.com", phone: "9876543218" });
      await request(app).post("/api/auth/register/donor").send(donorData);
      const otp = sendEmailOTP.mock.calls[0][1];

      await request(app).post("/api/auth/verify-email-otp").send({
        email: donorData.email,
        otp,
      });

      const loginRes = await request(app).post("/api/auth/login").send({
        email: donorData.email,
        password: donorData.password,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.token).toBeTruthy();

      const decoded = jwt.verify(loginRes.body.token, process.env.JWT_SECRET);
      expect(decoded.role).toBe("DONOR");
      expect(loginRes.body.user.email).toBe(donorData.email);
    });

    it("should reject wrong password, unknown email, and inactive accounts", async () => {
      const donorData = createDonorPayload({ email: "badlogin@example.com", phone: "9876543219" });
      await request(app).post("/api/auth/register/donor").send(donorData);

      const wrongPass = await request(app).post("/api/auth/login").send({
        email: donorData.email,
        password: "WrongPassword999",
      });
      expect(wrongPass.status).toBe(401);
      expect(wrongPass.body.code).toBe("PASSWORD_INCORRECT");

      const unknownEmail = await request(app).post("/api/auth/login").send({
        email: "nobody@example.com",
        password: "Password123",
      });
      expect(unknownEmail.status).toBe(401);
      expect(unknownEmail.body.code).toBe("EMAIL_NOT_FOUND");

      await User.updateOne({ email: donorData.email }, { isActive: false });
      const inactiveRes = await request(app).post("/api/auth/login").send({
        email: donorData.email,
        password: donorData.password,
      });
      expect(inactiveRes.status).toBe(403);
      expect(inactiveRes.body.code).toBe("ACCOUNT_INACTIVE");
    });
  });

  describe("POST /api/auth/forgot-password & /reset-password/:token", () => {
    it("should complete password reset flow and reject reused/invalid tokens", async () => {
      const donorData = createDonorPayload({ email: "resetpw@example.com", phone: "9876543220" });
      await request(app).post("/api/auth/register/donor").send(donorData);
      const otp = sendEmailOTP.mock.calls[0][1];
      await request(app).post("/api/auth/verify-email-otp").send({ email: donorData.email, otp });

      const unknownForgot = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "ghost@example.com" });
      expect(unknownForgot.status).toBe(200);
      expect(unknownForgot.body.resetToken).toBeUndefined();

      const forgotRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: donorData.email });
      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.resetToken).toBeTruthy();

      const badTokenRes = await request(app)
        .post("/api/auth/reset-password/invalidtoken123")
        .send({ password: "NewPassword123" });
      expect(badTokenRes.status).toBe(400);

      const resetRes = await request(app)
        .post(`/api/auth/reset-password/${forgotRes.body.resetToken}`)
        .send({ password: "NewPassword123" });
      expect(resetRes.status).toBe(200);

      const reuseRes = await request(app)
        .post(`/api/auth/reset-password/${forgotRes.body.resetToken}`)
        .send({ password: "AnotherPassword123" });
      expect(reuseRes.status).toBe(400);

      const oldLogin = await request(app).post("/api/auth/login").send({
        email: donorData.email,
        password: donorData.password,
      });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app).post("/api/auth/login").send({
        email: donorData.email,
        password: "NewPassword123",
      });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.token).toBeTruthy();
    });
  });
});
