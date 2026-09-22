"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileText,
  HeartPulse,
  Info,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import "./eligibility.css";
import Eligibility3D from "../../components/Eligibility3D";
import { API_BASE_URL, authHeaders, clearAuth, getToken } from "../../lib/api";

type Question = {
  id: string;
  category: string;
  categoryIcon: React.ElementType;
  title: string;
  description?: string;
  options: string[];
  required?: boolean;
};

type ScreeningFlag = {
  code?: string;
  title?: string;
  label?: string;
  message?: string;
  description?: string;
  reason?: string;
  severity?: string;
};

type ScreeningResult = {
  status?: string;
  summary?: string;
  nextStep?: string;
  flags?: ScreeningFlag[];

  document?: {
    name?: string;
    confidence?: number;
    matchedTerms?: string[];
  };

  questionsAnswered?: number;
};



/* =========================================================
   SCREENING QUESTIONS
========================================================= */

const questions: Question[] = [
  {
    id: "age",
    category: "Basic profile",
    categoryIcon: UserRound,
    title: "How old are you?",
    description:
      "Your age helps us understand the basic donor screening profile.",
    options: [
      "Under 18",
      "18–24",
      "25–34",
      "35–44",
      "45–54",
      "55+",
    ],
  },

  {
    id: "weight",
    category: "Basic profile",
    categoryIcon: UserRound,
    title: "What is your approximate weight?",
    description:
      "Select the range closest to your current weight.",
    options: [
      "Below 45 kg",
      "45–54 kg",
      "55–64 kg",
      "65–74 kg",
      "75–84 kg",
      "85+ kg",
    ],
  },

  {
    id: "bloodGroup",
    category: "Basic profile",
    categoryIcon: Activity,
    title: "Do you know your blood group?",
    description:
      "This is optional at this stage. It can be verified later.",
    options: [
      "A+",
      "A−",
      "B+",
      "B−",
      "AB+",
      "AB−",
      "O+",
      "O−",
      "I don't know",
    ],
  },

  {
    id: "feeling",
    category: "Current health",
    categoryIcon: HeartPulse,
    title: "How are you feeling today?",
    description:
      "Think about your general health right now.",
    options: [
      "I feel completely well",
      "Mostly well",
      "A little unwell",
      "I feel unwell",
    ],
  },

  {
    id: "infection",
    category: "Current health",
    categoryIcon: HeartPulse,
    title:
      "Have you recently had fever, cold, flu or another infection?",
    description:
      "Include symptoms or infections from the recent period.",
    options: [
      "No",
      "Yes — recently",
      "Yes — currently",
      "Not sure",
    ],
  },

  {
    id: "symptoms",
    category: "Current health",
    categoryIcon: Activity,
    title:
      "Are you currently experiencing any significant symptoms?",
    description:
      "For example: unexplained weakness, dizziness, breathing difficulty or other concerning symptoms.",
    options: [
      "No significant symptoms",
      "Mild symptoms",
      "Significant symptoms",
      "Not sure",
    ],
  },

  {
    id: "medication",
    category: "Medical history",
    categoryIcon: Stethoscope,
    title: "Are you currently taking any medication?",
    description:
      "Include prescription or regular medication.",
    options: [
      "No",
      "Yes — short-term",
      "Yes — regular medication",
      "Not sure",
    ],
  },

  {
    id: "majorIllness",
    category: "Medical history",
    categoryIcon: Stethoscope,
    title:
      "Do you have a history of a major illness or medical condition?",
    description:
      "You can provide details during medical review if required.",
    options: [
      "No",
      "Yes",
      "Prefer to discuss with staff",
      "Not sure",
    ],
  },

  {
    id: "surgery",
    category: "Medical history",
    categoryIcon: Stethoscope,
    title:
      "Have you recently undergone surgery or a medical procedure?",
    description:
      "Include procedures requiring medical intervention.",
    options: [
      "No",
      "Yes — recently",
      "Yes — some time ago",
      "Not sure",
    ],
  },

  {
    id: "hospital",
    category: "Medical history",
    categoryIcon: Stethoscope,
    title: "Have you recently been hospitalized?",
    description:
      "Hospitalization may require additional screening.",
    options: [
      "No",
      "Yes",
      "Currently hospitalized",
      "Not sure",
    ],
  },

  {
    id: "treatment",
    category: "Medical history",
    categoryIcon: Stethoscope,
    title:
      "Are you currently undergoing medical treatment?",
    description:
      "This can include ongoing clinical treatment or follow-up.",
    options: [
      "No",
      "Yes",
      "Follow-up only",
      "Not sure",
    ],
  },

  {
    id: "previousDonation",
    category: "Donation history",
    categoryIcon: ClipboardCheck,
    title: "Have you donated blood before?",
    description:
      "Your previous donation experience helps us understand your history.",
    options: [
      "Yes",
      "No",
      "I don't remember",
    ],
  },

  {
    id: "lastDonation",
    category: "Donation history",
    categoryIcon: CalendarDays,
    title: "When was your last blood donation?",
    description:
      "If you have never donated, select the last option.",
    options: [
      "Less than 1 month ago",
      "1–3 months ago",
      "3–6 months ago",
      "6–12 months ago",
      "More than 1 year ago",
      "Never donated",
    ],
  },

  {
    id: "reaction",
    category: "Donation history",
    categoryIcon: HeartPulse,
    title:
      "Did you experience any significant reaction during a previous donation?",
    description:
      "Examples include fainting or prolonged weakness.",
    options: [
      "No",
      "Yes — mild",
      "Yes — significant",
      "Never donated",
    ],
  },

  {
    id: "tattoo",
    category: "Recent procedures",
    categoryIcon: Stethoscope,
    title:
      "Have you recently had a tattoo or piercing?",
    description:
      "This information may require additional screening depending on circumstances.",
    options: [
      "No",
      "Yes — recently",
      "Yes — some time ago",
      "Not sure",
    ],
  },

  {
    id: "dental",
    category: "Recent procedures",
    categoryIcon: Stethoscope,
    title:
      "Have you recently had a dental or invasive medical procedure?",
    description:
      "Include procedures that involved significant intervention.",
    options: [
      "No",
      "Yes — recently",
      "Yes — some time ago",
      "Not sure",
    ],
  },

  {
    id: "travel",
    category: "Exposure & travel",
    categoryIcon: Activity,
    title:
      "Have you recently travelled to an area requiring special health precautions?",
    description:
      "Some travel or exposure histories can require additional screening.",
    options: [
      "No",
      "Yes",
      "Not sure",
    ],
  },

  {
    id: "declaration",
    category: "Final declaration",
    categoryIcon: ShieldCheck,
    title:
      "Is there anything else about your health that a blood-bank professional should know?",
    description:
      "Be honest and provide any relevant information during final screening.",
    options: [
      "No additional information",
      "Yes — I have additional information",
      "I would prefer to discuss privately",
    ],
  },
];

