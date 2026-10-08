const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MODE = String(
  process.env.VERIFICATION_MODE || "test"
).toLowerCase();

const registryPath = path.join(
  __dirname,
  "../data/verificationRegistry.json"
);

const normalize = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeId = (value = "") =>
  String(value).trim().toUpperCase();

const loadRegistry = () => {
  try {
    return JSON.parse(
      fs.readFileSync(registryPath, "utf8")
    );
  } catch (error) {
    console.error(
      "Verification registry load failed:",
      error.message
    );

    return {
      hospitals: [],
      bloodBanks: [],
      medicalReports: [],
    };
  }
};

const matchLocation = (record, input) => {
  const cityMatches =
    !record.city ||
    !input.city ||
    normalize(record.city) === normalize(input.city);

  const stateMatches =
    !record.state ||
    !input.state ||
    normalize(record.state) === normalize(input.state);

  return cityMatches && stateMatches;
};

const verifyHospitalInTestRegistry = (input) => {
  const registry = loadRegistry();
  const hfrId = normalizeId(input.hfrId);
  const registrationNumber = normalizeId(input.registrationNumber);

  const record = registry.hospitals.find(
    (item) =>
      normalizeId(item.hfrId) === hfrId &&
      normalizeId(item.registrationNumber) === registrationNumber
  );

  if (!record) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo HFR Registry",
      message:
        "Hospital HFR ID and registration number were not found in the verification registry.",
    };
  }

  if (
    record.documentSha256 &&
    input.documentSha256 !== record.documentSha256
  ) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo HFR Registry",
      message:
        "The uploaded hospital certificate does not match the registry's registered document fingerprint.",
    };
  }

  const nameMatches =
    normalize(record.hospitalName) === normalize(input.hospitalName);

  if (!nameMatches || !matchLocation(record, input)) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo HFR Registry",
      message:
        "Hospital identity details do not match the registry record.",
    };
  }

  return {
    verified: true,
    status: "VERIFIED",
    source: "BloodLink Demo HFR Registry",
    message:
      "Hospital identity, HFR ID, registration number, location and document fingerprint matched.",
    reference: record.hfrId,
  };
};

const verifyBloodBankInTestRegistry = (input) => {
  const registry = loadRegistry();
  const licenseNumber = normalizeId(input.licenseNumber);

  const record = registry.bloodBanks.find(
    (item) =>
      normalizeId(item.licenseNumber) === licenseNumber
  );

  if (!record) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo e-RaktKosh Registry",
      message:
        "Blood-bank licence number was not found in the verification registry.",
    };
  }

  if (
    record.documentSha256 &&
    input.documentSha256 !== record.documentSha256
  ) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo e-RaktKosh Registry",
      message:
        "The uploaded blood-bank licence does not match the registry's registered document fingerprint.",
    };
  }

  const nameMatches =
    normalize(record.bloodBankName) === normalize(input.bloodBankName);

  if (!nameMatches || !matchLocation(record, input)) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo e-RaktKosh Registry",
      message:
        "Blood-bank identity, licence number or location does not match the registry.",
    };
  }

  const endDate = record.licenseEndDate
    ? new Date(record.licenseEndDate)
    : null;

  if (
    endDate &&
    !Number.isNaN(endDate.getTime()) &&
    endDate < new Date()
  ) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo e-RaktKosh Registry",
      message:
        "The blood-bank licence in the registry is expired.",
    };
  }

  return {
    verified: true,
    status: "VERIFIED",
    source: "BloodLink Demo e-RaktKosh Registry",
    message:
      "Blood-bank name, licence number, location and document fingerprint matched the registry.",
    reference: record.eraktkoshId || record.licenseNumber,
  };
};

const extractReportReference = (text = "") => {
  const normalized = String(text)
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ");

  const match = normalized.match(
    /(?:report\s*(?:id|no|number|reference)|lab\s*(?:id|no|number))\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{3,})/i
  );

  return match ? match[1].trim().toUpperCase() : "";
};

