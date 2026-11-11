# Backend & AI Engine Testing Report

This document summarizes the automated test suites, bug fixes, and verification coverage implemented for the BloodLink AI backend and AI matching engine.

## 1. Test Environments & Tools

- **Backend API & Unit Tests (`backend/`)**: `jest`, `supertest`, and `mongodb-memory-server` running against an isolated in-memory MongoDB instance.
- **AI Engine Tests (`ai-engine/`)**: `pytest` and FastAPI `TestClient` covering feature engineering, safety rules, and API validation.

### Running the Tests

```bash
# Backend API, middleware, verification, and model tests (3 suites, 31 tests)
cd backend
npm test

# AI engine feature and FastAPI tests (7 tests)
python -m pytest ai-engine/test_ai.py -v
```

## 2. Test Coverage Summary

1. **Authentication & Account Flows (`backend/src/tests/auth.test.js`)**
   - Donor registration (`POST /api/auth/register/donor`), duplicate email/phone detection (`409`), and validation failures (`400`).
   - Public endpoint security: blocks `ADMIN` role creation and enforces document upload presence for `HOSPITAL` and `BLOOD_BANK` accounts.
   - Email OTP verification lifecycle (`/verify-email-otp`, `/resend-email-otp`): valid OTP verification, expired OTP rejection, OTP reuse prevention, and OTP regeneration.
   - Verified login JWT issuance and credential/status checks (unverified account `403`, wrong password `401`, unknown email `401`, inactive user `403`).
   - Password reset flow (`/forgot-password`, `/reset-password/:token`): token generation, invalid/reused token rejection, and password update verification.

2. **Organization & Document Verification (`backend/src/tests/verification.test.js`)**
   - Endpoints: `GET /api/health`, `GET /api/verification/status`, and `GET /api/verification/test-data`.
   - Service unit checks (`verificationService.js`): SHA-256 document hashing (`sha256File`), OCR reference parsing (`extractReportReference`), hospital HFR matching, blood-bank licence matching, and medical report validation against `verificationRegistry.json`.
   - Guard behavior when `VERIFICATION_MODE=production` is active without an external verifier URL (`UNAVAILABLE`).

3. **Middleware, Validators & Domain Models (`backend/src/tests/middleware.test.js`)**
   - `protect` JWT guard: rejects missing/malformed/invalid tokens (`401`), enforces `ENFORCE_ORG_VERIFICATION`, and strips the `password` field from `req.user`.
   - `authorize` RBAC guard: verifies role access restrictions (`403`) and missing user context handling (`401`).
   - Joi validation middleware and schemas (`authValidator.js`, `donorValidator.js`): strips unknown keys, normalizes emails, and rejects invalid Indian phone numbers, pincodes, and coordinates.
   - Mongoose validation checks on `Donor` GeoJSON points and `BloodRequest` unit constraints.

4. **AI Matching Engine (`ai-engine/test_ai.py`)**
   - Blood group compatibility matrix checks across donor/recipient combinations.
   - Haversine geodesic distance and city-centroid distance fallbacks, including exact GPS overrides.
   - Gender-based donation gap flagging (90 days for Male donors, 120 days for Female donors) and `hard_filter` medical safety gates.
   - FastAPI endpoints: `/health`, `/match` ranking order & empty-pool handling, `422` validation for unknown blood groups/urgency levels, and `503` fallback responses when trained `.pkl` artifacts are absent.

## 3. Bugs Identified & Fixed

1. **Missing `ai-engine/config.py`**:
   - **Issue**: `ai-engine/api.py` and `ai-engine/train_donor_match_model.py` imported paths (`MATCH_MODEL`, `DEMAND_MODEL`, `PAIRS_FILE`, `REPORTS`, `RANDOM_STATE`) from `config`, which did not exist and caused `ModuleNotFoundError` when importing the AI service or running `pytest`.
   - **Fix**: Added `ai-engine/config.py` with centralized `pathlib.Path` definitions relative to `ai-engine/`.

2. **Broken Import Path in `ai-engine/test_ai.py`**:
   - **Issue**: `sys.path.insert(0, str(Path(__file__).resolve().parents[1]))` pointed to the repository root instead of `ai-engine/`, breaking imports when running `pytest` from root.
   - **Fix**: Updated the path insertion to `parents[0]` and expanded tests with stubbed model fixtures for offline FastAPI testing.

3. **Unmounted Verification Routes in `backend/src/app.js`**:
   - **Issue**: `verificationRoutes.js` was implemented but never mounted in Express `app.js`, and no `/api/health` endpoint existed.
   - **Fix**: Mounted `/api/verification` and added `/api/health` in `backend/src/app.js`.

4. **Missing `req.user` Guard in `backend/src/middleware/authMiddleware.js`**:
   - **Issue**: Calling `authorize(...)` without a populated `req.user` threw an unhandled `TypeError` instead of returning `401`.
   - **Fix**: Added an explicit `!req.user` check returning HTTP `401`.

5. **Earlier Schema & Auth Module Fixes**:
   - Restored OTP/verification fields in `User.js`, added `Hospital.js` and `Bloodbank.js` models, and fixed missing `services/` and `uploadMiddleware.js` imports required by `authController.js`.
