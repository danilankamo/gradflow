GradFlow — Project Documentation

University Graduation Project Lifecycle Management System

Software Requirements, Architecture, Security & Design Specification

INSA CTC Summer Camp — Pre-Graduation Project

Development Department

Prepared by: Individual Developer

Version 1.0

October 2026

# Table of Contents

Executive Summary

1. Introduction

1.1 Background

1.2 Problem Statement

1.3 Proposed Solution

1.4 Project Objectives

1.5 Stakeholders

1.6 Document Purpose and Scope

2. Project Scope

2.1 In Scope (MVP)

2.2 Out of Scope (Future Work)

3. User Roles & Use Cases

3.1 Actors

3.2 Use Case Summary

3.3 Representative User Stories

4. Functional Requirements

5. Non-Functional Requirements

6. System Architecture

6.1 High-Level Architecture

6.2 Project Workflow

6.3 Technology Stack

7. Database Schema

7.1 User

7.2 Project

7.3 Milestone

7.4 Submission

7.5 Defense

7.6 Evaluation

7.7 Notification

8. API Contract

8.1 Authentication

8.2 Users

8.3 Projects & Proposals

8.4 Milestones & Submissions

8.5 Defense & Evaluation

8.6 Notifications

9. User Interface & Experience Overview

10. Security & Threat Model

10.1 Security Principles

10.2 STRIDE Threat Analysis

11. Testing & Quality Assurance

12. Development Process & Solo Timeline

12.1 Individual Development Structure

12.2 Seventeen-Day Development Timeline

12.3 Repository Structure

13. Risk Management

14. Future Roadmap

15. Conclusion

Appendix A: Glossary

# Executive Summary

GradFlow is a web-based university graduation project lifecycle management system designed to centralize and simplify the process of managing final-year projects. The platform covers the essential workflow from project proposal submission and departmental review through supervisor assignment, milestone tracking, deliverable submission, defense scheduling, examiner evaluation, and final completion.

The system is intentionally scoped as an individual-developer MVP. Instead of attempting to replace a complete university information system, GradFlow focuses on one clearly defined workflow and provides the roles, permissions, records, and status transitions required to manage that workflow consistently.

This document is the primary technical and process reference for the GradFlow project. It defines the MVP scope, actors, functional and non-functional requirements, architecture, database design, API contract, interface requirements, security approach, testing strategy, development timeline, risks, and future roadmap.

The documentation follows the structure of the supplied CampusHustle project specification, while removing features that depend on a team or that are unnecessary for the GradFlow MVP. The reference project similarly separates MVP functionality from future work to keep the deliverable realistic within a fixed development window. fileciteturn0file0L674-L679

# 1. Introduction

## 1.1 Background

Graduation projects involve several participants and a sequence of academic decisions. Students submit proposals, departments review them, supervisors are assigned, students complete milestones, supervisors provide feedback, and completed projects are eventually defended and evaluated. When these activities are managed through disconnected spreadsheets, documents, messaging applications, and paper records, it becomes difficult to maintain a reliable view of project progress and deadlines.

## 1.2 Problem Statement

Universities need a focused system for tracking graduation projects throughout their lifecycle. Students need to know what is due and what feedback they have received; supervisors need a consolidated view of their projects; coordinators need to manage approvals, assignments, and defenses; and examiners need access to the projects they are evaluating.

## 1.3 Proposed Solution

GradFlow provides a role-based web application that centralizes graduation-project records and workflow. Each project has a defined status, supervisor, milestones, submissions, and evaluation history. The system enforces role permissions and validates important workflow transitions on the server.

## 1.4 Project Objectives

Digitize the essential graduation-project lifecycle in one platform.

Provide students with a clear view of project status, milestones, deadlines, and feedback.

Allow supervisors to review projects, manage milestones, and provide structured feedback.

Allow department coordinators to approve proposals, assign supervisors, and schedule defenses.

Allow examiners to review projects and submit final evaluations.

Provide role-based access control and secure handling of academic records.

Deliver a complete, deployed MVP suitable for an individual developer within a short development window.

## 1.5 Stakeholders

| Stakeholder | Interest |

