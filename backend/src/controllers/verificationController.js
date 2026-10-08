const {
  MODE,
} = require("../services/verificationService");

const getVerificationStatus = (req, res) => {
  const isTest =
    MODE === "test";

  res.status(200).json({
    success: true,
    mode: isTest
      ? "test"
      : "production",
    organizationVerification: {
      hospital:
        isTest
          ? "BloodLink Demo HFR Registry"
          : "ABDM Health Facility Registry",
      bloodBank:
        isTest
          ? "BloodLink Demo e-RaktKosh Registry"
          : "e-RaktKosh / authorized blood-centre registry",
    },
    medicalReportVerification:
      isTest
        ? "BloodLink Demo Trusted Lab Registry"
        : "Configured trusted medical-report issuer",
    note: isTest
      ? "TEST MODE ONLY. Demo registry records are used so the verification flow can be demonstrated without live government credentials."
      : "Production mode refuses to mark organizations/reports as verified unless a configured trusted verification provider confirms them.",
  });
};

const getTestData = (req, res) => {
  if (MODE !== "test") {
    return res.status(404).json({
      success: false,
      message: "Test verification data is disabled.",
    });
  }

  return res.status(200).json({
    success: true,
    hospital: {
      hfrId: "IN9912345678",
      hospitalName: "BloodLink Demo Hospital",
      registrationNumber: "CEA-TEST-RJ-2026-001",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
    },
    bloodBank: {
      eraktkoshId: "BBTEST0001",
      bloodBankName: "BloodLink Demo Blood Centre",
      licenseNumber: "BB-TEST-RJ-2026-001",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
    },
    medicalReport: {
      reportReference: "BL-MED-TEST-0001",
      issuerId: "LAB-TEST-001",
      issuerName: "BloodLink Demo Diagnostic Lab",
      donorName: "BloodLink Demo Donor",
      bloodGroup: "O+",
    },
  });
};

module.exports = {
  getVerificationStatus,
  getTestData,
};
