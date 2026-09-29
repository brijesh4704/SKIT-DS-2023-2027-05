const DonorEligibility = require("../models/DonorEligibility");
const Donor = require("../models/Donor");
const EligibilityRule = require("../models/EligibilityRule");

const saveEligibilityProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({
      user: req.user._id,
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found",
      });
    }

    const {
      age,
      weight,
      lastDonationDate,
      hadRecentIllness,
      takingMedication,
      hadRecentSurgery,
      recentTattooOrPiercing,
      hasChronicDisease,
      recentInfection,
      notes,
      screeningStatus,
      screeningSummary,
      screeningFlags,
      medicalDocument,
    } = req.body;

    const eligibility = await DonorEligibility.findOneAndUpdate(
      { donor: donor._id },
      {
        age,
        weight,
        lastDonationDate: lastDonationDate || null,
        hadRecentIllness: hadRecentIllness ?? false,
        takingMedication: takingMedication ?? false,
        hadRecentSurgery: hadRecentSurgery ?? false,
        recentTattooOrPiercing: recentTattooOrPiercing ?? false,
        hasChronicDisease: hasChronicDisease ?? false,
        recentInfection: recentInfection ?? false,
        notes: notes || "",
        screeningStatus: screeningStatus || null,
        screeningSummary: screeningSummary || "",
        screeningFlags: Array.isArray(screeningFlags) ? screeningFlags : [],
        medicalDocument: medicalDocument || undefined,
        status: "NOT_ASSESSED",
        lastAssessmentDate: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Eligibility questionnaire saved successfully",
      eligibility,
    });
  } catch (error) {
    console.error("Save eligibility error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while saving eligibility profile",
    });
  }
};

const assessEligibility = async (req, res) => {
  try {
    const donor = await Donor.findOne({
      user: req.user._id,
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: "Donor profile not found",
      });
    }

    const eligibility = await DonorEligibility.findOne({
      donor: donor._id,
    });

    if (!eligibility) {
      return res.status(404).json({
        success: false,
        message: "Eligibility questionnaire not found",
      });
    }

    // =========================================
    // 1. BASIC AGE CHECK
    // =========================================

    if (eligibility.age < 18) {
      eligibility.status = "TEMPORARILY_INELIGIBLE";
      eligibility.nextEligibleDate = null;
      eligibility.lastAssessmentDate = new Date();
      await eligibility.save();
      donor.medicalEligible = false;
      await donor.save();

      return res.status(200).json({
        success: true,
        eligible: false,
        status: "TEMPORARILY_INELIGIBLE",
        reason: "Donor must meet the minimum age requirement before donation.",
        eligibility,
      });
    }

    // =========================================
    // 2. RECENT DONATION CHECK
    // =========================================

    if (eligibility.lastDonationDate) {
      const lastDonation = new Date(
        eligibility.lastDonationDate
      );

      const daysSinceDonation = Math.floor(
        (Date.now() - lastDonation.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const donationRule = await EligibilityRule.findOne({
  ruleKey: "BLOOD_DONATION_WAITING",
  isActive: true,
});

if (!donationRule) {
  return res.status(500).json({
    success: false,
    message: "Blood donation eligibility rule is not configured",
  });
}

const donationWaitingDays = donationRule.waitingDays;

      if (daysSinceDonation < donationWaitingDays) {
        const daysRemaining =
          donationWaitingDays - daysSinceDonation;
          const nextEligibleDate = new Date(lastDonation);
nextEligibleDate.setDate(
  nextEligibleDate.getDate() + donationWaitingDays
);

        eligibility.status = "TEMPORARILY_INELIGIBLE";
eligibility.nextEligibleDate = nextEligibleDate;
eligibility.lastAssessmentDate = new Date();

        await eligibility.save();
        donor.medicalEligible = false;
        await donor.save();

        return res.status(200).json({
          success: true,
          eligible: false,
          status: "TEMPORARILY_INELIGIBLE",
          reason: "Recent blood donation",
          daysRemaining,
          nextEligibleDate,
          eligibility,
        });
      }
    }

    // =========================================
    // 2. MEDICAL REVIEW FLAGS
    // =========================================

    const requiresMedicalReview =
      eligibility.hadRecentIllness ||
      eligibility.takingMedication ||
      eligibility.hadRecentSurgery ||
      eligibility.recentTattooOrPiercing ||
      eligibility.hasChronicDisease ||
      eligibility.recentInfection;

    if (requiresMedicalReview) {
      eligibility.status = "MEDICAL_REVIEW";
      eligibility.lastAssessmentDate = new Date();

      await eligibility.save();
      donor.medicalEligible = false;
      await donor.save();

      return res.status(200).json({
        success: true,
        eligible: false,
        status: "MEDICAL_REVIEW",
        reason:
          "One or more answers require medical screening",
        eligibility,
      });
    }

    // =========================================
    // 3. QUESTIONNAIRE COMPLETENESS
    // =========================================

    if (!eligibility.age || !eligibility.weight) {
      eligibility.status = "NOT_ASSESSED";
      eligibility.lastAssessmentDate = new Date();

      await eligibility.save();
      donor.medicalEligible = false;
      await donor.save();

      return res.status(200).json({
        success: true,
        eligible: false,
        status: "NOT_ASSESSED",
        reason:
          "Age and weight information is required",
        eligibility,
      });
    }

    // =========================================
    // 4. BASIC SCREENING PASSED
    // =========================================

    eligibility.status = "ELIGIBLE";
    eligibility.lastAssessmentDate = new Date();

    await eligibility.save();
    donor.medicalEligible = true;
    await donor.save();

    return res.status(200).json({
      success: true,
      eligible: true,
      status: "ELIGIBLE",
      message:
        "Donor passed the basic questionnaire screening. Final eligibility requires appropriate medical screening.",
      eligibility,
    });
  } catch (error) {
    console.error("Assess eligibility error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while assessing eligibility",
    });
  }
};

const getMyEligibility = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user._id });

    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor profile not found" });
    }

    const eligibility = await DonorEligibility.findOne({ donor: donor._id });

    return res.status(200).json({
      success: true,
      exists: Boolean(eligibility),
      eligibility: eligibility || null,
      donorMedicalEligible: donor.medicalEligible,
    });
  } catch (error) {
    console.error("Get eligibility error:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching eligibility" });
  }
};

module.exports = {
  saveEligibilityProfile,
  assessEligibility,
  getMyEligibility,
};