# GradFlow

**GradFlow** is a web-based university graduation project lifecycle management system designed to centralize and simplify the process of managing final-year projects. The platform covers the essential workflow: proposal submission, departmental review, supervisor assignment, milestone tracking, deliverable evaluation, defense scheduling, and final assessment.

Built as an individual-developer MVP, GradFlow focuses on one clearly defined workflow with appropriate roles, security controls, and scalable architecture—delivering a complete, deployed prototype suitable for a university graduation-project ecosystem.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Features](#features)
- [User Roles & Use Cases](#user-roles--use-cases)
- [System Architecture](#system-architecture)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Development Timeline](#development-timeline)
- [Contributing](#contributing)

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 | Component-based UI with fast build tool and utility-first styling |
| Backend | Node.js + Express | RESTful API server |
| Database | MongoDB Atlas + Mongoose | NoSQL document storage for flexible schemas |
| Authentication | JWT + bcrypt | Stateless authentication and secure password hashing |
| File Storage | Cloudinary | Free-tier file hosting for proposals and submissions |
| Frontend Hosting | Vercel | Fast, zero-config deployment for React apps |
| Backend Hosting | Render/Railway | Managed Node.js deployment |
| Version Control | Git + GitHub | Source code management |

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Git
- MongoDB Atlas account (free tier available)
- Optional: Cloudinary account for file uploads

### Setup

#### 1. Clone the repository

```bash
git clone https://github.com/danilankamo/gradflow.git
cd gradflow
```

#### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Update `.env` with your configuration:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/gradflow
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=5000
CLOUDINARY_URL=your_cloudinary_url
```

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000`

#### 3. Frontend Setup

```bash
cd client
npm install
cp .env.example .env
```

Update `.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The app runs at `http://localhost:5173`

## Available Scripts

### Backend (server/)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with auto-reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run seed` | Seed database with demo data |

### Frontend (client/)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |

## Environment Variables

### Backend (.env)

```env
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gradflow

# Authentication
JWT_SECRET=your_secure_random_secret_key
JWT_EXPIRE=7d

# Server
NODE_ENV=development
PORT=5000

# File Storage
CLOUDINARY_URL=cloudinary://key:secret@cloud_name

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password

# CORS
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=GradFlow
```

## Project Structure

```
gradflow/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── layouts/           # Layout wrappers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client functions
│   │   ├── store/             # State management (Redux/Zustand)
│   │   ├── types/             # TypeScript types
│   │   ├── styles/            # Global styles
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── models/            # Mongoose schemas
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, error, validation
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Helpers and utilities
│   │   ├── config/            # Configuration files
│   │   └── app.js
│   ├── tests/                 # Test files
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── docs/                      # Documentation
│   └── GradFlow_Project_Documentation.md
│
├── .gitignore
├── README.md
└── LICENSE
```

## Features

### ✅ Core Features (MVP)

- **Authentication & Authorization**
  - Email/password registration and login
  - Role-based access control (Student, Supervisor, Coordinator, Examiner)
  - JWT-based stateless authentication
  - bcrypt password hashing

- **Student Features**
  - Create and submit project proposals
  - View project status and progress
  - Submit milestone deliverables
  - Receive supervisor feedback
  - View defense schedule and evaluation results
  - Real-time notifications

- **Supervisor Features**
  - Review assigned projects
  - Create and manage milestones
  - Evaluate student submissions
  - Provide detailed feedback
  - Track project progress

- **Coordinator Features**
  - Review and approve/reject proposals
  - Assign supervisors to projects
  - Manage user accounts
  - Schedule defenses with conflict validation
  - View project statistics and archive

- **Examiner Features**
  - View assigned projects for evaluation
  - Submit structured evaluations with scoring
  - Provide evaluation comments

- **Workflow Management**
  - Project status tracking (Draft → Submitted → Under Review → Approved → In Progress → Defense → Completed)
  - Milestone-based project tracking
  - File and GitHub link submissions
  - Real-time notifications for workflow events
  - Conflict validation for defense scheduling

### 🔮 Future Features (Roadmap)

- Email and SMS notifications
- University SSO integration
- Automated supervisor recommendation
- Plagiarism/similarity checking
- Public searchable project repository
- Mobile application
- Advanced analytics and reporting

## User Roles & Use Cases

### Student

Creates a project proposal, works through milestones, submits deliverables, and views feedback and defense information.

**Key Actions:**
- Create/edit proposal
- Submit proposal for review
- View assigned supervisor and milestones
- Submit deliverables
- View feedback and defense info
- Receive notifications

### Supervisor

Reviews assigned projects, manages milestones, evaluates submissions, and provides feedback.

**Key Actions:**
- View assigned projects
- Create and manage milestones
- Review submissions
- Provide feedback
- Approve/request revisions

### Coordinator

Manages projects and users, reviews proposals, assigns supervisors, and schedules defenses.

**Key Actions:**
- Review proposals
- Approve/reject proposals
- Assign supervisors
- Manage users
- Schedule defenses
- Resolve conflicts
- View archive

### Examiner

Reviews assigned final projects and records defense/evaluation scores.

**Key Actions:**
- View assigned projects
- Submit evaluations
- Record scores
- Provide comments

## System Architecture

### High-Level Architecture

```
┌──────────────────────────┐
│   React Frontend (Vite)  │
│  Components + Tailwind   │
└──────────────┬───────────┘
               │ HTTP/REST
               ��
┌──────────────────────────┐
│   Express API Server     │
│ Routes + Controllers     │
│ Auth + Validation        │
│ Workflow Logic           │
└──────────────┬───────────┘
               │ Mongoose
               ▼
┌──────────────────────────┐
│   MongoDB Atlas          │
│  Documents + Collections │
└──────────────────────────┘

File Storage: Cloudinary
```

### Project Status Workflow

```
Draft
  ↓
Submitted
  ├→ Rejected → Revision → Resubmitted
  └→ Under Review
      └→ Approved
          ↓
Supervisor Assigned
  ↓
In Progress
  ├→ Milestones (Pending → Submitted → Approved)
  └→ Defense Scheduled
      ↓
Defense Completed
  ↓
Evaluated
  ↓
Completed / Archived
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user |

### Projects & Proposals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Student creates proposal |
| GET | `/api/projects/my` | Get student's projects |
| GET | `/api/projects/:id` | Get project details |
| PATCH | `/api/projects/:id/submit` | Submit proposal |
| PATCH | `/api/projects/:id/review` | Coordinator approves/rejects |
| PATCH | `/api/projects/:id/supervisor` | Coordinator assigns supervisor |

### Milestones & Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/milestones` | Create milestone |
| GET | `/api/projects/:id/milestones` | List milestones |
| POST | `/api/milestones/:id/submissions` | Student submits deliverable |
| PATCH | `/api/submissions/:id/review` | Review submission |

### Defense & Evaluation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/defenses` | Schedule defense |
| GET | `/api/defenses` | List defenses |
| POST | `/api/defenses/:id/evaluations` | Submit evaluation |
| GET | `/api/projects/:id/evaluations` | Get evaluations |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |

## Database Schema

### User

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  passwordHash: String,
  role: "student" | "supervisor" | "coordinator" | "examiner",
  department: String,
  studentId?: String,
  bio?: String,
  skills: [String],
  profilePicture?: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Project

```javascript
{
  _id: ObjectId,
  title: String,
  abstract: String,
  problemStatement: String,
  objectives: [String],
  methodology: String,
  technologies: [String],
  category: String,
  students: [ObjectId],
  supervisorId?: ObjectId,
  status: String,
  progress: Number,
  coordinatorNotes?: String,
  rejectionReason?: String,
  createdAt: Date,
  submittedAt?: Date,
  approvedAt?: Date,
  completedAt?: Date
}
```

### Milestone

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,
  title: String,
  description: String,
  dueDate: Date,
  status: "pending" | "submitted" | "approved" | "revision",
  order: Number,
  createdAt: Date
}
```

### Submission

```javascript
{
  _id: ObjectId,
  milestoneId: ObjectId,
  projectId: ObjectId,
  studentId: ObjectId,
  fileUrl?: String,
  githubUrl?: String,
  description: String,
  status: "submitted" | "approved" | "revision",
  feedback?: String,
  submittedAt: Date,
  reviewedAt?: Date
}
```

### Defense

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,
  examinerIds: [ObjectId],
  date: Date,
  startTime: String,
  endTime: String,
  room: String,
  status: String,
  createdAt: Date
}
```

### Evaluation

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,
  examinerId: ObjectId,
  scores: {
    implementation: Number,
    documentation: Number,
    presentation: Number,
    problemUnderstanding: Number,
    functionality: Number
  },
  total: Number,
  comments: String,
  submittedAt: Date
}
```

### Notification

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,
  title: String,
  message: String,
  relatedProjectId?: ObjectId,
  isRead: Boolean,
  createdAt: Date
}
```

## Security

### Security Principles

- ✅ Passwords hashed with bcrypt; never stored or returned in plain text
- ✅ JWT authentication required for protected resources
- ✅ Role-based access control (RBAC) enforced server-side
- ✅ Ownership checks prevent unauthorized access to projects/submissions
- ✅ All input validated and sanitized on the server
- ✅ File uploads validated by type and size
- ✅ Sensitive errors logged server-side, not exposed to clients
- ✅ Rate limiting on authentication and write-heavy endpoints

### STRIDE Threat Model

| Category | Threat | Mitigation |
|----------|--------|-----------|
| Spoofing | Attacker uses another user's credentials | Strong password hashing, JWT, session controls |
| Tampering | Student changes project status via API | Server-side authorization, workflow validation |
| Repudiation | User denies submitting deliverable | Submission timestamps, audit fields |
| Information Disclosure | Unauthorized access to project records | Role and ownership checks |
| Denial of Service | Repeated requests flood server | Rate limiting, input limits |
| Elevation of Privilege | Student calls coordinator endpoint | Server-side RBAC middleware |

## Testing

### Testing Strategy

- **Unit Tests:** Core workflow logic, status transitions, conflict detection
- **Integration Tests:** Authentication, authorization, CRUD operations
- **End-to-End Tests:** Complete user workflows per role
- **Security Tests:** Invalid tokens, role boundaries, unauthorized access
- **Responsive UI Tests:** Desktop and mobile viewports

### Running Tests

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

## Deployment

### Backend Deployment (Render/Railway)

1. Create account on Render or Railway
2. Connect GitHub repository
3. Set environment variables
4. Deploy main branch
5. Update `VITE_API_URL` in frontend

### Frontend Deployment (Vercel)

1. Create account on Vercel
2. Import repository
3. Set `VITE_API_URL` to your backend URL
4. Deploy

### Database Setup

1. Create free MongoDB Atlas cluster
2. Add IP whitelist for backend
3. Create database user
4. Update `MONGODB_URI` in backend env

## Development Timeline

| Days | Phase | Focus |
|------|-------|-------|
| 1 | Planning | Schema, API design, setup |
| 2–3 | Foundation | Express, MongoDB, Auth, Middleware |
| 4–6 | Student Workflow | Profile, proposals, dashboards |
| 7–8 | Coordinator Workflow | Review, approval, supervisor assignment |
| 9–10 | Milestones | Deadlines, submissions, feedback |
| 11–12 | Defense | Scheduling, conflict validation |
| 13 | Evaluation | Scoring, completion |
| 14 | Notifications | Alerts, polish |
| 15 | Security & Testing | Authorization, validation, edge cases |
| 16 | Deployment | Deploy, seed data, docs |
| 17 | Demo & Polish | Bugs, responsiveness, final rehearsal |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use meaningful variable and function names
- Write comments for complex logic
- Follow existing code patterns
- Format code with Prettier

## License

This project is not licensed yet .

## Vision

GradFlow demonstrates practical software engineering through a complete, secure, and scalable web application. It solves a clearly defined academic workflow with appropriate roles, security controls, and architecture—delivering both functional value for university graduation-project management and evidence of development capability.

---

For detailed technical documentation, see [GradFlow Project Documentation](./docs/gradflow_documentation.md)
