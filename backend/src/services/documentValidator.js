const fs = require("fs");
const path = require("path");

const { PDFParse } = require("pdf-parse");

async function validateDocument(filePath) {
  try {
    console.log("🔍 Validating document:", filePath);

    // File exists?
    if (!filePath) {
      return {
        valid: false,
        reason: "No document path was provided.",
      };
    }

    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        reason: "Uploaded document could not be found.",
      };
    }

    const extension = path.extname(filePath).toLowerCase();

    // ==========================================
    // PDF
    // ==========================================

    if (extension === ".pdf") {
      const buffer = fs.readFileSync(filePath);

      if (!buffer || buffer.length === 0) {
        return {
          valid: false,
          reason: "The uploaded PDF is empty.",
        };
      }

      let parser = null;

      try {
        parser = new PDFParse({
          data: buffer,
        });

        const result = await parser.getText();

        const text = result?.text || "";

        console.log(
          "📄 PDF text extracted:",
          text.length,
          "characters"
        );

        if (!text.trim()) {
          return {
            valid: false,
            reason:
              "The PDF does not contain readable text.",
          };
        }

        return {
          valid: true,
          requiresOCR: false,
          text: text,
        };
      } catch (error) {
        console.error(
          "❌ PDF parsing error:",
          error
        );

        return {
          valid: false,
          reason:
            "The uploaded PDF could not be read.",
        };
      } finally {
        if (parser) {
          try {
            await parser.destroy();
          } catch (error) {
            console.error(
              "PDF parser cleanup error:",
              error.message
            );
          }
        }
      }
    }

    // ==========================================
    // IMAGES
    // ==========================================

    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ];

    if (imageExtensions.includes(extension)) {
      const stats = fs.statSync(filePath);

      if (stats.size === 0) {
        return {
          valid: false,
          reason: "The uploaded image is empty.",
        };
      }

      return {
        valid: true,
        requiresOCR: true,
        text: "",
      };
    }

    // ==========================================
    // UNSUPPORTED
    // ==========================================

    return {
      valid: false,
      reason: "Unsupported document format.",
    };
  } catch (error) {
    console.error(
      "❌ Document validation error:",
      error
    );

    return {
      valid: false,
      reason:
        "Unable to validate the uploaded document.",
    };
  }
}

// VERY IMPORTANT
module.exports = {
  validateDocument,
};