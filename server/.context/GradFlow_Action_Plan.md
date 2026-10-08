# GradFlow
Execution Action Plan
Days 1–17 · Individual Development Timeline
University Graduation Project Lifecycle Management System · Version 1.0 · October 2026

This document operationalizes the GradFlow Project Documentation into daily, individually executable tasks.  The plan prioritizes the golden path—proposal → approval → supervisor assignment → milestones → submissions → defense → evaluation—before optional polish.


| Workstream | Scope | Primary Requirements |
| --- | --- | --- |
| Foundation & Security | Project scaffold, MongoDB, authentication, JWT, RBAC, validation | FR-1, NFR-1–4 |
| Student Workflow | Profile, proposal, project status, milestones, submissions | FR-2–7 |
| Coordinator Workflow | Proposal review, supervisor assignment, project administration | FR-8–10 |
| Supervisor Workflow | Assigned projects, milestone review, feedback and revision | FR-11–12 |
| Defense & Evaluation | Defense scheduling, examiner assignment, scoring and completion | FR-13–15 |
| Notifications & Dashboard | Role dashboards, notifications, progress/health indicators | FR-16–17 |
| Quality & Delivery | Testing, security review, deployment, documentation, demo | NFR-5–10 |

#1  Day-by-Day Action Plan

## Day 1 — Architecture & Development Setup
- Finalize MVP scope and acceptance criteria; freeze the essential feature list.
- Create MERN repository, frontend/backend structure, environment configuration, Git workflow and README skeleton.
- Create MongoDB Atlas database and initial Mongoose models for User, Project, Milestone, Submission, Defense, Evaluation and Notification.
- Set up Express server, React/Vite app, API base configuration and error-handling structure.
- Output: Running frontend and backend, connected database, initial schema and repository structure.

## Day 2 — Authentication & RBAC
- Implement user registration/login with bcrypt password hashing and JWT authentication.
- Implement /me endpoint and protected routes.
- Implement server-side role-based access control for student, supervisor, coordinator and examiner.
- Create login/register pages and role-aware route guards.
- Add validation and safe error responses.
- FR-1, NFR-1–4. Exit criterion: each role can authenticate and unauthorized role access returns 403.

## Day 3 — Student Profile & Project Creation
- Implement student profile read/update flow.
- Build project proposal form: title, abstract, problem statement, objectives, methodology, technologies, category and keywords.
- Support Save Draft and Submit Proposal.
- Implement proposal status transitions: Draft → Submitted → Under Review.
- Lock editing after submission unless the coordinator requests revision.
- FR-2–4. Output: student can create and submit a complete proposal.

## Day 4 — Coordinator Proposal Review
- Build coordinator dashboard with project counts and pending proposals.
- Implement proposal list/detail views.
- Implement Approve, Reject/Request Revision and coordinator comments.
- Enforce valid status transitions on the backend.
- Show status and feedback to the student.
- FR-8–9. Exit criterion: proposal review works end-to-end from student submission to coordinator decision.

## Day 5 — Supervisor Management & Assignment
- Implement supervisor CRUD/listing for coordinator.
- Implement supervisor profile fields including department and skills.
- Implement supervisor assignment to approved projects.
- Prevent invalid assignments and duplicate/conflicting ownership.
- Create supervisor dashboard showing assigned projects.
- FR-10–12. Output: approved project can be assigned and immediately appears in the supervisor workspace.

## Day 6 — Project Status & Milestones
- Create milestone CRUD and project milestone views.
- Add standard milestone sequence: Requirements, System Design, Implementation, Testing, Final Report and Defense.
- Implement due dates, ordering and milestone status.
- Calculate project progress from milestone completion.
- Show next deadline and overdue milestones on dashboards.
- FR-5–7, NFR-5. Output: project progress is visible and driven by actual milestone data.

## Day 7 — Deliverable Submission & Feedback
- Implement file/link submission for milestones, with optional GitHub URL and description.
- Add file type/size validation and secure upload handling.
- Build supervisor review flow: Approve or Request Revision.
- Store feedback and timestamps.
- Allow students to resubmit revised deliverables.
- FR-6, FR-12, NFR-3. Exit criterion: milestone submission → supervisor review → feedback/revision works end-to-end.

## Day 8 — Milestone: Core Student/Supervisor Workflow Complete
- Run full walkthrough: register → login → create proposal → coordinator approval → supervisor assignment → milestone submission → supervisor feedback.
- Write unit/integration tests for status transitions, ownership checks and milestone progress.
- Fix integration bugs only; no new major features.
- Merge all stable work to main and tag the first internal milestone.
- Milestone: Core Workflow Complete. Exit criterion: the primary project lifecycle is demoable without defense/evaluation.

## Day 9 — Defense Scheduling
- Implement Defense schema and coordinator scheduling UI.
- Add date, time, room and examiner assignment.
- Implement conflict detection for examiner overlap and room overlap.
- Prevent scheduling incomplete/invalid projects.
- Display defense details to students, supervisors and examiners.
- FR-13. High-value algorithmic feature: scheduling must reject conflicting bookings.

## Day 10 — Examiner Evaluation
- Implement examiner dashboard and assigned-project view.
- Build structured evaluation form: problem understanding, technical implementation, functionality, documentation and presentation.
- Calculate total score from configured criteria.
- Prevent unauthorized examiners from evaluating other projects.
- Store comments and final evaluation state.
- FR-14–15. Exit criterion: scheduled defense → examiner evaluation → stored score works end-to-end.

## Day 11 — Notifications
- Implement notification creation for proposal decisions, supervisor assignment, feedback/revision, defense scheduling and evaluation completion.
- Build notification list/bell and read/unread state.
- Link notifications to the relevant project or action where appropriate.
- Verify notifications are generated server-side rather than trusted from the client.
- FR-16. Output: important workflow events produce visible in-app notifications.