| --- | --- |

| Students | Submit and complete graduation projects with clear deadlines and feedback. |

| Supervisors | Monitor assigned projects and review student progress. |

| Department Coordinator | Manage proposals, supervisors, projects, and defense schedules. |

| Examiners | Review assigned projects and submit evaluation results. |

| University/Department | Maintain a consistent record of graduation-project activities. |

| INSA CTC Reviewers | Evaluate practical software engineering, architecture, security, and problem-solving ability. |

## 1.6 Document Purpose and Scope

This document defines the requirements and technical design of the GradFlow MVP. Features not essential to the core lifecycle are explicitly excluded from the MVP and listed as future work.

# 2. Project Scope

## 2.1 In Scope (MVP)

User registration and login.

Role-based access for Student, Supervisor, Coordinator, and Examiner.

Student and staff profiles.

Graduation-project proposal creation and submission.

Coordinator proposal review and approval/rejection.

Supervisor assignment.

Project status tracking.

Project milestones with deadlines.

Student deliverable submission using file/link metadata.

Supervisor review, approval, rejection, and feedback.

Defense scheduling with room and examiner conflict validation.

Examiner evaluation and final score recording.

In-app notifications for important workflow events.

Coordinator and role-specific dashboards.

Basic project archive for completed projects.

## 2.2 Out of Scope (Future Work)

Native Android/iOS application.

Real-time chat or video conferencing.

AI-based project recommendations.

Automatic plagiarism detection.

Online payment or financial features.

University-wide student information system functionality.

Complex document editing inside the platform.

Advanced analytics and predictive project-risk models.

External university Single Sign-On integration.

Automated national ID verification.

# 3. User Roles & Use Cases

## 3.1 Actors

| Actor | Description |

| --- | --- |

| Student | Creates a project proposal, works through milestones, submits deliverables, and views feedback and defense information. |

| Supervisor | Reviews assigned projects, manages milestones, evaluates submissions, and provides feedback. |

| Coordinator | Manages projects and users, reviews proposals, assigns supervisors, and schedules defenses. |

| Examiner | Reviews assigned final projects and records defense/evaluation scores. |

## 3.2 Use Case Summary

| ID | Use Case | Primary Actor |

| --- | --- | --- |

| UC-1 | Register/Login | All |

| UC-2 | Manage profile | All |

| UC-3 | Create and submit proposal | Student |

| UC-4 | Review proposal | Coordinator |

| UC-5 | Assign supervisor | Coordinator |

| UC-6 | Manage milestones | Supervisor |

| UC-7 | Submit deliverable | Student |

| UC-8 | Review deliverable and give feedback | Supervisor |

| UC-9 | Schedule defense | Coordinator |

| UC-10 | Evaluate project | Examiner |

| UC-11 | View notifications | All |

| UC-12 | View project archive | Coordinator/Authorized users |

## 3.3 Representative User Stories

As a student, I want to submit my graduation-project proposal so that the department can review it.

As a coordinator, I want to approve or reject proposals so that only valid projects enter the active project lifecycle.

As a coordinator, I want to assign a supervisor to an approved project so that responsibility is clearly defined.

As a student, I want to see my milestones and deadlines so that I can track my progress.

As a supervisor, I want to review a submitted deliverable and request changes so that project quality can be monitored.

As a coordinator, I want to schedule defenses without examiner or room conflicts.

As an examiner, I want to record structured scores and comments for an assigned project.

As a student, I want to receive notifications when my proposal, submission, or defense status changes.

# 4. Functional Requirements

| ID | Requirement |

| --- | --- |

| FR-1 | The system shall authenticate users using email and password. |

| FR-2 | The system shall enforce role-based authorization for Student, Supervisor, Coordinator, and Examiner. |

| FR-3 | Students shall create and edit a project proposal before submission. |

| FR-4 | Students shall submit proposals for coordinator review. |

| FR-5 | Coordinators shall approve or reject submitted proposals with an optional comment. |

| FR-6 | Coordinators shall assign a supervisor to an approved project. |

| FR-7 | The system shall maintain project status throughout the lifecycle. |

