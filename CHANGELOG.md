# Changelog

All notable changes to the **GradFlow** graduation project lifecycle management platform are documented in this file.

The project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0-mvp] - 2026-10-31 — GradFlow MVP (Demo Ready & Release Freeze)

This release concludes the 17-Day Individual Execution Action Plan, delivering a fully deployed, role-governed, and tested MVP for university graduation project lifecycle management.

### Day 17 Additions & Stabilization

#### 1. Demo Infrastructure & Idempotent Seeding
- **Script:** Added [`scripts/seed-demo.js`](file:///c:/projects/gradflow/scripts/seed-demo.js) and root command `npm run seed:demo`.
- **Credentials:** Created 4 primary accounts (`student.demo@gradflow.com`, `coordinator.demo@gradflow.com`, `supervisor.demo@gradflow.com`, `examiner.demo@gradflow.com`) and 4 backup accounts with uniform password `Password123!`.
- **Staged Workflow States:** Seeded 5 isolated workflow stages allowing instant demonstration of any lifecycle step without sequential dependency:
  - Stage 1: Student Draft Proposal (*AI-Powered Distributed Load Balancer*)
  - Stage 2: Approved Proposal Awaiting Supervisor (*Blockchain-Based Academic Credential Verification*)
  - Stage 3: In Progress with Submitted Deliverable (*Autonomous Indoor Drone Navigation via Visual SLAM*)
  - Stage 4: Final Submission Ready for Defense (*Cloud-Native Security Observability Platform*)
  - Stage 5: Scheduled Defense Ready for Examiner Rubric (*Predictive Healthcare Analytics*)
- **Reset Safety:** Implemented `--reset` flag that targets strictly demo domain records (`*.demo@gradflow.com`), guaranteeing non-destructive behavior against non-demo user data.
- **Documentation:** Created [`DEMO_ACCOUNTS.md`](file:///c:/projects/gradflow/DEMO_ACCOUNTS.md).

#### 2. Automated Production Smoke Test Suite
- **Script:** Added [`scripts/smoke-test.js`](file:///c:/projects/gradflow/scripts/smoke-test.js) and root command `npm run smoke:test`.
- **Deployment Verification:** Verified live production URLs on Vercel and Render:
  - Phase 1: Frontend and Backend API Health 200 checks.
  - Phase 2: Role authentication across all 4 user roles.
  - Phase 3: Server-side RBAC protection (rejection of unauthorized actions with 403 Forbidden).
  - Phase 4: Full 7-step golden path integration using throwaway candidate and project artifacts:
    - Proposal creation & submission
    - Coordinator review & approval
    - Supervisor allocation
    - Milestone deliverable submission with multipart file upload & GitHub URL
    - Supervisor review & milestone approval
    - Automatic transition to `Final Submission`
    - Conflict-safe oral defense scheduling & room conflict rejection (409 Conflict)
    - Examiner rubric evaluation (5 criteria scoring) and project completion transition
  - Phase 5: Automated cleanup of throwaway verification data.
- **Test Result:** 17/17 production integration points passed with 0 defects.

#### 3. Timed Presentation Walkthrough & Rehearsal Guide
- **Documentation:** Created [`DEMO_SCRIPT.md`](file:///c:/projects/gradflow/DEMO_SCRIPT.md) featuring:
  - 11-minute presentation budget across all four roles.
  - Exact click-by-click instructions and copy-paste inputs.
  - "What to say" talking points highlighting architecture and security.
  - Instant staged-state fallbacks for each role transition.
  - Pre-demo setup (multi-browser window strategy, warm-up ping).
  - Disaster recovery protocols for offline presentations.

#### 4. Minimal Day 17 Defect Fixes & Workspace Tweaks
- **Symptom:** Workspace scripts (`seed-demo.js`, `smoke-test.js`) executed from repository root could not resolve hoisted dependencies (`dotenv`, `mongoose`).
- **Root Cause:** Node module resolution in npm workspace looked in root `node_modules` instead of `server/node_modules`.
- **Fix:** Prepend `server/node_modules` to `module.paths` at script initialization.
- **Files Touched:** `scripts/seed-demo.js`, `scripts/smoke-test.js`, `package.json`.

---

## [0.9.0] - Days 1–16 — Core Lifecycle MVP

- **Day 1–2 (Foundation & Auth):** Express server, MongoDB Atlas schemas, bcrypt password hashing, JWT stateless authentication, role middleware (`student`, `coordinator`, `supervisor`, `examiner`).
- **Day 3–4 (Student Proposals & Coordinator Review):** Proposal forms, draft saving, proposal status transitions (`Draft` → `Submitted` → `Under Review` → `Approved` / `Revision` / `Rejected`), server-side edit locks.
- **Day 5 (Supervisor Management):** Faculty listing, skills inventory, supervisor assignment to approved projects, transition to `In Progress`.
- **Day 6–7 (Milestones & Deliverable Workflow):** 6-stage standard milestone sequence, deadline tracking, progress calculation, deliverable upload with file/link support, supervisor review.
- **Day 8 (Integration Milestone):** Full student-to-supervisor core workflow sign-off.
- **Day 9–10 (Defense & Evaluation):** Defense scheduling engine with room and examiner conflict detection, structured 5-criteria examiner rubric scoring, automatic project completion.
- **Day 11 (Notifications):** Server-side in-app notification engine with read/unread tracking and project navigation.
- **Day 12–13 (Dashboards & Archive):** Role-specific dashboards, Project Health heuristics (`Healthy`, `At Risk`, `Delayed`), read-only historical project archive.
- **Day 14 (Security Pass):** STRIDE threat mitigations, password hash exclusion, rate limiting, input sanitization, file upload limits, 123 automated test suites.
- **Day 15 (Responsive UI & Performance):** Mobile-first responsive polish, loading/empty states, system font fallbacks, query optimizations.
- **Day 16 (Deployment):** Frontend deployed to Vercel, Backend deployed to Render, connected to MongoDB Atlas.
