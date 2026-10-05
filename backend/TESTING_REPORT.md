# Backend Testing & Bug Fix Report

This document outlines the testing environment setup and the critical bugs identified and resolved during the backend testing phase.

## 1. Test Environment Setup
- **Testing Frameworks**: Configured `jest`, `supertest`, and `mongodb-memory-server` to allow for robust API testing with an isolated in-memory database.
- **Entry Points**: Added `src/app.js` and `src/server.js` to properly initialize and start the Express server.
- **Test Scripts**: Configured `npm test` in `package.json` and established test environments via `jest.config.js` and `jest.setup.js`.
- **API Tests**: Developed automated integration test cases in `src/tests/auth.test.js` to rigorously test the Donor registration flow and login constraints.

## 2. Critical Bugs Found & Fixed

During the testing phase, the following breaking issues in the application logic were uncovered and resolved:

1. **Missing Schema Fields in `User.js`**: 
   - **Bug**: Verification fields like `emailVerificationOTP`, `emailVerified`, and `organizationVerified` were not defined in the `User` Mongoose schema. Due to Mongoose's strict schema enforcement, these fields were being ignored upon saving, which broke the OTP verification flow.
   - **Fix**: Added all necessary verification fields to `src/models/User.js`.

2. **Missing Services Directory**:
   - **Bug**: `src/controllers/authController.js` imported functions from `../services/emailService` and `../services/verificationService`, but the `src/services` directory was missing, causing module resolution crashes.
   - **Fix**: Created the `services` directory and added mock implementations for `emailService.js` and `verificationService.js` to restore functionality. (Note: Real email logic using services like Nodemailer should be integrated here in the future).

3. **Missing Organization Models**:
   - **Bug**: The auth controller referenced `Hospital` and `BloodBank` models, which did not exist in `src/models`.
   - **Fix**: Implemented `Hospital.js` and `Bloodbank.js` with correct schema definitions matching the controller's requirements.

4. **Missing Upload Middleware**:
   - **Bug**: `src/routes/authRoutes.js` attempted to import `upload` from `../middleware/uploadMiddleware`, which was missing.
   - **Fix**: Created `uploadMiddleware.js` to provide the required mock structure. Future updates will incorporate `multer` for handling real file uploads.