| FR-8 | Supervisors shall create or manage milestones for assigned projects. |

| FR-9 | Students shall submit milestone deliverables. |

| FR-10 | Supervisors shall approve or request revision of submissions and provide feedback. |

| FR-11 | The system shall calculate project progress from milestone completion. |

| FR-12 | Coordinators shall create defense schedules with date, time, room, project, and examiner. |

| FR-13 | The system shall prevent conflicting examiner and room schedules. |

| FR-14 | Examiners shall submit structured evaluations for assigned projects. |

| FR-15 | The system shall calculate and store the final evaluation score. |

| FR-16 | The system shall generate in-app notifications for major workflow events. |

| FR-17 | Authorized users shall be able to view completed project records in the archive. |

# 5. Non-Functional Requirements

| ID | Requirement |

| --- | --- |

| NFR-1 | Passwords shall be hashed using bcrypt; plaintext passwords shall never be stored. |

| NFR-2 | Authorization shall be enforced server-side on every protected route. |

| NFR-3 | All user input shall be validated on the server before database writes. |

| NFR-4 | Uploaded files shall be restricted by allowed type and size. |

| NFR-5 | The interface shall be responsive and usable on desktop and mobile browsers. |

| NFR-6 | Core dashboard/API operations should respond within approximately 2 seconds under normal demo load. |

| NFR-7 | The system shall maintain clear project status transitions and prevent invalid workflow changes. |

| NFR-8 | The codebase shall use modular separation of frontend components, backend routes/controllers, services, and models. |

| NFR-9 | The MVP should use free or low-cost deployment tiers where practical. |

| NFR-10 | The application shall provide meaningful error messages without exposing sensitive server details. |

# 6. System Architecture

## 6.1 High-Level Architecture

GradFlow follows a standard three-tier web architecture. A React frontend communicates with an Express/Node.js REST API. The API performs authentication, authorization, validation, workflow logic, and database operations. MongoDB stores application data.

┌──────────────────────┐  
│     React Frontend   │  
│ Vite + Tailwind CSS  │  
└──────────┬───────────┘  
           │ HTTPS / REST  
           ▼  
┌──────────────────────┐  
│ Node.js + Express    │  
│ Auth • RBAC • Logic  │  
│ Validation • APIs    │  
└──────────┬───────────┘  
           │ Mongoose  
           ▼  
┌──────────────────────┐  
│      MongoDB Atlas   │  
│ Users • Projects     │  
│ Milestones • etc.    │  
└──────────────────────┘  
           │  
           ├── File Storage (optional)  
           └── Email service (optional)

## 6.2 Project Workflow

Draft  
  ↓  
Submitted  
  ↓  
Under Review  
  ├── Rejected → Revision → Resubmitted  
  └── Approved  
          ↓  
   Supervisor Assigned  
          ↓  
   In Progress  
          ↓  
   Milestones Completed  
          ↓  
   Final Submission  
          ↓  
   Defense Scheduled  
          ↓  
   Evaluated  
          ↓  
   Completed / Archived

## 6.3 Technology Stack

| Layer | Technology |

| --- | --- |

| Frontend | React + Vite + Tailwind CSS |

| Backend | Node.js + Express |

| Database | MongoDB Atlas + Mongoose |

| Authentication | JWT + bcrypt |

| API | REST/JSON |

| File Storage | Cloudinary or equivalent free-tier storage |

| Version Control | Git + GitHub |

| Frontend Hosting | Vercel or equivalent |

| Backend Hosting | Render/Railway or equivalent |

# 7. Database Schema

## 7.1 User

{  
  _id,  
  name,  
  email,  
  passwordHash,  
  role: "student" | "supervisor" | "coordinator" | "examiner",  
  department,  
  studentId?,  
  bio?,  
  skills: [String],  
  createdAt,  
  updatedAt  
}

## 7.2 Project

{  
  _id,  
  title,  
  abstract,  
  problemStatement,  
  objectives: [String],  
  methodology,  
  technologies: [String],  
  category,  
  students: [ObjectId],  
  supervisorId?,  
  status,  
  progress,  
  coordinatorComment?,  
  createdAt,  
  updatedAt  
}