const verifyMedicalReportInTestRegistry = (input) => {
  const registry = loadRegistry();

  const extractedReference = normalizeId(
    input.reportReference ||
      extractReportReference(input.extractedText)
  );

  const issuerId = normalizeId(input.issuerId);

  const record = registry.medicalReports.find(
    (item) =>
      normalizeId(item.reportReference) === extractedReference &&
      (!issuerId || normalizeId(item.issuerId) === issuerId)
  );

  if (!record) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo Trusted Lab Registry",
      message:
        "The medical report reference/issuer could not be independently matched.",
      reportReference: extractedReference,
    };
  }

  if (
    record.documentSha256 &&
    input.documentSha256 !== record.documentSha256
  ) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo Trusted Lab Registry",
      message:
        "The uploaded medical report does not match the trusted issuer's registered document fingerprint.",
      reportReference: extractedReference,
    };
  }

  if (
    input.donorName &&
    normalize(record.donorName) !== normalize(input.donorName)
  ) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo Trusted Lab Registry",
      message:
        "The report patient/donor name does not match the registered donor.",
      reportReference: extractedReference,
    };
  }

  if (
    input.bloodGroup &&
    input.bloodGroup !== "UNKNOWN" &&
    record.bloodGroup &&
    normalizeId(record.bloodGroup) !== normalizeId(input.bloodGroup)
  ) {
    return {
      verified: false,
      status: "REJECTED",
      source: "BloodLink Demo Trusted Lab Registry",
      message:
        "The blood group on the report does not match the donor profile.",
      reportReference: extractedReference,
    };
  }

  return {
    verified: true,
    status: "VERIFIED",
    source: "BloodLink Demo Trusted Lab Registry",
    message:
      "Medical report reference, issuer, donor details and document fingerprint matched the trusted registry.",
    reportReference: record.reportReference,
    issuerName: record.issuerName,
    issuerId: record.issuerId,
  };
};

const callExternalVerifier = async ({
  url,
  token,
  payload,
  source,
}) => {
  if (!url) {
    return {
      verified: false,
      status: "UNAVAILABLE",
      source,
      message:
        "Production verification provider is not configured. Refusing to mark the identity as verified.",
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        verified: false,
        status: "UNAVAILABLE",
        source,
        message:
          data?.message ||
          `Verification provider returned HTTP ${response.status}.`,
      };
    }

    const verified =
      data?.verified === true ||
      data?.status === "VERIFIED";

    return {
      verified,
      status: verified ? "VERIFIED" : "REJECTED",
      source,
      message:
        data?.message ||
        (verified
          ? "External verification succeeded."
          : "External verification failed."),
      reference:
        data?.reference ||
        data?.facilityId ||
        data?.licenseNumber ||
        null,
      raw: data,
    };
  } catch (error) {
    return {
      verified: false,
      status: "UNAVAILABLE",
      source,
      message:
        `Verification provider could not be reached: ${error.message}`,
    };
  }
};

const verifyHospital = async (input) => {
  if (MODE === "test") {
    return verifyHospitalInTestRegistry(input);
  }

  return callExternalVerifier({
    url: process.env.ABDM_HFR_VERIFY_URL,
    token: process.env.ABDM_HFR_API_TOKEN,
    source: "ABDM Health Facility Registry",
    payload: {
      hfrId: input.hfrId,
      hospitalName: input.hospitalName,
      registrationNumber: input.registrationNumber,
      registrationAuthority: input.registrationAuthority,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      documentSha256: input.documentSha256,
    },
  });
};

const verifyBloodBank = async (input) => {
  if (MODE === "test") {
    return verifyBloodBankInTestRegistry(input);
  }

  return callExternalVerifier({
    url: process.env.ERAKTKOSH_VERIFY_URL,
    token: process.env.ERAKTKOSH_API_TOKEN,
    source: "e-RaktKosh / authorized blood-centre registry",
    payload: {
      eraktkoshId: input.eraktkoshId,
      bloodBankName: input.bloodBankName,
      licenseNumber: input.licenseNumber,
      licenseStartDate: input.licenseStartDate,
      licenseEndDate: input.licenseEndDate,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      documentSha256: input.documentSha256,
    },
  });
};

const verifyMedicalReport = async (input) => {
  if (MODE === "test") {
    return verifyMedicalReportInTestRegistry(input);
  }

  return callExternalVerifier({
    url: process.env.MEDICAL_REPORT_VERIFY_URL,
    token: process.env.MEDICAL_REPORT_VERIFY_TOKEN,
    source: "Configured trusted medical-report issuer",
    payload: {
      reportReference:
        input.reportReference ||
        extractReportReference(input.extractedText),
      issuerId: input.issuerId,
      donorName: input.donorName,
      bloodGroup: input.bloodGroup,
      documentSha256: input.documentSha256,
    },
  });
};

const sha256File = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
};

module.exports = {
  MODE,
  verifyHospital,
  verifyBloodBank,
  verifyMedicalReport,
  extractReportReference,
  sha256File,
};
