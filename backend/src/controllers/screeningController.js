const {
  validateDocument,
} = require("../services/documentValidator");

const {
  extractTextFromImage,
} = require("../services/ocrService");

const {
  classifyDocument,
} = require("../services/documentClassifier");

const {
  verifyMedicalReport,
  sha256File,
  extractReportReference,
} = require("../services/verificationService");

const {
  analyzeScreening,
} = require("../services/aiScreeningEngine");

const fs = require("fs");
const Donor = require("../models/Donor");
const DonorEligibility = require("../models/DonorEligibility");

// Only allow the synthetic-document path in local/test environments.
// This never marks a synthetic document as medically verified.
const isLocalTestMode = () =>
  String(process.env.VERIFICATION_MODE || "test").toLowerCase() === "test" &&
  String(process.env.NODE_ENV || "development").toLowerCase() !== "production";

const removeUploadedFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error("⚠️ Uploaded file cleanup failed:", error.message);
    }
  }
};

// =====================================================
// VERIFY MEDICAL DOCUMENT
// =====================================================
const verifyDocument = async (req, res) => {
  let filePath = null;
  let keepFile = false;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        verificationStatus: "REJECTED",
        message: "Medical document is required.",
      });
    }

    filePath = req.file.path;

    console.log("📄 Uploaded document:", req.file.originalname);

    // 1. Validate file and extract text.
    const validationResult = await validateDocument(filePath);

    if (!validationResult.valid) {
      removeUploadedFile(filePath);
      return res.status(422).json({
        success: false,
        verificationStatus: "REJECTED",
        message:
          validationResult.reason ||
          "The uploaded document could not be read.",
      });
    }

    let extractedText = validationResult.text || "";

    if (validationResult.requiresOCR) {
      extractedText = await extractTextFromImage(filePath);
    }

    // Normalize whitespace so demo labels can be detected even when PDF
    // extraction inserts line breaks between words/sections.
    const normalizedText = String(extractedText)
      .replace(/\r/g, " ")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 2. Confirm that the file resembles a medical document.
    const classification = classifyDocument(extractedText);

    if (!classification.isMedical) {
      removeUploadedFile(filePath);
      return res.status(422).json({
        success: false,
        verificationStatus: "REJECTED",
        message: "The uploaded file does not appear to be a medical document.",
        classification: {
          isMedical: classification.isMedical,
          confidence: classification.confidence,
          matchedTerms: classification.matchedTerms,
        },
      });
    }

    // 3. Load the logged-in donor's profile.
    const donor = await Donor.findOne({
      user: req.user._id,
    }).populate("user", "name email");

    if (!donor) {
      removeUploadedFile(filePath);
      return res.status(404).json({
        success: false,
        verificationStatus: "REJECTED",
        message: "Donor profile not found.",
      });
    }

    const documentSha256 = sha256File(filePath);
    const reportReference =
      String(req.body.reportReference || "").trim() ||
      extractReportReference(extractedText);
    const issuerId = String(req.body.issuerId || "").trim();

    // 4. Narrow, explicit path for a clearly labelled synthetic demo file.
    // This is available only outside production and returns DEMO_ONLY,
    // never VERIFIED. Ordinary files still use the verification service.
   
const hasDemoDisclaimer =
  /DEMO\s*\/?\s*(?:FOR PROJECT USE ONLY\s*[-—:]?\s*)?NOT A REAL (?:MEDICAL REPORT|MEDICAL RECORD)/i.test(normalizedText) ||
  /SYNTHETIC\s*\/\s*DEMO DOCUMENT/i.test(normalizedText) ||
  /FICTIONAL DATA GENERATED SOLELY FOR DEMONSTRATION/i.test(normalizedText);

const hasDemoIssuer =
  /BloodLink AI Demo Lab(?:oratory)?/i.test(normalizedText) ||
  /BloodLink Demo Diagnostic Lab/i.test(normalizedText) ||
  /BloodLink AI Sample/i.test(normalizedText);