## 7.3 Milestone

{  
  _id,  
  projectId,  
  title,  
  description,  
  dueDate,  
  status: "pending" | "submitted" | "approved" | "revision",  
  order,  
  createdAt  
}

## 7.4 Submission

{  
  _id,  
  milestoneId,  
  projectId,  
  studentId,  
  fileUrl?,  
  githubUrl?,  
  description,  
  status: "submitted" | "approved" | "revision",  
  feedback?,  
  submittedAt,  
  reviewedAt?  
}

## 7.5 Defense

{  
  _id,  
  projectId,  
  examinerIds: [ObjectId],  
  date,  
  startTime,  
  endTime,  
  room,  
  status,  
  createdAt  
}

## 7.6 Evaluation

{  
  _id,  
  projectId,  
  examinerId,  
  scores: {  
    implementation,  
    documentation,  
    presentation,  
    problemUnderstanding,  
    functionality  
  },  
  total,  
  comments,  
  submittedAt  
}

## 7.7 Notification

{  
  _id,  
  userId,  
  type,  
  title,  
  message,  
  relatedProjectId?,  
  isRead,  
  createdAt  
}

# 8. API Contract

## 8.1 Authentication

| Method | Endpoint | Description |

| --- | --- | --- |

| POST | /api/auth/register | Create account |

| POST | /api/auth/login | Authenticate user and return token |

| GET | /api/auth/me | Get current user |

## 8.2 Users

| Method | Endpoint | Description |

| --- | --- | --- |

| GET | /api/users/me | Get own profile |

| PUT | /api/users/me | Update own profile |

| GET | /api/users/:id | Get authorized user profile |

| GET | /api/users | Coordinator: list/filter users |

## 8.3 Projects & Proposals

| Method | Endpoint | Description |

| --- | --- | --- |

| POST | /api/projects | Student creates proposal |

| GET | /api/projects/my | Get student's projects |

| GET | /api/projects/:id | Get project details |

| PATCH | /api/projects/:id/submit | Submit proposal |

| PATCH | /api/projects/:id/review | Coordinator approves/rejects |

| PATCH | /api/projects/:id/supervisor | Coordinator assigns supervisor |

## 8.4 Milestones & Submissions

| Method | Endpoint | Description |

| --- | --- | --- |

| POST | /api/projects/:id/milestones | Supervisor creates milestone |

| GET | /api/projects/:id/milestones | List milestones |

| POST | /api/milestones/:id/submissions | Student submits deliverable |

| PATCH | /api/submissions/:id/review | Supervisor reviews submission |

## 8.5 Defense & Evaluation

| Method | Endpoint | Description |

| --- | --- | --- |

| POST | /api/defenses | Coordinator schedules defense |

| GET | /api/defenses | List authorized defense schedules |

| POST | /api/defenses/:id/evaluations | Examiner submits evaluation |

| GET | /api/projects/:id/evaluations | Get project evaluations |

## 8.6 Notifications

| Method | Endpoint | Description |

| --- | --- | --- |

| GET | /api/notifications | Get current user's notifications |

| PATCH | /api/notifications/:id/read | Mark notification as read |

## 8.7 Example Request/Response — Proposal Submission

PATCH /api/projects/PROJECT_ID/submit  
  
Response 200:  
{  
  "projectId": "64b...",  
  "status": "submitted",  
  "submittedAt": "2026-10-10T09:30:00Z"  
}

# 9. User Interface & Experience Overview

The interface should prioritize clarity over visual complexity. Each role should see a dashboard centered on the actions relevant to that role. The MVP should be responsive and usable on both desktop and mobile browsers.

## 9.1 Public / Authentication

Landing page

Login

Registration

Forgot password (optional if time permits)

## 9.2 Student Screens

Student Dashboard — project status, progress, deadlines, notifications.

Profile — academic and contact information.

Create/Edit Proposal — proposal form and draft saving.

Project Details — supervisor, status, milestones, feedback.

Submission Page — upload deliverables and add GitHub links.

Defense Page — defense date, time, room, examiner.

Notifications — workflow alerts.

## 9.3 Supervisor Screens

