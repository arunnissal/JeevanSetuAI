# Changelog ⏳

All notable changes to the JeevanSetu AI project are documented in this file.

---

## [1.0.0] - 2026-07-24
### Added
*   **Root Documentation:** Added comprehensive root-level documentation (`README.md`, `INSTALLATION.md`, `CHANGELOG.md`, and unified `.env.example`).
*   **Security Fixes:** Removed accidental tracking of `.env` configuration files from Git index history and updated `.gitignore` rules to guarantee security.

### Fixed
*   **Frontend Dependency Resolution:** Installed `@expo/vector-icons` directly into the package.json to solve clean-build pipeline failures on Vercel.
*   **Deployment Configuration:** Refined backend database migrations executing directly inside Render's Build Commands to ensure schema creation.
*   **Static Asset Optimization:** Set up WhiteNoise static middleware and asset compression inside settings.py to serve Django Admin dashboard correctly.

---

## [0.9.0] - 2026-07-13
### Added
*   **Emergency Features:** Added the Emergency Medical Card popup layout and copy-to-clipboard functionality to help first responders.
*   **Profile Views Decoupling:** Separated details dashboard from editing state. Built `edit-profile.tsx` for modifications and `profile.tsx` as a read-only screen.
*   **Production Readiness:**
    *   Set up dynamic environment bindings for `DATABASE_URL`, `SECRET_KEY`, and `DEBUG` variables.
    *   Added psycopg2-binary, dj-database-url, and gunicorn to backend dependencies for Render and Neon PostgreSQL deployments.

---

## [0.8.0] - 2026-07-10
### Added
*   **End-to-End AI Pipeline:** Integrated Sarvam AI API Gateway for report analysis, document categorization, and contextual companion conversations.
*   **State Management:** Initialized Zustand state model stores to manage user profile info, vault files, and chronological timeline events locally and in memory.
*   **Medical Document Vault:** Implemented Cloudinary storage support for uploading, organizing, and saving medical records.
*   **Testing suite:** Established backend automated tests (44/44 successful assertions).
