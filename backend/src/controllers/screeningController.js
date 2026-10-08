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

// =====================================================
// VERIFY MEDICAL DOCUMENT
// =====================================================

const verifyDocument = async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Medical document is required.",
      });
    }

    filePath = req.file.path;

    console.log(
      "📄 Uploaded document:",
      req.file.originalname
    );

    // =====================================================
    // 1. FILE / TEXT VALIDATION
    // =====================================================

    const validationResult =
      await validateDocument(filePath);

    if (!validationResult.valid) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(422).json({
        success: false,
        verificationStatus: "REJECTED",
        message:
          validationResult.reason ||
          "The uploaded document could not be verified.",
      });
    }

    let extractedText =
      validationResult.text || "";

    if (validationResult.requiresOCR) {
      extractedText =
        await extractTextFromImage(filePath);
    }

    // =====================================================
    // 2. DOCUMENT TYPE CHECK
    // =====================================================

    const classification =
      classifyDocument(extractedText);

    if (!classification.isMedical) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(422).json({
        success: false,
        verificationStatus: "REJECTED",
        message:
          "The uploaded file does not appear to be a medical document.",
        classification: {
          isMedical:
            classification.isMedical,
          confidence:
            classification.confidence,
          matchedTerms:
            classification.matchedTerms,
        },
      });
    }

    // =====================================================
    // 3. GET REGISTERED DONOR IDENTITY
    // =====================================================

    const donor =
      await Donor.findOne({
        user: req.user._id,
      }).populate(
        "user",
        "name email"
      );

    if (!donor) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(404).json({
        success: false,
        verificationStatus: "REJECTED",
        message:
          "Donor profile not found.",
      });
    }

    // =====================================================
    // 4. INDEPENDENT REPORT VERIFICATION
    // =====================================================
    // Classification only says "this looks like a medical
    // document". It does NOT prove authenticity.
    // The verification adapter must independently match the
    // report/issuer. In test mode it uses the demo trusted
    // laboratory registry; in production it requires the
    // configured trusted issuer verifier.
    // =====================================================

    const documentSha256 =
      sha256File(filePath);

    const reportReference =
      req.body.reportReference ||
      extractReportReference(
        extractedText
      );

    const issuerId =
      req.body.issuerId || "";

    const verification =
      await verifyMedicalReport({
        extractedText,
        reportReference,
        issuerId,
        donorName:
          donor.user?.name || req.user.name,
        bloodGroup:
          donor.bloodGroup,
        documentSha256,
      });

    // =====================================================
    // 5. PERSIST SCREENING / DOCUMENT RESULT
    // =====================================================

    const eligibility =
      await DonorEligibility.findOneAndUpdate(
        { donor: donor._id },
        {
          medicalDocument: {
            name:
              req.file.originalname,
            path:
              verification.verified
                ? filePath
                : "",
            sha256:
              documentSha256,
            confidence:
              classification.confidence,
            matchedTerms:
              classification.matchedTerms,
            verificationStatus:
              verification.status ===
              "VERIFIED"
                ? "VERIFIED"
                : verification.status,
            verificationSource:
              verification.source || "",
            verificationMessage:
              verification.message || "",
            issuerName:
              verification.issuerName || "",
            issuerId:
              verification.issuerId ||
              issuerId,
            reportReference:
              verification.reportReference ||
              reportReference ||
              "",
            verifiedAt:
              verification.verified
                ? new Date()
                : null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

    // =====================================================
    // 6. AUTHENTICITY FAILED
    // =====================================================

    if (!verification.verified) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const statusCode =
        verification.status ===
        "UNAVAILABLE"
          ? 503
          : 422;

      return res.status(statusCode).json({
        success: false,
        verified: false,
        verificationStatus:
          verification.status,
        verificationSource:
          verification.source,
        message:
          verification.message ||
          "The medical report could not be independently authenticated.",
        classification: {
          isMedical:
            classification.isMedical,
          confidence:
            classification.confidence,
          matchedTerms:
            classification.matchedTerms,
        },
        reportReference:
          verification.reportReference ||
          reportReference ||
          "",
      });
    }

    // =====================================================
    // 7. VERIFIED RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      verified: true,
      verificationStatus: "VERIFIED",
      verificationSource:
        verification.source,
      message:
        verification.message,
      documentType:
        "verified_medical_document",
      confidence:
        classification.confidence,
      matchedTerms:
        classification.matchedTerms,
      reportReference:
        verification.reportReference ||
        reportReference ||
        "",
      issuerName:
        verification.issuerName || "",
      issuerId:
        verification.issuerId ||
        issuerId ||
        "",
      // Kept for the existing AI screening flow.
      extractedText,
      eligibilityId:
        eligibility._id,
    });
  } catch (error) {
    console.error(
      "❌ Document verification error:",
      error
    );

    if (
      filePath &&
      fs.existsSync(filePath)
    ) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    return res.status(500).json({
      success: false,
      verificationStatus: "UNAVAILABLE",
      message:
        "Unable to verify the uploaded medical document.",
    });
  }
};
// =====================================================
// RUN AI SCREENING
// =====================================================

const runAIScreening = async (req, res) => {
  try {
    const {
      answers,
      documentText,
    } = req.body;

    // -------------------------------------------------
    // 1. CHECK ANSWERS
    // -------------------------------------------------

    if (!answers) {
      return res.status(400).json({
        success: false,

        message:
          "Screening answers are required.",
      });
    }

    // -------------------------------------------------
    // 2. PARSE ANSWERS
    // -------------------------------------------------

    let parsedAnswers = answers;

    if (typeof answers === "string") {
      try {
        parsedAnswers =
          JSON.parse(answers);
      } catch (error) {
        console.error(
          "❌ Answers JSON parsing error:",
          error
        );

        return res.status(400).json({
          success: false,

          message:
            "Invalid answers format.",
        });
      }
    }

    // -------------------------------------------------
    // 3. LOG SCREENING DATA
    // -------------------------------------------------

    console.log(
      "🧠 Starting AI screening analysis..."
    );

    console.log(
      "📋 Answers received:",
      Object.keys(
        parsedAnswers || {}
      ).length
    );

    console.log(
      "📄 Document text received:",
      documentText
        ? documentText.length
        : 0,
      "characters"
    );

    // -------------------------------------------------
    // 4. RUN SCREENING ENGINE
    // -------------------------------------------------

    const result =
      await analyzeScreening({
        answers: parsedAnswers,

        documentText:
          documentText || "",
      });

    // -------------------------------------------------
    // 5. LOG RESULT
    // -------------------------------------------------

    console.log(
      "✅ AI screening completed:",
      result.status
    );

    console.log(
      "🚩 Screening flags:",
      result.flags
    );

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
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    // -------------------------------------------------
    // 6. RETURN RESULT
    // -------------------------------------------------

    return res.status(200).json({
      success: true,

      screening: result,
    });
  } catch (error) {
    console.error(
      "❌ AI screening error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to complete screening analysis.",
    });
  }
};

// =====================================================
// EXPORT CONTROLLERS
// =====================================================

module.exports = {
  verifyDocument,
  runAIScreening,
};