Supervisor Dashboard — assigned projects and progress.

Project Details — milestones, submissions, feedback.

Milestone Management — create/update milestone deadlines.

Submission Review — approve or request revision.

## 9.4 Coordinator Screens

Coordinator Dashboard — project and workflow statistics.

Proposal Queue — review and approve/reject proposals.

Project Management — assign supervisors and manage status.

User Management — manage students, supervisors, examiners.

Defense Scheduler — schedule defenses and detect conflicts.

Reports/Archive — view completed projects.

## 9.5 Examiner Screens

Examiner Dashboard — assigned defenses.

Project Review — project information and final submissions.

Evaluation Form — structured scoring and comments.

# 10. Security & Threat Model

## 10.1 Security Principles

Passwords are hashed with bcrypt and never returned in API responses.

JWT authentication is required for protected resources.

Role-based access control is enforced on the server, not only in the frontend.

Ownership checks prevent users from modifying projects or submissions they do not control.

All request bodies are validated and sanitized.

Uploaded files are checked for type and size.

Sensitive errors are logged server-side but not exposed to clients.

Rate limiting should be applied to authentication and write-heavy endpoints.

## 10.2 STRIDE Threat Analysis

| Category | Example Threat | Mitigation |

| --- | --- | --- |

| Spoofing | Attacker uses another user's credentials. | Strong password hashing, JWT authentication, session controls. |

| Tampering | Student changes project status through a crafted API request. | Server-side authorization and workflow validation. |

| Repudiation | User denies submitting a deliverable. | Submission timestamps and audit fields. |

| Information Disclosure | Unauthorized user accesses another project's records. | Role and ownership checks. |

| Denial of Service | Repeated login/API requests flood the server. | Rate limiting and input limits. |

| Elevation of Privilege | Student calls coordinator endpoint. | Server-side RBAC middleware. |

# 11. Testing & Quality Assurance

## 11.1 Testing Strategy

Unit tests for core workflow logic such as status transitions and defense conflict detection.

API integration tests for authentication, authorization, projects, submissions, and evaluations.

Manual end-to-end walkthroughs for each major role.

Security tests for invalid tokens, role boundaries, malformed requests, and unauthorized project access.

Responsive UI checks on desktop and mobile viewport sizes.

## 11.2 Sample Test Cases

| ID | Test Case | Expected Result |

| --- | --- | --- |

| TC-1 | Register with missing required fields | Validation error; account is not created. |

| TC-2 | Student accesses coordinator endpoint | 403 Forbidden. |

| TC-3 | Student submits proposal | Project status changes to Submitted. |

| TC-4 | Coordinator rejects proposal | Status changes to Rejected and comment is stored. |

| TC-5 | Student submits milestone deliverable | Submission is recorded and supervisor is notified. |

| TC-6 | Supervisor approves submission | Milestone becomes Approved and progress updates. |

| TC-7 | Coordinator schedules two defenses in the same room/time | Second schedule is rejected. |

| TC-8 | Examiner evaluates unassigned project | Request is rejected. |

| TC-9 | Student accesses another student's project | Access denied unless explicitly authorized. |

| TC-10 | Completed project is archived | Project becomes read-only for normal workflow changes. |

# 12. Development Process & Solo Timeline

## 12.1 Individual Development Structure

GradFlow is intentionally designed for one developer. Unlike the supplied CampusHustle specification, which divides work among multiple feature owners, GradFlow uses sequential vertical slices so that each completed slice produces a testable part of the system. The reference document's team structure and parallel fifteen-day plan are therefore not copied; they are replaced by a solo workflow appropriate to this project. fileciteturn0file0L1090-L1116

Plan and document the schema/API before implementation.

Build one complete workflow at a time instead of separating frontend and backend work by person.

Commit frequently with clear feature-based messages.

Test each workflow before starting the next.

Reserve dedicated time for security, deployment, documentation, and demo rehearsal.

## 12.2 Seventeen-Day Development Timeline

| Days | Phase | Focus |

| --- | --- | --- |

| 1 | Planning | Finalize requirements, workflow, database schema, API list, project setup. |