## Day 12 — Dashboards & Project Health
- Complete role-specific dashboards.
- Student: project progress, next deadline, supervisor, feedback and notifications.
- Supervisor: assigned projects, pending reviews and overdue milestones.
- Coordinator: projects by status, pending approvals, supervisor workload and defense schedule.
- Implement simple Project Health logic: Healthy / At Risk / Delayed using milestone progress, overdue work and recent activity.
- FR-17, NFR-5–6. Output: dashboards communicate project state without requiring users to open every record.

## Day 13 — Integration & Archive
- Run all representative user stories on the merged main branch.
- Implement completed-project/archive view with title, students, department, abstract, technologies, supervisor, score and project links where available.
- Make completed records read-only to normal users.
- Fix cross-role and cross-project access issues discovered during integration.
- Integration checkpoint: proposal, project progress, defense, evaluation and archive all connect through the same Project record.

## Day 14 — Testing & Security Pass
- Exercise authentication, authorization and ownership checks for every protected endpoint.
- Test STRIDE-style risks: spoofing, tampering, information disclosure, privilege escalation and denial-of-service exposure.
- Verify password hashes are never returned; validate file type/size; sanitize inputs; apply rate limiting to authentication/write-heavy endpoints.
- Run API integration tests and critical UI workflows.
- Test invalid status transitions and cross-student/cross-supervisor access.
- Exit criterion: every critical security control is verified in the running application, not only documented.

## Day 15 — Responsive UI, Error Handling & Performance
- Complete mobile/tablet/desktop responsive pass.
- Add loading, empty, success and failure states to major pages.
- Check API response times on common operations and optimize obvious database/query issues.
- Improve navigation, breadcrumbs/status indicators and form validation messages.
- Remove console errors and debug output.
- NFR-5–8. Output: stable and presentable application across common screen sizes.

## Day 16 — Deployment & Documentation
- Deploy frontend to Vercel and backend to Render/Railway or equivalent.
- Connect production MongoDB Atlas database and file storage.
- Configure environment variables and production CORS/security settings.
- Finalize README, API documentation, database diagram, setup instructions, test results and screenshots.
- Run the deployed application from a clean browser/session.
- Milestone: Deployed Build. Exit criterion: the complete golden path works in production.

## Day 17 — Demo Rehearsal & Final Freeze
- Run a timed demo covering all four roles.
- Demo student proposal creation/submission, coordinator approval, supervisor assignment, milestone submission/review, defense scheduling and examiner evaluation.
- Prepare backup demo accounts/data and verify the deployed environment immediately before presentation.
- Fix only critical demo-blocking defects; no new features.
- Tag the final release and freeze the MVP.
- Milestone: Demo Ready. Final output: deployed, tested and rehearsed GradFlow MVP.

# 2. Definition of Done (per feature)
- Implements the corresponding GradFlow Functional Requirement or explicitly supports an NFR; no scope expansion without removing a lower-priority task.
- Works on the real backend and database, not only with static/mock data.
- Has the relevant validation, authorization and ownership checks.
- Handles at least one failure case as well as the happy path.
- Has a unit or integration test for critical workflow logic.
- Has been manually checked in the browser at least once after integration.
- Does not introduce unresolved console errors, exposed secrets or sensitive debug logging.

# 3. Git & Individual Development Conventions
- Branch naming: feature/<module>-<short-description>, e.g. feature/defense-conflict-check.
- Commit small, logically grouped changes; use clear messages such as feat, fix, test, refactor and docs.
- Use main only for stable integrated work; merge feature branches after local testing.
- Kanban columns: Backlog → In Progress → Testing → Done.
- Create an issue/checklist for every major FR and close it only after acceptance criteria pass.
- Keep a daily development log containing shipped work, blockers, test status and next task.

# 4. Milestone Checkpoints

| Day | Milestone | Exit Criteria |
| --- | --- | --- |
| 2 | Foundation & Security | Auth, JWT, RBAC, validation and database connection work. |
| 8 | Core Workflow Complete | Proposal → approval → assignment → milestones → submission/review works end-to-end. |
| 10 | Defense & Evaluation Complete | Conflict-safe scheduling and structured examiner evaluation work. |
| 13 | Integration Complete | All four roles and the main project lifecycle work on merged main. |
| 14 | Security Sign-off | Critical authentication, authorization, ownership, validation and upload controls verified. |
| 16 | Deployed Build | Production deployment works with real database/storage configuration. |
| 17 | Demo Ready | Timed demo rehearsed, final release tagged, no critical blockers. |

# 5. Scope Protection for an Individual Developer
The plan intentionally protects the MVP from features that can consume the remaining schedule without improving the core graduation-project workflow. Do not add real-time chat, video meetings, AI recommendations, mobile apps, microservices, blockchain, payments or plagiarism detection during these 17 days. Optional features such as team management, GitHub integration, advanced analytics and QR project archives should only be attempted after Day 17 if every MVP checkpoint has passed.

# 6. Final Golden-Path Demo
1. Student logs in and completes a project proposal.
1. Student submits the proposal; coordinator sees it as pending.
1. Coordinator approves it and assigns a supervisor.
1. Supervisor opens the assigned project and sees the milestone plan.
1. Student submits a milestone deliverable.
1. Supervisor reviews it, requests a revision or approves it, and leaves feedback.
1. Coordinator schedules the defense while the system rejects room/examiner conflicts.
1. Examiner opens the assigned project and submits structured scores.
1. Student sees final status/evaluation and the project becomes completed/archived.
1. Dashboard and notification states demonstrate the lifecycle throughout.

GradFlow · Individual Execution Action Plan · v1.0
