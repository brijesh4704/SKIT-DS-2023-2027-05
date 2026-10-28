const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const request = require("supertest");

const app = require("../app");
const registry = require("../data/verificationRegistry.json");
const {
  verifyHospital,
  verifyBloodBank,
  verifyMedicalReport,
  extractReportReference,
  sha256File,
} = require("../services/verificationService");

describe("Verification API & Service", () => {
  describe("HTTP Endpoints", () => {
    it("GET /api/health should return service health", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, status: "ok" });
    });

    it("GET /api/verification/status should return active verification mode and providers", async () => {
      const res = await request(app).get("/api/verification/status");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe("test");
      expect(res.body.organizationVerification.hospital).toBeTruthy();
      expect(res.body.organizationVerification.bloodBank).toBeTruthy();
    });

    it("GET /api/verification/test-data should return sample credentials in test mode", async () => {
      const res = await request(app).get("/api/verification/test-data");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hospital.hfrId).toBe(registry.hospitals[0].hfrId);
      expect(res.body.bloodBank.licenseNumber).toBe(registry.bloodBanks[0].licenseNumber);
      expect(res.body.medicalReport.reportReference).toBe(registry.medicalReports[0].reportReference);
    });
  });

  describe("sha256File & extractReportReference", () => {
    it("should compute accurate SHA-256 hash of a file", () => {
      const tmpPath = path.join(os.tmpdir(), `bloodlink_hash_test_${Date.now()}.txt`);
      const content = "BloodLink Verification Certificate Test";
      fs.writeFileSync(tmpPath, content, "utf8");

      try {
        const expected = crypto.createHash("sha256").update(content).digest("hex");
        expect(sha256File(tmpPath)).toBe(expected);
      } finally {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    });

    it("should extract report reference numbers from OCR text", () => {
      expect(extractReportReference("Lab Diagnostics\nReport ID: BL-MED-TEST-0001\nDonor: Test")).toBe(
        "BL-MED-TEST-0001"
      );
      expect(extractReportReference("Report Reference # LAB-9988/A")).toBe("LAB-9988/A");
      expect(extractReportReference("No identifier present")).toBe("");
    });
  });

  describe("verifyHospital", () => {
    const validHospital = registry.hospitals[0];

    it("should verify a hospital matching registry identity, location, and SHA-256 fingerprint", async () => {
      const result = await verifyHospital({
        hfrId: validHospital.hfrId,
        registrationNumber: validHospital.registrationNumber,
        hospitalName: validHospital.hospitalName,
        city: validHospital.city,
        state: validHospital.state,
        documentSha256: validHospital.documentSha256,
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe("VERIFIED");
      expect(result.reference).toBe(validHospital.hfrId);
    });

    it("should reject a hospital when document SHA-256 or location does not match", async () => {
      const tamperedDoc = await verifyHospital({
        ...validHospital,
        documentSha256: "0000000000000000000000000000000000000000000000000000000000000000",
      });
      expect(tamperedDoc.verified).toBe(false);
      expect(tamperedDoc.status).toBe("REJECTED");

      const wrongCity = await verifyHospital({
        ...validHospital,
        city: "UnknownCity",
      });
      expect(wrongCity.verified).toBe(false);
      expect(wrongCity.status).toBe("REJECTED");
    });
  });

  describe("verifyBloodBank", () => {
    const validBank = registry.bloodBanks[0];

    it("should verify a valid blood bank record", async () => {
      const result = await verifyBloodBank({
        licenseNumber: validBank.licenseNumber,
        bloodBankName: validBank.bloodBankName,
        city: validBank.city,
        state: validBank.state,
        documentSha256: validBank.documentSha256,
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe("VERIFIED");
    });

    it("should reject an unknown license number or mismatched hash", async () => {
      const unknown = await verifyBloodBank({
        ...validBank,
        licenseNumber: "INVALID-LIC-999",
      });
      expect(unknown.verified).toBe(false);
      expect(unknown.status).toBe("REJECTED");
    });
  });

  describe("verifyMedicalReport", () => {
    const validReport = registry.medicalReports[0];

    it("should verify report using extracted text reference and donor details", async () => {
      const result = await verifyMedicalReport({
        extractedText: `Patient: ${validReport.donorName}\nReport No: ${validReport.reportReference}\nBlood Group: O+`,
        issuerId: validReport.issuerId,
        donorName: validReport.donorName,
        bloodGroup: validReport.bloodGroup,
        documentSha256: validReport.documentSha256,
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe("VERIFIED");
      expect(result.reportReference).toBe(validReport.reportReference);
    });

    it("should reject when blood group or donor name mismatches registry record", async () => {
      const wrongGroup = await verifyMedicalReport({
        reportReference: validReport.reportReference,
        issuerId: validReport.issuerId,
        donorName: validReport.donorName,
        bloodGroup: "AB-",
        documentSha256: validReport.documentSha256,
      });
      expect(wrongGroup.verified).toBe(false);
      expect(wrongGroup.status).toBe("REJECTED");

      const wrongName = await verifyMedicalReport({
        reportReference: validReport.reportReference,
        issuerId: validReport.issuerId,
        donorName: "Different Person",
        bloodGroup: validReport.bloodGroup,
        documentSha256: validReport.documentSha256,
      });
      expect(wrongName.verified).toBe(false);
      expect(wrongName.status).toBe("REJECTED");
    });
  });

  describe("Production Verification Guard", () => {
    afterEach(() => {
      delete process.env.VERIFICATION_MODE;
      jest.resetModules();
    });

    it("should refuse verification and return UNAVAILABLE when production provider URL is not configured", async () => {
      process.env.VERIFICATION_MODE = "production";
      jest.resetModules();

      const prodService = require("../services/verificationService");
      const res = await prodService.verifyHospital({
        hfrId: "IN9912345678",
        hospitalName: "Test Hospital",
      });

      expect(res.verified).toBe(false);
      expect(res.status).toBe("UNAVAILABLE");
    });
  });
});