/* =========================================================
   TIMELINE
========================================================= */

const categories = [
  "Basic profile",
  "Current health",
  "Medical history",
  "Donation history",
  "Recent procedures",
  "Exposure & travel",
  "Final declaration",
  "Medical report",
  "Review",
];

/* =========================================================
   PAGE
========================================================= */

export default function EligibilityPage() {
  const [step, setStep] = useState(0);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [file, setFile] =
    useState<File | null>(null);

  const [dragActive, setDragActive] =
    useState(false);

  const [reviewOpen, setReviewOpen] =
    useState(false);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [result, setResult] =
    useState<"review" | null>(null);

  const [screeningResult, setScreeningResult] =
    useState<ScreeningResult | null>(null);

  const [screeningError, setScreeningError] =
    useState("");

  const [donorProfile, setDonorProfile] = useState<any>(null);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  const fileRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/donors/profile`, { headers: authHeaders() });
        if (response.status === 401 || response.status === 403) {
          clearAuth();
          window.location.href = "/login";
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load donor profile");
        setDonorProfile(data.donor);
      } catch (error) {
        setScreeningError(error instanceof Error ? error.message : "Unable to load donor profile");
      }
    })();
  }, []);

  const totalQuestions =
    questions.length;

  const uploadStep =
    totalQuestions;

  const reviewStep =
    totalQuestions + 1;

  const currentQuestion =
    questions[step];

  /* =====================================================
     PROGRESS
  ===================================================== */

  const progress = useMemo(() => {
    if (result) {
      return 100;
    }

    if (step < totalQuestions) {
      return (
        ((step + 1) /
          (totalQuestions + 2)) *
        100
      );
    }

    if (step === uploadStep) {
      return 90;
    }

    return 96;
  }, [
    step,
    totalQuestions,
    uploadStep,
    result,
  ]);

  /* =====================================================
     CATEGORY
  ===================================================== */

  const currentCategory =
    step < totalQuestions
      ? currentQuestion.category
      : step === uploadStep
      ? "Medical report"
      : "Review";

  const answer =
    currentQuestion
      ? answers[currentQuestion.id]
      : "";

  /* =====================================================
     SELECT ANSWER
  ===================================================== */

  const selectAnswer = (
    value: string
  ) => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]:
        value,
    }));
  };

  /* =====================================================
     NEXT
  ===================================================== */

  const next = () => {
    if (
      step <
      totalQuestions - 1
    ) {
      setStep(
        (prev) => prev + 1
      );

      return;
    }

    if (
      step ===
      totalQuestions - 1
    ) {
      setStep(uploadStep);
      return;
    }

    if (step === uploadStep) {
      if (!file) {
        return;
      }

      setStep(reviewStep);
      return;
    }

    if (step === reviewStep) {
      setReviewOpen(true);
    }
  };

  /* =====================================================
     BACK
  ===================================================== */

  const back = () => {
    if (step === 0) {
      return;
    }

    setStep(
      (prev) => prev - 1
    );
  };

  /* =====================================================
     FILE VALIDATION
  ===================================================== */

  const validateFile = (
    selectedFile: File
  ) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const maxSize =
      10 * 1024 * 1024;

    if (
      !allowed.includes(
        selectedFile.type
      )
    ) {
      alert(
        "Please upload PDF, JPG, PNG or WEBP."
      );

      return false;
    }

    if (
      selectedFile.size >
      maxSize
    ) {
      alert(
        "Maximum file size is 10MB."
      );

      return false;
    }

    return true;
  };

  /* =====================================================
     HANDLE FILE
  ===================================================== */

  const handleFile = (
    selectedFile?: File
  ) => {
    if (!selectedFile) {
      return;
    }

    if (
      validateFile(
        selectedFile
      )
    ) {
      setFile(selectedFile);

      setScreeningError("");
    }
  };

  /* =====================================================
     START AI SCREENING
  ===================================================== */

  const startAnalysis =
    async () => {
      if (!file) {
        setScreeningError(
          "Please upload your medical document first."
        );

        return;
      }

      setReviewOpen(false);
      setScreeningError("");
      const token = getToken();
      if (!token) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      setAnalyzing(true);

      try {
        /* ==============================================
           STEP 1 — VERIFY DOCUMENT
        ============================================== */

        const formData =
          new FormData();

        formData.append(
          "medicalDocument",
          file
        );

        const documentResponse =
          await fetch(
            `${API_BASE_URL}/api/screening/verify-document`,
            {
              method: "POST",
              headers: authHeaders(),
              body: formData,
            }
          );

        const documentData =
          await documentResponse.json();

        if (
          !documentResponse.ok
        ) {
          throw new Error(
            documentData.message ||
              "Medical document verification failed."
          );
        }

        console.log(
          "Document verification:",
          documentData
        );

        /* ==============================================
           STEP 2 — AI SCREENING
        ============================================== */

        const screeningResponse =
          await fetch(
            `${API_BASE_URL}/api/screening/analyze`,
            {
              method: "POST",

              headers: authHeaders({
                "Content-Type": "application/json",
              }),

              body: JSON.stringify({
                answers,
                documentText:
                  documentData.extractedText ||
                  "",
              }),
            }
          );

        const screeningData =
          await screeningResponse.json();

        if (
          !screeningResponse.ok
        ) {
          throw new Error(
            screeningData.message ||
              "AI screening failed."
          );
        }

        console.log(
          "AI screening:",
          screeningData
        );

        /* ==============================================
           SAVE REAL ELIGIBILITY PROFILE + ASSESSMENT
        ============================================== */
        const actualResult = screeningData.screening || {};
        const ageAnswer = answers.age || "";
        const weightAnswer = answers.weight || "";
        const ageFromProfile = donorProfile?.dateOfBirth
          ? Math.floor((Date.now() - new Date(donorProfile.dateOfBirth).getTime()) / (365.2425 * 24 * 60 * 60 * 1000))
          : null;
        const ageMap: Record<string, number> = { "18–24": 18, "25–34": 25, "35–44": 35, "45–54": 45, "55+": 55 };
        const weightMap: Record<string, number> = { "Below 45 kg": 40, "45–54 kg": 45, "55–64 kg": 55, "65–74 kg": 65, "75–84 kg": 75, "85+ kg": 85 };
        const lastDonationMap: Record<string, number | null> = {
          "Less than 1 month ago": 15, "1–3 months ago": 60, "3–6 months ago": 120,
          "6–12 months ago": 270, ">More than 1 year ago": 400, "More than 1 year ago": 400, "Never donated": null,
        };
        const recentDonationDays = lastDonationMap[answers.lastDonation];
        const derivedLastDonation = donorProfile?.lastDonationDate
          ? donorProfile.lastDonationDate
          : recentDonationDays != null
            ? new Date(Date.now() - recentDonationDays * 86400000).toISOString()
            : null;

        const knownBloodGroup = answers.bloodGroup && answers.bloodGroup !== "I don't know" ? answers.bloodGroup.replace("−", "-") : null;
        if (knownBloodGroup && donorProfile?.bloodGroup !== knownBloodGroup) {
          await fetch(`${API_BASE_URL}/api/donors/profile`, {
            method: "PUT",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ bloodGroup: knownBloodGroup }),
          });
        }

        const eligibilityPayload = {
          age: ageFromProfile ?? ageMap[ageAnswer],
          weight: weightMap[weightAnswer],
          lastDonationDate: derivedLastDonation,
          hadRecentIllness: answers.feeling !== "I feel completely well" || answers.infection === "Yes — recently" || answers.infection === "Yes — currently" || answers.infection === "Not sure",
          takingMedication: answers.medication !== "No",
          hadRecentSurgery: answers.surgery !== "No",
          recentTattooOrPiercing: answers.tattoo !== "No",
          hasChronicDisease: answers.majorIllness !== "No",
          recentInfection: answers.infection !== "No",
          notes: answers.declaration && answers.declaration !== "No additional information" ? answers.declaration : "",
          screeningStatus: actualResult?.status || null,
          screeningSummary: actualResult?.summary || "",
          screeningFlags: actualResult?.flags || [],
          medicalDocument: { name: file.name, confidence: documentData.confidence || 0, matchedTerms: documentData.matchedTerms || [], verifiedAt: new Date().toISOString() },
        };

        if (!eligibilityPayload.age || !eligibilityPayload.weight) {
          throw new Error("Age and weight could not be determined. Please complete your donor profile and assessment again.");
        }

        const saveResponse = await fetch(`${API_BASE_URL}/api/eligibility`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(eligibilityPayload),
        });
        const saveData = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(saveData.message || "Unable to save eligibility assessment");

        const assessResponse = await fetch(`${API_BASE_URL}/api/eligibility/assess`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
        });
        const assessData = await assessResponse.json();
        if (!assessResponse.ok) throw new Error(assessData.message || "Unable to assess eligibility");
        setEligibilityResult(assessData);

        /* ==============================================
           SAVE RESULT
        ============================================== */

        setScreeningResult({
          ...actualResult,

          document: {
            name:
              file.name,

            confidence:
              documentData.confidence ||
              0,

            matchedTerms:
              documentData.matchedTerms ||
              [],
          },

          questionsAnswered:
            Object.keys(
              answers
            ).length,
        });

        setAnalyzing(false);

        setResult("review");
      } catch (error) {
        console.error(
          "Screening error:",
          error
        );

        setAnalyzing(false);

        setScreeningError(
          error instanceof Error
            ? error.message
            : "Unable to complete screening."
        );
      }
    };

  /* =====================================================
     RESULT SCREEN
  ===================================================== */

  if (
    result &&
    screeningResult
  ) {
    const status =
      screeningResult.status ||
      "REVIEW_REQUIRED";

    const flags =
      Array.isArray(
        screeningResult.flags
      )
        ? screeningResult.flags
        : [];

    const isEligible = eligibilityResult?.eligible === true || status === "ELIGIBLE";
    const isProfessionalReview =
      status === "PROFESSIONAL_REVIEW_REQUIRED" ||
      eligibilityResult?.status === "MEDICAL_REVIEW";

    const statusLabel =
      isEligible
        ? "Basic screening passed"
        : isProfessionalReview
        ? "Professional review required"
        : eligibilityResult?.status === "TEMPORARILY_INELIGIBLE"
        ? "Temporarily ineligible"
        : "Review required";

    const statusDescription =
      isEligible
        ? "Your questionnaire passed the configured basic donor screening rules. Final donation eligibility must still be confirmed by qualified medical staff."
        : isProfessionalReview
        ? "The screening engine identified factors that should be reviewed by qualified medical staff."
        : eligibilityResult?.status === "TEMPORARILY_INELIGIBLE"
        ? `You are temporarily ineligible based on the configured donation waiting period. ${eligibilityResult?.daysRemaining ? `${eligibilityResult.daysRemaining} day(s) remaining.` : ""}`
        : "Your screening information has been processed. Final donor eligibility still requires professional medical screening.";

    const confidence =
      screeningResult.document
        ?.confidence || 0;

    return (
      <main className="eligibility-page result-page">
        <Eligibility3D />

        <div className="ambient ambient-one" />

        <div className="ambient ambient-two" />

        <div className="result-wrapper">

          {/* =========================================
              RESULT HERO
          ========================================== */}

          <motion.div
            className="result-hero"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >

            <motion.div
              className="result-status-orbit"
              initial={{
                scale: 0.6,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.6,
              }}
            >
              <div className="result-status-icon">
                {isProfessionalReview ? (
                  <Stethoscope
                    size={40}
                  />
                ) : (
                  <ShieldCheck
                    size={40}
                  />
                )}
              </div>
            </motion.div>

            <span className="eyebrow">
              <Sparkles size={14} />

              BloodLink AI screening
            </span>

            <h1>
              Screening{" "}
              <span>
                completed.
              </span>
            </h1>

            <p>
              {statusDescription}
            </p>

            <div
              className={`result-status-pill ${
                isProfessionalReview
                  ? "warning"
                  : "review"
              }`}
            >
              <span className="status-dot" />

              {statusLabel}
            </div>

          </motion.div>

          {/* =========================================
              SUMMARY CARDS
          ========================================== */}

          <motion.div
            className="result-summary-grid"
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.12,
            }}
          >

            <div className="result-summary-card">

              <div className="summary-card-icon">
                <ClipboardCheck
                  size={21}
                />
              </div>

              <div>
                <span>
                  Questions answered
                </span>

                <strong>
                  {
                    screeningResult.questionsAnswered ||
                    Object.keys(
                      answers
                    ).length
                  }
                  /{totalQuestions}
                </strong>
              </div>

            </div>

            <div className="result-summary-card">

              <div className="summary-card-icon">
                <FileCheck2
                  size={21}
                />
              </div>

              <div>
                <span>
                  Medical document
                </span>

                <strong>
                  Verified
                </strong>
              </div>

            </div>

            <div className="result-summary-card">

              <div className="summary-card-icon">
                <ShieldCheck
                  size={21}
                />
              </div>

              <div>
                <span>
                  Screening status
                </span>

                <strong>
                  Review
                </strong>
              </div>

            </div>

          </motion.div>

          {/* =========================================
              DASHBOARD
          ========================================== */}

          <div className="result-dashboard-grid">

            {/* =======================================
                LEFT PANEL
            ======================================== */}

            <motion.section
              className="result-panel result-main-panel"
              initial={{
                opacity: 0,
                x: -25,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.2,
              }}
            >

              <div className="result-panel-heading">

                <div>
                  <span>
                    AI assessment
                  </span>

                  <h2>
                    Screening summary
                  </h2>
                </div>

                <div className="panel-icon">
                  <HeartPulse
                    size={20}
                  />
                </div>

              </div>

              {/* SUMMARY */}

              <div className="summary-message">

                <div className="summary-message-icon">
                  <Info size={19} />
                </div>

                <p>
                  {screeningResult.summary ||
                    "Your screening information has been processed and prepared for professional review."}
                </p>

              </div>

              {/* FLAGS */}

              <div className="flags-section">

                <div className="section-title">

                  <span>
                    Screening factors
                  </span>

                  <strong>
                    {flags.length}
                  </strong>

                </div>

                {flags.length ===
                0 ? (
                  <div className="no-flags">

                    <div className="no-flags-icon">
                      <Check
                        size={18}
                      />
                    </div>

                    <div>
                      <strong>
                        No immediate flags identified
                      </strong>

                      <span>
                        The supplied answers did not
                        trigger an immediate screening
                        flag.
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="flags-list">

                    {flags.map(
                      (
                        flag,
                        index
                      ) => (
                        <div
                          className={`flag-card ${
                            flag.severity
                              ? flag.severity.toLowerCase()
                              : ""
                          }`}
                          key={
                            flag.code ||
                            flag.title ||
                            index
                          }
                        >

                          <div className="flag-icon">
                            <CircleAlert
                              size={18}
                            />
                          </div>

                          <div>

                            <strong>
                              {flag.title ||
                                flag.label ||
                                flag.code ||
                                "Screening factor"}
                            </strong>

                            <span>
                              {flag.message ||
                                flag.description ||
                                flag.reason ||
                                "This factor requires professional review."}
                            </span>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </motion.section>

            {/* =======================================
                RIGHT PANEL
            ======================================== */}

            <motion.section
              className="result-panel"
              initial={{
                opacity: 0,
                x: 25,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.25,
              }}
            >

              {/* DOCUMENT */}

              <div className="result-panel-heading compact">

                <div>
                  <span>
                    Document analysis
                  </span>

                  <h2>
                    Medical report
                  </h2>
                </div>

                <FileText
                  size={20}
                />

              </div>

              <div className="document-result-card">

                <div className="document-icon">
                  <FileCheck2
                    size={24}
                  />
                </div>

                <div className="document-info">

                  <strong>
                    {screeningResult.document
                      ?.name ||
                      file?.name ||
                      "Medical report"}
                  </strong>

                  <span>
                    Document processed successfully
                  </span>

                </div>

                <Check size={19} />

              </div>

              {/* CONFIDENCE */}

              <div className="confidence-section">

                <div className="confidence-heading">

                  <span>
                    Document confidence
                  </span>

                  <strong>
                    {Math.round(
                      confidence * 100
                    )}
                    %
                  </strong>

                </div>

                <div className="confidence-track">

                  <motion.div
                    className="confidence-fill"
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${
                        confidence *
                        100
                      }%`,
                    }}
                    transition={{
                      duration: 0.9,
                    }}
                  />

                </div>

              </div>

              {/* MATCHED TERMS */}

              {screeningResult
                .document
                ?.matchedTerms
                ?.length ? (
                <div className="matched-terms">

                  <span>
                    Detected medical signals
                  </span>

                  <div>
                    {screeningResult.document.matchedTerms
                      .slice(
                        0,
                        8
                      )
                      .map(
                        (
                          term
                        ) => (
                          <span
                            key={
                              term
                            }
                          >
                            {term}
                          </span>
                        )
                      )}
                  </div>

                </div>
              ) : null}

              {/* NEXT STEP */}

              <div className="next-step-card">

                <div className="next-step-icon">
                  <Stethoscope
                    size={20}
                  />
                </div>

                <div>

                  <span>
                    Recommended next step
                  </span>

                  <strong>
                    {screeningResult.nextStep ||
                      "Proceed to professional donor screening before donation."}
                  </strong>

                </div>

              </div>

            </motion.section>

          </div>

          {/* =========================================
              DISCLAIMER
          ========================================== */}

          <motion.div
            className="result-disclaimer"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.35,
            }}
          >

            <ShieldCheck
              size={20}
            />

            <div>

              <strong>
                Important medical note
              </strong>

              <p>
                BloodLink AI provides screening
                assistance only. It does not diagnose
                medical conditions or independently
                determine final blood-donation
                eligibility. Final decisions should be
                made by qualified medical professionals
                according to applicable blood-bank
                protocols.
              </p>

            </div>

          </motion.div>

          {/* =========================================
              ACTIONS
          ========================================== */}

          <div className="result-actions">

            <button
              className="result-secondary-button"
              onClick={() => {
                setResult(null);
                setScreeningResult(null);
                setScreeningError("");
                setStep(0);
                setAnswers({});
                setFile(null);
              }}
            >
              <ArrowLeft
                size={18}
              />

              Start new assessment
            </button>

            <button
              className="result-primary-button"
              onClick={() => {
                if (eligibilityResult?.eligible) {
                  window.location.href = "/donor";
                } else {
                  setResult(null);
                  setStep(reviewStep);
                }
              }}
            >
              {eligibilityResult?.eligible ? "Go to donor dashboard" : "Review assessment"}
              <ArrowRight size={18} />
            </button>

          </div>

        </div>
      </main>
    );
  }

  /* =====================================================
     MAIN ASSESSMENT
  ===================================================== */

  return (
    <main className="eligibility-page">

      <Eligibility3D />

      <div className="ambient ambient-one" />

      <div className="ambient ambient-two" />

      {/* ===============================================
          HEADER
      ================================================ */}

      <header className="eligibility-header">

        <a
          href="/"
          className="brand"
        >

          <span className="brand-mark">
            <Activity
              size={19}
            />
          </span>

          <span>
            BloodLink
            <b>AI</b>
          </span>

        </a>

        <div className="secure-pill">

          <LockKeyhole
            size={14}
          />

          Secure assessment

        </div>

      </header>

      {/* ===============================================
          ASSESSMENT SHELL
      ================================================ */}

      <section className="assessment-shell">

        {/* =============================================
            SIDEBAR
        ============================================== */}

        <aside className="assessment-sidebar">

          <div className="sidebar-top">

            <span className="mini-label">
              DONOR SCREENING
            </span>

            <h2>
              Know before
              <br />
              you donate.
            </h2>

            <p>
              A guided screening experience designed
              to collect the information needed for
              professional review.
            </p>

          </div>

          {/* TIMELINE */}

          <div className="timeline">

            {categories.map(
              (
                category,
                index
              ) => {

                const isActive =
                  category ===
                    currentCategory ||
                  (
                    category ===
                      "Medical report" &&
                    step ===
                      uploadStep
                  ) ||
                  (
                    category ===
                      "Review" &&
                    step ===
                      reviewStep
                  );

                const activeIndex =
                  categories.findIndex(
                    (item) =>
                      item ===
                      currentCategory
                  );

                const isDone =
                  index <
                  activeIndex;

                return (
                  <div
                    className={`timeline-item ${
                      isActive
                        ? "active"
                        : ""
                    } ${
                      isDone
                        ? "done"
                        : ""
                    }`}
                    key={
                      category
                    }
                  >

                    <span className="timeline-dot">

                      {isDone ? (
                        <Check
                          size={11}
                        />
                      ) : (
                        index + 1
                      )}

                    </span>

                    <span>
                      {category}
                    </span>

                  </div>
                );
              }
            )}

          </div>

          {/* PRIVACY */}

          <div className="privacy-card">

            <ShieldCheck
              size={19}
            />

            <div>

              <strong>
                Privacy first
              </strong>

              <span>
                Your information is intended for
                screening and review.
              </span>

            </div>

          </div>

        </aside>

        {/* =============================================
            MAIN CONTENT
        ============================================== */}

        <section className="assessment-main">

          {/* PROGRESS */}

          <div className="top-progress">

            <div className="progress-copy">

              <span>

                {step <
                totalQuestions
                  ? `Question ${
                      step + 1
                    } of ${totalQuestions}`
                  : step ===
                    uploadStep
                  ? "Medical report"
                  : "Final review"}

              </span>

              <strong>
                {Math.round(
                  progress
                )}
                %
              </strong>

            </div>

            <div className="progress-track">

              <motion.div
                className="progress-fill"
                animate={{
                  width: `${progress}%`,
                }}
                transition={{
                  duration: 0.4,
                }}
              />

            </div>

          </div>

          {/* QUESTION AREA */}

          <div className="question-area">

            <AnimatePresence mode="wait">

              {/* ===================================
                  QUESTIONS
              ==================================== */}

              {step <
                totalQuestions &&
                currentQuestion && (
                  <motion.div
                    key={
                      currentQuestion.id
                    }
                    className="question-screen"
                    initial={{
                      opacity: 0,
                      x: 40,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: -40,
                    }}
                    transition={{
                      duration: 0.35,
                    }}
                  >

                    <div className="question-heading">

                      <div className="question-icon">

                        <currentQuestion.categoryIcon
                          size={22}
                        />

                      </div>

                      <div>

                        <span className="question-category">
                          {
                            currentQuestion.category
                          }
                        </span>

                        <h1>
                          {
                            currentQuestion.title
                          }
                        </h1>

                        {currentQuestion.description && (
                          <p>
                            {
                              currentQuestion.description
                            }
                          </p>
                        )}

                      </div>

                    </div>

                    {/* OPTIONS */}

                    <div className="answers-grid">

                      {currentQuestion.options.map(
                        (
                          option,
                          index
                        ) => {

                          const selected =
                            answer ===
                            option;

                          return (
                            <motion.button
                              key={
                                option
                              }
                              className={`answer-card ${
                                selected
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                selectAnswer(
                                  option
                                )
                              }
                              whileHover={{
                                y: -3,
                              }}
                              whileTap={{
                                scale: 0.985,
                              }}
                              transition={{
                                duration: 0.15,
                              }}
                            >

                              <span className="answer-number">
                                {String.fromCharCode(
                                  65 +
                                    index
                                )}
                              </span>

                              <span className="answer-text">
                                {
                                  option
                                }
                              </span>

                              <span className="answer-check">

                                {selected && (
                                  <Check
                                    size={
                                      15
                                    }
                                  />
                                )}

                              </span>

                            </motion.button>
                          );
                        }
                      )}

                    </div>

                  </motion.div>
                )}

              {/* ===================================
                  UPLOAD
              ==================================== */}

              {step ===
                uploadStep && (
                <motion.div
                  key="upload"
                  className="upload-screen"
                  initial={{
                    opacity: 0,
                    x: 40,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -40,
                  }}
                >

                  <div className="upload-heading">

                    <div className="question-icon">
                      <FileText
                        size={23}
                      />
                    </div>

                    <div>

                      <span className="question-category">
                        Medical report
                      </span>

                      <h1>
                        Upload your medical document.
                      </h1>

                      <p>
                        Add a recent medical report or
                        relevant document for professional
                        review.
                      </p>

                    </div>

                  </div>

                  {/* DROP ZONE */}

                  <div
                    className={`drop-zone ${
                      dragActive
                        ? "drag-active"
                        : ""
                    } ${
                      file
                        ? "has-file"
                        : ""
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragActive(
                        true
                      );
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(
                        true
                      );
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(
                        false
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();

                      setDragActive(
                        false
                      );

                      handleFile(
                        e.dataTransfer
                          .files?.[0]
                      );
                    }}
                    onClick={() =>
                      fileRef.current?.click()
                    }
                  >

                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) =>
                        handleFile(
                          e.target
                            .files?.[0]
                        )
                      }
                    />

                    {!file ? (
                      <>
                        <div className="upload-icon">

                          <UploadCloud
                            size={30}
                          />

                        </div>

                        <h3>
                          Drop your document here
                        </h3>

                        <p>
                          or{" "}
                          <span>
                            browse from your computer
                          </span>
                        </p>

                        <small>
                          PDF, JPG, PNG or WEBP ·
                          Maximum 10MB
                        </small>
                      </>
                    ) : (
                      <div className="uploaded-file">

                        <div className="file-icon">

                          <FileCheck2
                            size={25}
                          />

                        </div>

                        <div className="file-details">

                          <strong>
                            {file.name}
                          </strong>

                          <span>
                            {(
                              file.size /
                              (1024 * 1024)
                            ).toFixed(
                              2
                            )}{" "}
                            MB
                          </span>

                        </div>

                        <button
                          className="remove-file"
                          onClick={(e) => {
                            e.stopPropagation();

                            setFile(
                              null
                            );

                            setScreeningError(
                              ""
                            );
                          }}
                        >

                          <X
                            size={17}
                          />

                        </button>

                      </div>
                    )}

                  </div>

                  {/* ERROR */}

                  {screeningError && (
                    <div className="screening-error">

                      <CircleAlert
                        size={18}
                      />

                      <div>

                        <strong>
                          Document issue
                        </strong>

                        <span>
                          {
                            screeningError
                          }
                        </span>

                      </div>

                    </div>
                  )}

                  {/* UPLOAD INFO */}

                  <div className="upload-info-row">

                    <div>
                      <ShieldCheck
                        size={17}
                      />

                      <span>
                        Secure upload
                      </span>
                    </div>

                    <div>
                      <FileText
                        size={17}
                      />

                      <span>
                        Document verification
                      </span>
                    </div>

                    <div>
                      <LockKeyhole
                        size={17}
                      />

                      <span>
                        Privacy focused
                      </span>
                    </div>

                  </div>

                </motion.div>
              )}

              {/* ===================================
                  REVIEW
              ==================================== */}

              {step ===
                reviewStep && (
                <motion.div
                  key="review"
                  className="review-screen"
                  initial={{
                    opacity: 0,
                    x: 40,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -40,
                  }}
                >

                  <div className="upload-heading">

                    <div className="question-icon">

                      <ClipboardCheck
                        size={23}
                      />

                    </div>

                    <div>

                      <span className="question-category">
                        Final review
                      </span>

                      <h1>
                        Everything looks ready.
                      </h1>

                      <p>
                        Review your assessment before
                        sending it for BloodLink AI-assisted
                        screening.
                      </p>

                    </div>

                  </div>

                  {/* REVIEW STATS */}

                  <div className="review-grid">

                    <div className="review-stat">

                      <span>
                        Questions answered
                      </span>

                      <strong>
                        {
                          Object.keys(
                            answers
                          ).length
                        }
                        /
                        {
                          totalQuestions
                        }
                      </strong>

                    </div>

                    <div className="review-stat">

                      <span>
                        Medical document
                      </span>

                      <strong>
                        {file
                          ? "Attached"
                          : "Missing"}
                      </strong>

                    </div>

                  </div>

                  {/* REVIEW LIST */}

                  <div className="review-list">

                    <div>

                      <Check
                        size={17}
                      />

                      <span>
                        Donor screening questionnaire
                        completed
                      </span>

                    </div>

                    <div>

                      <Check
                        size={17}
                      />

                      <span>
                        Medical document attached
                      </span>

                    </div>

                    <div>

                      <Check
                        size={17}
                      />

                      <span>
                        Information ready for
                        professional review
                      </span>

                    </div>

                  </div>

                  {/* ERROR */}

                  {screeningError && (
                    <div className="screening-error">

                      <CircleAlert
                        size={18}
                      />

                      <div>

                        <strong>
                          Screening could not be completed
                        </strong>

                        <span>
                          {
                            screeningError
                          }
                        </span>

                      </div>

                    </div>
                  )}

                  {/* CONSENT */}

                  <div className="consent-box">

                    <div className="consent-icon">

                      <ShieldCheck
                        size={19}
                      />

                    </div>

                    <div>

                      <strong>
                        Important medical note
                      </strong>

                      <p>
                        This assessment is a screening
                        aid. It does not diagnose medical
                        conditions or independently confirm
                        eligibility to donate blood. Final
                        decisions should be made according
                        to applicable blood-bank protocols
                        and qualified medical screening.
                      </p>

                    </div>

                  </div>

                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* =========================================
              FOOTER
          ========================================== */}

          <footer className="assessment-footer">

            <button
              className="back-button"
              onClick={back}
              disabled={
                step === 0 ||
                analyzing
              }
            >

              <ArrowLeft
                size={17}
              />

              Back

            </button>

            <div className="footer-hint">

              <CircleAlert
                size={15}
              />

              Answer honestly for accurate
              screening.

            </div>

            <button
              className={`continue-button ${
                step ===
                  uploadStep &&
                !file
                  ? "disabled"
                  : ""
              }`}
              onClick={next}
              disabled={
                analyzing ||
                (
                  step <
                    totalQuestions &&
                  !answer
                ) ||
                (
                  step ===
                    uploadStep &&
                  !file
                )
              }
            >

              {step ===
                reviewStep
                ? "Start AI screening"
                : step ===
                  uploadStep
                ? "Continue to review"
                : "Continue"}

              <ArrowRight
                size={18}
              />

            </button>

          </footer>

        </section>

      </section>

      {/* =============================================
          REVIEW MODAL
      ============================================== */}

      <AnimatePresence>

        {reviewOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={() =>
              setReviewOpen(
                false
              )
            }
          >

            <motion.div
              className="review-modal"
              initial={{
                opacity: 0,
                scale: 0.94,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.94,
                y: 20,
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-icon">

                <Sparkles
                  size={23}
                />

              </div>

              <span className="question-category">
                Ready for screening
              </span>

              <h2>
                Submit your donor assessment?
              </h2>

              <p>
                BloodLink AI will process your responses
                and document as a screening aid. Final
                donor eligibility must be confirmed by
                qualified medical staff.
              </p>

              <div className="modal-actions">

                <button
                  className="modal-secondary"
                  onClick={() =>
                    setReviewOpen(
                      false
                    )
                  }
                >
                  Go back
                </button>

                <button
                  className="modal-primary"
                  onClick={
                    startAnalysis
                  }
                >

                  Begin screening

                  <ArrowRight
                    size={17}
                  />

                </button>

              </div>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* =============================================
          ANALYSIS OVERLAY
      ============================================== */}

      <AnimatePresence>

        {analyzing && (
          <motion.div
            className="analysis-overlay"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >

            <motion.div
              className="analysis-core"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            >

              <div className="analysis-core-inner">

                <Activity
                  size={35}
                />

              </div>

            </motion.div>

            <motion.div
              className="analysis-pulse"
              animate={{
                scale: [
                  1,
                  1.25,
                  1,
                ],
                opacity: [
                  0.4,
                  0,
                  0.4,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            <h2>
              BloodLink AI is screening
            </h2>

            <p>
              Verifying your document and processing
              your assessment...
            </p>

            <div className="analysis-steps">

              <span>
                <Check size={14} />
                Document verification
              </span>

              <span>
                <Activity size={14} />
                Screening analysis
              </span>

              <span>
                <ShieldCheck size={14} />
                Preparing review
              </span>

            </div>

            <div className="analysis-loader">

              <motion.span
                animate={{
                  width: [
                    "10%",
                    "90%",
                    "45%",
                    "100%",
                  ],
                }}
                transition={{
                  duration: 2.6,
                  ease: "easeInOut",
                }}
              />

            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </main>
  );
}

/* =========================================================
   BACKGROUND 3D
========================================================= */

function Background3D() {
  return (
    <div
      className="blood-3d-scene"
      aria-hidden="true"
    >

      <div className="grid-floor" />

      <div className="blood-cell cell-a">
        <span />
      </div>

      <div className="blood-cell cell-b">
        <span />
      </div>

      <div className="blood-cell cell-c">
        <span />
      </div>

      <div className="blood-cell cell-d">
        <span />
      </div>

      <div className="blood-cell cell-e">
        <span />
      </div>

      <div className="dna-shape">

        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />

      </div>

      <div className="data-card data-card-one">

        <Activity
          size={14}
        />

        <span>
          HEALTH SIGNAL
        </span>

        <strong>
          Screening active
        </strong>

      </div>

      <div className="data-card data-card-two">

        <HeartPulse
          size={14}
        />

        <span>
          DONOR PROFILE
        </span>

        <strong>
          Secure
        </strong>

      </div>

      <div className="data-card data-card-three">

        <ShieldCheck
          size={14}
        />

        <span>
          VERIFICATION
        </span>

        <strong>
          Protected
        </strong>

      </div>

    </div>
  );
}