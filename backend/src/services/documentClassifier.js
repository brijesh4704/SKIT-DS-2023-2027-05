const strongMedicalTerms = [
  "medical report",
  "lab report",
  "laboratory report",
  "blood test",
  "blood report",
  "patient",
  "hemoglobin",
  "haemoglobin",
  "platelet",
  "cbc",
  "rbc",
  "wbc",
  "diagnosis",
  "clinical",
  "pathology",
  "hospital",
  "doctor",
  "prescription",
  "medicine",
  "medication",
];

const medicalTerms = [
  "medical",
  "health",
  "blood",
  "test",
  "report",
  "patient",
  "hospital",
  "doctor",
  "diagnosis",
  "hemoglobin",
  "haemoglobin",
  "platelet",
  "cbc",
  "rbc",
  "wbc",
  "laboratory",
  "clinical",
  "pathology",
  "medicine",
  "medication",
];

function classifyDocument(text = "") {
  const normalizedText = String(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  console.log(
    "📄 Classifier received text:",
    JSON.stringify(normalizedText)
  );

  if (!normalizedText) {
    return {
      isMedical: false,
      confidence: 0,
      matchedTerms: [],
    };
  }

  const matchedStrongTerms = strongMedicalTerms.filter(
    (term) => normalizedText.includes(term)
  );

  const matchedTerms = medicalTerms.filter(
    (term) => normalizedText.includes(term)
  );

  const uniqueMatchedTerms = [
    ...new Set(matchedTerms),
  ];

  const uniqueStrongTerms = [
    ...new Set(matchedStrongTerms),
  ];

  let confidence = 0;

  // Strong medical phrase
  if (uniqueStrongTerms.length >= 2) {
    confidence = 0.95;
  }

  // One strong medical phrase
  else if (uniqueStrongTerms.length === 1) {
    confidence = 0.85;
  }

  // Multiple normal medical terms
  else if (uniqueMatchedTerms.length >= 3) {
    confidence = 0.85;
  }

  else if (uniqueMatchedTerms.length >= 2) {
    confidence = 0.65;
  }

  else {
    confidence = 0.15;
  }

  const isMedical = confidence >= 0.65;

  const result = {
    isMedical,
    confidence,
    matchedTerms: uniqueMatchedTerms,
  };

  console.log(
    "🧠 Document classification:",
    result
  );

  return result;
}

module.exports = {
  classifyDocument,
};