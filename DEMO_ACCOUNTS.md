# GradFlow — Demo Accounts & Staged Environments

This document details the dedicated demo accounts and staged project states prepared for the **GradFlow Day 17 Demo Rehearsal & Presentation**.

All demo accounts use the standard password: **`Password123!`**

---

## 1. Demo Credentials Table

| Role | Account Type | Display Name | Email | Password | Initial Workspace State & Role Purpose |
|------|--------------|--------------|-------|----------|-----------------------------------------|
| **Student** | **Primary** | Alex Morgan | `student.demo@gradflow.com` | `Password123!` | **State 1:** Has a pre-filled draft proposal (*AI-Powered Distributed Load Balancer*) ready to save or submit live.<br>**State 3:** Owns the active robotics project with a submitted milestone.<br>**State 5:** Candidate on scheduled defense viva. |
| **Coordinator** | **Primary** | Dr. Evelyn Reed | `coordinator.demo@gradflow.com` | `Password123!` | **Full Department Governance:**<br>• Review and approve proposals in `#review`<br>• Assign faculty supervisors in `#supervisors`<br>• Schedule defense panels with conflict checks in `#defenses` |
| **Supervisor** | **Primary** | Dr. Alan Turing | `supervisor.demo@gradflow.com` | `Password123!` | **State 3:** Assigned faculty advisor on *Autonomous Indoor Drone Navigation via Visual SLAM*. Has a pending milestone deliverable (*System Architecture & Visual Odometry Pipeline*) in `#workspace` waiting for live review/approval. |
| **Examiner** | **Primary** | Prof. Grace Hopper | `examiner.demo@gradflow.com` | `Password123!` | **State 5:** Lead examiner appointed to defense panel for *Predictive Healthcare Analytics Using Edge Computing*. Has active defense in `#vivas` ready for rubric evaluation. |
| **Student** | **Backup** | Samira Khan | `student2.demo@gradflow.com` | `Password123!` | **State 2:** Student author of *Blockchain-Based Academic Credential Verification System* (approved proposal awaiting supervisor).<br>**State 4:** Student author of *Cloud-Native Microservices Security Observability Platform* (`Final Submission` ready for defense scheduling). |
| **Coordinator** | **Backup** | Dr. Marcus Vance | `coordinator2.demo@gradflow.com` | `Password123!` | **Backup Coordinator:** Secondary administrative account for testing and multi-session coordinator demonstration. |
| **Supervisor** | **Backup** | Dr. Ada Lovelace | `supervisor2.demo@gradflow.com` | `Password123!` | **Backup Supervisor:** Faculty advisor on *Cloud-Native Security Observability Platform* and *Predictive Healthcare Analytics*. Available as alternate supervisor for assignment demonstrations. |
| **Examiner** | **Backup** | Prof. Donald Knuth | `examiner2.demo@gradflow.com` | `Password123!` | **Backup Examiner:** Co-examiner on the scheduled defense panel. Demonstrates multi-examiner panels and scoring. |

---

## 2. Staged Workflow States

The database seed provides 5 instantly accessible project states representing each stage of the graduation lifecycle. If any live step experiences an issue, switch to the corresponding staged state:

### State 1: Student Draft Proposal
- **Project Title:** `AI-Powered Distributed Load Balancer`
- **Current Status:** `Draft` (Progress: 0%)
- **Assigned Student:** `student.demo@gradflow.com`
- **Use in Demo:** Log in as Student, click **My Proposal** (`#proposal`), review the pre-populated fields, and click **Submit for review**.

### State 2: Approved Proposal Awaiting Supervisor Assignment
- **Project Title:** `Blockchain-Based Academic Credential Verification System`
- **Current Status:** `Approved` (Progress: 0%, `supervisorId: null`)
- **Assigned Student:** `student2.demo@gradflow.com`
- **Use in Demo:** Log in as Coordinator, open **Supervisors** (`#supervisors`), select this project from the unassigned list, and allocate `Dr. Alan Turing` or `Dr. Ada Lovelace`.

### State 3: Active Project with Submitted Milestone Ready for Review
- **Project Title:** `Autonomous Indoor Drone Navigation via Visual SLAM`
- **Current Status:** `In Progress` (Progress: 17%)
- **Assigned Student:** `student.demo@gradflow.com`
- **Assigned Supervisor:** `supervisor.demo@gradflow.com` (Dr. Alan Turing)
- **Pending Deliverable:** Milestone 2 (*System Architecture & Design Document*) has a submitted deliverable with GitHub URL and PDF metadata.
- **Use in Demo:** Log in as Supervisor, open **Projects & Milestones** (`#workspace`), select the project, and demonstrate approving the deliverable or requesting revisions with structured feedback.

### State 4: Project in Final Submission Ready for Defense Scheduling
- **Project Title:** `Cloud-Native Microservices Security Observability Platform`
- **Current Status:** `Final Submission` (Progress: 100%, all 6 milestones approved)
- **Assigned Student:** `student2.demo@gradflow.com`
- **Assigned Supervisor:** `supervisor2.demo@gradflow.com` (Dr. Ada Lovelace)
- **Use in Demo:** Log in as Coordinator, open **Defense Scheduling** (`#defenses`). This project immediately appears in the *Eligible Project (Final Submission)* dropdown, ready to schedule with date, time, room, and examiner assignment without needing to manually pass 6 milestones during the presentation.

### State 5: Defense Scheduled Ready for Examiner Scoring
- **Project Title:** `Predictive Healthcare Analytics Using Edge Computing`
- **Current Status:** `Defense Scheduled` (Progress: 100%)
- **Assigned Student:** `student.demo@gradflow.com`
- **Assigned Examiners:** `examiner.demo@gradflow.com` & `examiner2.demo@gradflow.com`
- **Schedule Details:** Hall A - Boardroom 3 (Upcoming date, 10:00 – 11:30)
- **Use in Demo:** Log in as Examiner, open **Assigned Defenses** (`#vivas`), click **Evaluate Defense**, fill the 5 rubric criteria (Problem Understanding, Implementation, Functionality, Documentation, Presentation), select verdict, and submit score. Demonstrates automatic completion and archival!

---

## 3. How to Seed and Reset Demo Data

The seed script is **completely idempotent** and **non-destructive to existing non-demo records**. It only targets and refreshes accounts ending with `@gradflow.com` and their associated demonstration records.

### Quick Command:
```bash
# From workspace root
node scripts/seed-demo.js
```

### With Explicit Reset Flag:
```bash
node scripts/seed-demo.js --reset
```

### Recommended Timing:
Run `node scripts/seed-demo.js` approximately **15 minutes before the rehearsal or presentation** to ensure all 5 stages are fresh and ready for clicks.