| 2–3 | Foundation | React layout, Express server, MongoDB, authentication, roles, middleware. |

| 4–6 | Student Workflow | Profile, proposal creation, draft, submission, project dashboard. |

| 7–8 | Coordinator Workflow | Proposal review, approval/rejection, supervisor assignment. |

| 9–10 | Milestones | Milestone creation, deadlines, submissions, feedback, progress calculation. |

| 11–12 | Defense | Defense scheduling, examiner assignment, room/time conflict validation. |

| 13 | Evaluation | Examiner evaluation, score calculation, project completion. |

| 14 | Notifications | In-app notifications and dashboard polish. |

| 15 | Security & Testing | Authorization tests, validation, file checks, workflow edge cases. |

| 16 | Deployment & Documentation | Deploy, seed demo data, write README and technical documentation. |

| 17 | Demo & Polish | Fix remaining bugs, responsive polish, final rehearsal, screenshots/video. |

## 12.3 Repository Structure

gradflow/  
├── client/  
│   ├── src/  
│   │   ├── components/  
│   │   ├── pages/  
│   │   ├── layouts/  
│   │   ├── hooks/  
│   │   ├── services/  
│   │   └── utils/  
│   └── ...  
├── server/  
│   ├── controllers/  
│   ├── middleware/  
│   ├── models/  
│   ├── routes/  
│   ├── services/  
│   ├── utils/  
│   └── server.js  
├── docs/  
└── README.md

## 12.4 Tools

Git and GitHub for version control.

GitHub Projects or a simple Kanban board for task tracking.

Postman/Insomnia for API testing.

MongoDB Atlas for database hosting.

Browser developer tools for frontend debugging.

# 13. Risk Management

| Risk | Likelihood | Impact | Mitigation |

| --- | --- | --- | --- |

| Scope becomes too large | High | High | Freeze MVP around the core lifecycle; postpone optional features. |

| Solo development bottleneck | High | High | Build vertical slices and avoid parallel feature complexity. |

| File upload/deployment issues | Medium | Medium | Implement simple validated uploads first; use free-tier storage. |

| Defense scheduling edge cases | Medium | Medium | Use clear date/time conflict validation and test boundary cases. |

| Authentication/authorization bugs | Medium | High | Write explicit RBAC tests and validate permissions server-side. |

| Insufficient time for polish | Medium | Medium | Reserve final two days for deployment, testing, and demo. |

| Database design changes late | Medium | Medium | Finalize core schemas before feature development. |

# 14. Future Roadmap

University SSO integration.

Email and SMS notifications.

Automated supervisor recommendation based on skills and workload.

Advanced project-risk analytics.

Plagiarism/similarity checking for final reports.

Public searchable project repository.

Research/project collaboration features.

Mobile application.

Integration with an existing university student information system.

Multi-department and multi-university support.

# 15. Conclusion

GradFlow is designed as a focused software engineering project rather than a complete university information system. Its value comes from solving a clearly defined workflow with appropriate roles, permissions, status transitions, records, and accountability.

The MVP intentionally concentrates on the essential lifecycle: proposal submission, departmental review, supervisor assignment, milestone tracking, deliverable review, defense scheduling, and final evaluation. This keeps the system achievable for one developer while still demonstrating full-stack development, database design, API development, authentication, authorization, validation, workflow logic, testing, deployment, and responsive UI design.

The project can therefore serve both as a functional prototype for university graduation-project management and as evidence of practical software development ability for an INSA CTC Software Development track application.

# Appendix A: Glossary

| Term | Definition |

| --- | --- |

| MVP | Minimum Viable Product — the smallest feature set that delivers meaningful value and can be fully implemented and tested. |

| RBAC | Role-Based Access Control — permissions are determined by a user's assigned role. |

| JWT | JSON Web Token — a signed token used for authenticated API requests. |

| Milestone | A defined project stage with a deadline and completion state. |

| Deliverable | A file, link, or other artifact submitted by a student for a milestone. |

| Defense | The formal presentation and evaluation of a completed graduation project. |

| Examiner | Authorized academic staff member who evaluates a project during its final assessment. |

| Coordinator | Department-level user responsible for managing the project workflow. |