const isSyntheticDemo =
  isLocalTestMode() && hasDemoDisclaimer && hasDemoIssuer;


    let verification;

    if (isSyntheticDemo) {
      verification = {
        verified: false,
        demoOnly: true,
        status: "DEMO_ONLY",
        source: "BloodLink AI Demo Workflow",
        message:
          "Synthetic demo document accepted for software testing only. Medical authenticity has not been verified.",
        reportReference: reportReference || "BL-DEMO-YASH-0002",
        issuerName: "BloodLink AI Demo Lab (fictional)",
        issuerId: issuerId || "DEMO-LAB-001",
      };
    } else {
      verification = await verifyMedicalReport({
        extractedText,
        reportReference,
        issuerId,
        donorName: donor.user?.name || req.user.name,
        bloodGroup: donor.bloodGroup,
        documentSha256,
      });
    }

    // 5. Persist the result. A demo document is saved only as a demo artifact;
    // verifiedAt remains null because it has NOT been medically authenticated.
    await DonorEligibility.findOneAndUpdate(
      { donor: donor._id },
      {
        medicalDocument: {
          name: req.file.originalname,
          path: verification.verified || verification.demoOnly ? filePath : "",
          sha256: documentSha256,
          confidence: classification.confidence,
          matchedTerms: classification.matchedTerms,
          verificationStatus: verification.status,
          verificationSource: verification.source || "",
          verificationMessage: verification.message || "",
          issuerName: verification.issuerName || "",
          issuerId: verification.issuerId || issuerId,
          reportReference:
            verification.reportReference || reportReference || "",
          verifiedAt: verification.verified ? new Date() : null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Keep the uploaded file only when it is a successful verification or
    // a clearly labelled demo artifact. Failed ordinary uploads are deleted.
    if (verification.demoOnly) {
      keepFile = true;
      return res.status(200).json({
        success: true,
        verified: false,
        demoOnly: true,
        verificationStatus: "DEMO_ONLY",
        verificationSource: verification.source,
        message: verification.message,
        documentType: "synthetic_demo_document",
        confidence: classification.confidence,
        matchedTerms: classification.matchedTerms,
        reportReference: verification.reportReference,
        issuerName: verification.issuerName,
        issuerId: verification.issuerId,
        extractedText,
      });
    }

    if (!verification.verified) {
      return res.status(
        verification.status === "UNAVAILABLE" ? 503 : 422
      ).json({
        success: false,
        verified: false,
        demoOnly: false,
        verificationStatus: verification.status,
        verificationSource: verification.source,
        message:
          verification.message ||
          "The medical report could not be independently authenticated.",
        classification: {
          isMedical: classification.isMedical,
          confidence: classification.confidence,
          matchedTerms: classification.matchedTerms,
        },
        reportReference: verification.reportReference || reportReference || "",
      });
    }

    keepFile = true;
    return res.status(200).json({
      success: true,
      verified: true,
      demoOnly: false,
      verificationStatus: "VERIFIED",
      verificationSource: verification.source,
      message: verification.message,
      documentType: "verified_medical_document",
      confidence: classification.confidence,
      matchedTerms: classification.matchedTerms,
      reportReference: verification.reportReference || reportReference || "",
      issuerName: verification.issuerName || "",
      issuerId: verification.issuerId || issuerId || "",
      extractedText,
    });
  } catch (error) {
    console.error("❌ Document verification error:", error);

    return res.status(500).json({
      success: false,
      verificationStatus: "UNAVAILABLE",
      message: "Unable to verify the uploaded medical document.",
    });
  } finally {
    if (!keepFile) {
      removeUploadedFile(filePath);
    }
  }
};

// =====================================================
// RUN AI SCREENING
// =====================================================
const runAIScreening = async (req, res) => {
  try {
    const { answers, documentText } = req.body;

    if (!answers) {
      return res.status(400).json({
        success: false,
        message: "Screening answers are required.",
      });
    }

    let parsedAnswers = answers;

    if (typeof answers === "string") {
      try {
        parsedAnswers = JSON.parse(answers);
      } catch (error) {
        console.error("❌ Answers JSON parsing error:", error);
        return res.status(400).json({
          success: false,
          message: "Invalid answers format.",
        });
      }
    }

    console.log("🧠 Starting AI screening analysis...");
    console.log(
      "📋 Answers received:",
      Object.keys(parsedAnswers || {}).length
    );
    console.log(
      "📄 Document text received:",
      documentText ? documentText.length : 0,
      "characters"
    );

    const result = await analyzeScreening({
      answers: parsedAnswers,
      documentText: documentText || "",
    });

    console.log("✅ AI screening completed:", result.status);
    console.log("🚩 Screening flags:", result.flags);

    // Persist the AI screening result for the authenticated donor.
    if (req.user?.role === "DONOR") {
      const donor = await Donor.findOne({ user: req.user._id });

      if (donor) {
        await DonorEligibility.findOneAndUpdate(
          { donor: donor._id },
          {
            screeningStatus: result.status || null,
            screeningSummary: result.summary || "",
            screeningFlags: Array.isArray(result.flags) ? result.flags : [],
            lastAssessmentDate: new Date(),
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      screening: result,
    });
  } catch (error) {
    console.error("❌ AI screening error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete screening analysis.",
    });
  }
};

module.exports = {
  verifyDocument,
  runAIScreening,
};
