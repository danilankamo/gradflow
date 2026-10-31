# GradFlow — Day 17 Presentation & Rehearsal Demo Script

**Total Demo Duration:** 11 Minutes (Target Window: 10–12 Minutes)  
**Deployment URLs:**
- **Frontend:** [https://gradflow-gamma.vercel.app](https://gradflow-gamma.vercel.app)
- **Backend API:** [https://gradflow-ii8n.onrender.com](https://gradflow-ii8n.onrender.com)

---

## Pre-Demo Checklist (T-Minus 15 Minutes)

1. [ ] **Reset Seed Data (15 min prior):**
   ```bash
   node scripts/seed-demo.js --reset
   ```
2. [ ] **Wake Up Backend (5 min prior to avoid cold start):**
   ```bash
   curl -s https://gradflow-ii8n.onrender.com/
   ```
3. [ ] **Setup Multi-Session Browser Windows:**
   To ensure smooth transitions without repetitive sign-ins, open 4 separate browser windows or profiles:
   - **Window 1 (Chrome Regular):** Student (`student.demo@gradflow.com`)
   - **Window 2 (Chrome Incognito):** Coordinator (`coordinator.demo@gradflow.com`)
   - **Window 3 (Microsoft Edge):** Supervisor (`supervisor.demo@gradflow.com`)
   - **Window 4 (Edge InPrivate / Firefox):** Examiner (`examiner.demo@gradflow.com`)
4. [ ] **Display Settings:** Set browser zoom to 110% or 125% for high readability on screen share.
5. [ ] **Disaster Fallback Ready:** Keep `DEMO_SCRIPT.md` open on a second screen or side panel for quick copy-pasting.

---

## Master Credentials Quick Reference

| Role | Email | Password | Pre-logged Window |
|------|-------|----------|-------------------|
| **Student** | `student.demo@gradflow.com` | `Password123!` | Window 1 |
| **Coordinator** | `coordinator.demo@gradflow.com` | `Password123!` | Window 2 |
| **Supervisor** | `supervisor.demo@gradflow.com` | `Password123!` | Window 3 |
| **Examiner** | `examiner.demo@gradflow.com` | `Password123!` | Window 4 |

---

## Timed Walkthrough

### 00:00 – 01:00 (1:00 min) — Introduction & System Overview
- **Screen:** Window 1 (Landing / Student Overview at `#overview`)
- **Action:** Show the GradFlow header, cycle status badges, and academic timeline.
- **What to Say:**
  > *"Welcome to GradFlow — a university graduation project lifecycle management system. Universities face coordination bottlenecks when tracking final-year capstone projects across disconnected spreadsheets, paper forms, and emails. GradFlow unifies the entire academic journey into a secure, role-governed workflow covering four stakeholders: Students, Coordinators, Supervisors, and Examiners. Today, I'll walk you through the complete golden path on our live production deployment."*

---

### 01:00 – 03:00 (2:00 min) — Step 1: Student Submits Proposal
- **Role:** **Student** (Alex Morgan)
- **Window:** Window 1 (`student.demo@gradflow.com`)
- **Action:**
  1. Click **My Proposal** in navigation (`#proposal`).
  2. Point out the pre-populated proposal: **AI-Powered Distributed Load Balancer**.
  3. Briefly edit or verify the fields:
     - **Title:** `AI-Powered Distributed Load Balancer`
     - **Category:** `Distributed Systems`
     - **Abstract:** *(Pre-filled)*
     - **Methodology:** *(Pre-filled)*
  4. Click **Save draft** to demonstrate draft persistence.
  5. Click **Submit for review**.
  6. Point out the status badge changing from `Draft` to `Submitted` and editing becoming locked.
- **What to Say:**
  > *"As a student, I draft and refine my proposal. Notice that required academic fields — title, abstract, problem statement, and methodology — are enforced on the server. Once I click 'Submit for review', the proposal is locked against tampering, six standard milestones are initialized, and the department coordinator is notified."*
- **Instant Fallback:** If submission is already submitted or delayed, switch to Window 2 directly: Coordinator can review Stage 1 or Stage 2 proposal.

---

### 03:00 – 05:00 (2:00 min) — Steps 2 & 3: Coordinator Reviews Proposal & Assigns Supervisor
- **Role:** **Coordinator** (Dr. Evelyn Reed)
- **Window:** Window 2 (`coordinator.demo@gradflow.com`)
- **Action:**
  1. Navigate to **Proposal Review** (`#review`).
  2. Click on proposal **AI-Powered Distributed Load Balancer** (or Stage 2 *Blockchain-Based Academic Credential Verification*).
  3. In the coordinator feedback box, paste:
     ```text
     Proposal meets department academic rigor standards. Approved for faculty supervisor allocation.
     ```
  4. Click **Approve**. Show status changing to `Approved`.
  5. Navigate to **Supervisors** (`#supervisors`).
  6. Under unassigned projects, select **Blockchain-Based Academic Credential Verification** (or the approved project).
  7. In the supervisor dropdown, select **Dr. Alan Turing** (`supervisor.demo@gradflow.com`).
  8. Click **Assign Supervisor**.
  9. Point out project status advancing to `In Progress` with faculty supervisor bound.
- **What to Say:**
  > *"Now switching to the Department Coordinator view. Coordinators have departmental oversight. We open the proposal review queue, attach academic feedback, and formally approve the proposal. Next, in Supervisor Management, we allocate faculty supervisor Dr. Alan Turing. This immediately transitions the project into active development and triggers in-app notifications."*
- **Instant Fallback:** Stage 3 (*Autonomous Indoor Drone Navigation via Visual SLAM*) is already assigned to Dr. Alan Turing in `In Progress` state.

---

### 05:00 – 07:00 (2:00 min) — Steps 4 & 5: Milestone Deliverables & Supervisor Sign-off
- **Role:** **Supervisor** (Dr. Alan Turing)
- **Window:** Window 3 (`supervisor.demo@gradflow.com`)
- **Action:**
  1. Navigate to **Projects & Milestones** (`#workspace`).
  2. Select project **Autonomous Indoor Drone Navigation via Visual SLAM** (Stage 3).
  3. Show the milestone tracking bar (Milestone 1 is already approved; Milestone 2 has a pending submission).
  4. Expand Milestone 2: **System Architecture & Design Document**.
  5. Point out the candidate's deliverable: GitHub link `https://github.com/gradflow/drone-vslam-system` and attached architecture PDF metadata.
  6. In supervisor review feedback, type or paste:
     ```text
     System architecture diagrams and ROS2 package manifests approved. Proceed to implementation.
     ```
  7. Click **Approve Submission**.
  8. Point out project progress automatically recalculating on the server.
- **What to Say:**
  > *"Switching to faculty supervisor Dr. Alan Turing. Supervisors monitor candidate deliverables and deadline health. We inspect the student's submitted GitHub repository link and architecture document. We can request revisions with mandatory feedback, or approve the submission. Approving immediately triggers our progress synchronization utility, advancing the project towards final defense eligibility."*
- **Instant Fallback:** Stage 4 (*Cloud-Native Microservices Security Observability Platform*) already has 100% of milestones approved in `Final Submission` status.

---

### 07:00 – 09:00 (2:00 min) — Step 6: Coordinator Schedules Defense (Conflict Rejection)
- **Role:** **Coordinator** (Dr. Evelyn Reed)
- **Window:** Window 2 (`coordinator.demo@gradflow.com`)
- **Action:**
  1. Navigate to **Defense Scheduling** (`#defenses`).
  2. Click **Schedule New Defense**.
  3. In the *Eligible Project (Final Submission)* dropdown, select:
     `Cloud-Native Microservices Security Observability Platform` (Stage 4).
  4. Fill schedule details:
     - **Date:** Select date 5 days from today
     - **Start Time:** `14:00`
     - **End Time:** `15:30`
     - **Room:** `Auditorium B - Panel Hall`
     - **Examiners:** Check **Prof. Grace Hopper** (`examiner.demo@gradflow.com`)
  5. Click **Schedule Defense**.
  6. Point out defense appears on the upcoming defense calendar and project transitions to `Defense Scheduled`.
  7. *(Optional 20-second feature highlight)*: Attempt to schedule a second defense in the same room at the same time to show GradFlow's automated conflict detection dialog.
- **What to Say:**
  > *"Only projects with 100% approved milestones qualify for defense scheduling. As coordinator, I schedule the oral viva panel for candidate Samira Khan. Notice that GradFlow features an algorithmic conflict engine: if an examiner or room is double-booked during that time window, the system strictly rejects the booking. With no conflicts, the defense is booked and the viva panel is notified."*
- **Instant Fallback:** Stage 5 (*Predictive Healthcare Analytics Using Edge Computing*) is already scheduled in *Hall A - Boardroom 3* ready for examination.

---

### 09:00 – 10:30 (1:30 min) — Step 7: Examiner Evaluates Oral Defense
- **Role:** **Examiner** (Prof. Grace Hopper)
- **Window:** Window 4 (`examiner.demo@gradflow.com`)
- **Action:**
  1. Navigate to **Assigned Defenses** (`#vivas`).
  2. Open the scheduled defense for **Predictive Healthcare Analytics Using Edge Computing** (Stage 5).
  3. Click **Evaluate Defense** to open the structured rubric.
  4. Enter scores:
     - **Problem Understanding (max 20):** `19`
     - **Technical Implementation (max 25):** `24`
     - **System Functionality (max 25):** `24`
     - **Documentation (max 15):** `14`
     - **Presentation (max 15):** `14`
     *(Total automatically displays 95/100)*
  5. Select **Verdict:** `immediate-pass` (or `minor-corrections`).
  6. Enter **Comments:**
     ```text
     Outstanding defense viva. Rigorous edge telemetry evaluation with impressive benchmark results.
     ```
  7. Click **Submit Evaluation**.
  8. Point out defense status transitions to `Completed` and project status moves to `Completed`!
- **What to Say:**
  > *"Finally, we step into the shoes of the examination panelist, Prof. Grace Hopper. During the viva voce, the examiner scores the candidate across five standardized criteria. The system calculates the rubric total, prevents unauthorized edits by third parties, and marks the project as completed once the panel submits."*

---

### 10:30 – 11:30 (1:00 min) — Wrap-up & Project Archive
- **Role:** **All / Coordinator**
- **Window:** Window 2 or Window 1
- **Action:**
  1. Click the **Notification Bell** in topbar: show the real-time audit trail of approvals, assignments, and defense alerts.
  2. Click **Project Archive** (`#archive`): show the completed projects directory featuring students, department, supervisor, final grade, and abstract.
- **What to Say:**
  > *"To close the loop, GradFlow maintains complete transparency. Notice the notification bell with full audit history for all parties, and the public project archive preserving institutional memory. The application is responsive, secure, and production-deployed with zero third-party blockers. That concludes the GradFlow MVP demonstration. Thank you, and I welcome any questions."*

---

## Disaster Recovery: "If the Whole Thing Dies" Plan

If internet connectivity fails or production hosting experiences downtime during your presentation:

1. **Localhost Fallback (Zero Network Dependency):**
   - Start local MongoDB and backend:
     ```bash
     cd server && npm start
     ```
   - Start local frontend:
     ```bash
     cd client && npm run dev
     ```
   - Open browser at `http://localhost:5173`.
2. **Offline HTML Spec Walkthrough:**
   - If server cannot run, open `stitch_examiner_evaluation.html` or `stitch_notifications.html` in the root folder directly in Chrome to present the responsive visual specifications.
3. **Smoke Test Log Verification:**
   - Present the terminal output of `npm run smoke:test` proving all 17 integration points pass end-to-end on live infrastructure.
