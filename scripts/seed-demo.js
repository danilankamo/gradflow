const path = require('node:path');

// Ensure packages installed in server/node_modules can be required from root scripts
const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
if (!module.paths.includes(serverNodeModules)) {
  module.paths.unshift(serverNodeModules);
}

const dotenv = require('dotenv');

// Load environment variables from server/.env if not already set
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
const User = require(path.resolve(__dirname, '../server/models/User'));
const Project = require(path.resolve(__dirname, '../server/models/Project'));
const Milestone = require(path.resolve(__dirname, '../server/models/Milestone'));
const Submission = require(path.resolve(__dirname, '../server/models/Submission'));
const Defense = require(path.resolve(__dirname, '../server/models/Defense'));
const Evaluation = require(path.resolve(__dirname, '../server/models/Evaluation'));
const Notification = require(path.resolve(__dirname, '../server/models/Notification'));

const DEFAULT_PASSWORD = process.env.DEMO_PASSWORD || 'Password123!';

const DEMO_USERS = [
  // Primary Accounts
  {
    key: 'student_primary',
    name: 'Alex Morgan (Demo Student)',
    email: 'student.demo@gradflow.com',
    role: 'student',
    department: 'Computer Science',
    studentId: 'CS-2024-001',
    bio: 'Undergraduate student lead focusing on distributed systems and cloud architecture.',
    skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'Docker'],
  },
  {
    key: 'coordinator_primary',
    name: 'Dr. Evelyn Reed (Demo Coordinator)',
    email: 'coordinator.demo@gradflow.com',
    role: 'coordinator',
    department: 'Computer Science',
    bio: 'Director of Graduation Projects & Academic Review Committee.',
    skills: ['Curriculum Governance', 'Academic Review', 'Defense Management'],
  },
  {
    key: 'supervisor_primary',
    name: 'Dr. Alan Turing (Demo Supervisor)',
    email: 'supervisor.demo@gradflow.com',
    role: 'supervisor',
    department: 'Computer Science',
    bio: 'Associate Professor of Computer Systems, Distributed Algorithms & Cloud Computing.',
    skills: ['Distributed Systems', 'Cloud Architecture', 'Performance Engineering', 'Go'],
  },
  {
    key: 'examiner_primary',
    name: 'Prof. Grace Hopper (Demo Examiner)',
    email: 'examiner.demo@gradflow.com',
    role: 'examiner',
    department: 'Software Engineering',
    bio: 'Professor of Software Architecture and Lead Defense Examination Panelist.',
    skills: ['Software Architecture', 'System Verification', 'Code Review', 'Oral Defense'],
  },

  // Backup Accounts
  {
    key: 'student_backup',
    name: 'Samira Khan (Demo Student 2)',
    email: 'student2.demo@gradflow.com',
    role: 'student',
    department: 'Computer Science',
    studentId: 'CS-2024-002',
    bio: 'Undergraduate researcher working on cloud-native security and container observability.',
    skills: ['Python', 'Kubernetes', 'Go', 'Linux eBPF'],
  },
  {
    key: 'coordinator_backup',
    name: 'Dr. Marcus Vance (Demo Coordinator 2)',
    email: 'coordinator2.demo@gradflow.com',
    role: 'coordinator',
    department: 'Information Technology',
    bio: 'Deputy Department Coordinator and Defense Examination Schedule Officer.',
    skills: ['Project Governance', 'Defense Scheduling'],
  },
  {
    key: 'supervisor_backup',
    name: 'Dr. Ada Lovelace (Demo Supervisor 2)',
    email: 'supervisor2.demo@gradflow.com',
    role: 'supervisor',
    department: 'Computer Science',
    bio: 'Senior Lecturer in Algorithmic Optimization and Edge Telemetry Computing.',
    skills: ['Algorithms', 'Edge Computing', 'IoT Architecture'],
  },
  {
    key: 'examiner_backup',
    name: 'Prof. Donald Knuth (Demo Examiner 2)',
    email: 'examiner2.demo@gradflow.com',
    role: 'examiner',
    department: 'Computer Science',
    bio: 'Visiting Faculty Examiner and Academic Rubric Evaluator.',
    skills: ['Formal Verification', 'Rubric Scoring', 'Algorithms'],
  },
];

const DEMO_EMAILS = DEMO_USERS.map((u) => u.email.toLowerCase());

const DEMO_PROJECT_TITLES = [
  'AI-Powered Distributed Load Balancer',
  'Blockchain-Based Academic Credential Verification System',
  'Autonomous Indoor Drone Navigation via Visual SLAM',
  'Cloud-Native Microservices Security Observability Platform',
  'Predictive Healthcare Analytics Using Edge Computing',
];

const STANDARD_MILESTONE_TITLES = [
  'Requirements & System Specifications',
  'System Architecture & Design Document',
  'Core Engine Implementation',
  'Integration Testing & Benchmarking',
  'Final Project Dissertation & Manual',
  'Oral Defense & Viva Presentation',
];

async function cleanupDemoData() {
  console.log('[seed-demo] Cleaning up previous demo records only (non-demo users untouched)...');

  // Find demo users
  const demoUsers = await User.find({ email: { $in: DEMO_EMAILS } });
  const demoUserIds = demoUsers.map((u) => u._id);

  // Find demo projects
  const demoProjects = await Project.find({
    $or: [
      { students: { $in: demoUserIds } },
      { supervisorId: { $in: demoUserIds } },
      { title: { $in: DEMO_PROJECT_TITLES } },
    ],
  });
  const demoProjectIds = demoProjects.map((p) => p._id);

  // Delete related records
  await Evaluation.deleteMany({
    $or: [{ projectId: { $in: demoProjectIds } }, { examinerId: { $in: demoUserIds } }],
  });
  await Defense.deleteMany({
    $or: [{ projectId: { $in: demoProjectIds } }, { examinerIds: { $in: demoUserIds } }],
  });
  await Submission.deleteMany({
    $or: [{ projectId: { $in: demoProjectIds } }, { studentId: { $in: demoUserIds } }],
  });
  await Milestone.deleteMany({ projectId: { $in: demoProjectIds } });
  await Notification.deleteMany({
    $or: [{ userId: { $in: demoUserIds } }, { relatedProjectId: { $in: demoProjectIds } }],
  });
  await Project.deleteMany({ _id: { $in: demoProjectIds } });
  await User.deleteMany({ _id: { $in: demoUserIds } });

  console.log(`[seed-demo] Cleaned ${demoUsers.length} demo users and ${demoProjects.length} demo projects.`);
}

async function createDefaultMilestones(projectId, initialStatus = 'pending') {
  const milestones = STANDARD_MILESTONE_TITLES.map((title, index) => ({
    projectId,
    title,
    description: `${title} for final year evaluation review.`,
    order: index + 1,
    dueDate: new Date(Date.now() + (index + 1) * 14 * 24 * 60 * 60 * 1000),
    status: initialStatus,
  }));
  return Milestone.insertMany(milestones);
}

async function seedDemoData() {
  console.log('[seed-demo] Seeding fresh demo users and staged workflow projects...');

  // 1. Create demo users
  const userMap = {};
  for (const u of DEMO_USERS) {
    const createdUser = await User.create({
      name: u.name,
      email: u.email,
      passwordHash: DEFAULT_PASSWORD, // User model pre-save hook will hash this with bcrypt
      role: u.role,
      department: u.department,
      studentId: u.studentId,
      bio: u.bio,
      skills: u.skills,
    });
    userMap[u.key] = createdUser;
    userMap[u.email] = createdUser;
  }
  console.log(`[seed-demo] Created ${Object.keys(userMap).length / 2} demo users with role credentials.`);

  // 2. Stage 1: Student with Draft Proposal
  // Primary student has a draft proposal ready to be edited or submitted
  const p1 = await Project.create({
    title: 'AI-Powered Distributed Load Balancer',
    abstract: 'An adaptive latency-aware load distribution engine for microservice clusters that dynamically balances traffic using real-time service health signals.',
    problemStatement: 'Modern cloud architectures suffer from unpredictable tail latency and uneven pod utilization during sudden burst traffic.',
    objectives: [
      'Implement real-time eBPF latency probe scraping',
      'Develop weighted least-connection scheduling algorithm',
      'Benchmark under 50,000 req/sec stress test',
    ],
    methodology: 'Iterative agile design with Go microservices, Prometheus telemetry scraping, and Docker containerized testbed.',
    technologies: ['Go', 'eBPF', 'Docker', 'Prometheus', 'React'],
    keywords: ['Load Balancing', 'Distributed Systems', 'Cloud Native'],
    category: 'Distributed Systems',
    students: [userMap.student_primary._id],
    status: 'Draft',
    progress: 0,
  });
  await createDefaultMilestones(p1._id, 'pending');
  console.log('[seed-demo] Stage 1 created: Student Draft Proposal ("AI-Powered Distributed Load Balancer")');

  // 3. Stage 2: Proposal Approved, Awaiting Supervisor Assignment
  // Coordinator can immediately assign a supervisor to this project
  const p2 = await Project.create({
    title: 'Blockchain-Based Academic Credential Verification System',
    abstract: 'A decentralized tamper-proof credential registry enabling instant employer verification of university degrees, diplomas, and official transcripts.',
    problemStatement: 'Academic credential fraud is on the rise and manual registrar verification takes up to 4 weeks with high administrative cost.',
    objectives: [
      'Design ERC-721 soulbound diploma token standard',
      'Implement zero-knowledge credential verification portal',
      'Conduct cryptographic audit and vulnerability scanning',
    ],
    methodology: 'Smart contracts deployed on a private consortium EVM chain with web-based verification explorer for prospective employers.',
    technologies: ['Solidity', 'Ethereum', 'Node.js', 'React', 'Ethers.js'],
    keywords: ['Blockchain', 'Cryptography', 'Academic Records'],
    category: 'Cybersecurity & Blockchain',
    students: [userMap.student_backup._id],
    status: 'Approved',
    progress: 0,
    coordinatorComment: 'Proposal has been reviewed by the Department Academic Board and meets all capstone criteria. Approved for supervisor assignment.',
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });
  await createDefaultMilestones(p2._id, 'pending');
  console.log('[seed-demo] Stage 2 created: Approved Proposal Awaiting Supervisor ("Blockchain-Based Academic Credential Verification")');

  // 4. Stage 3: Project with Supervisor & Pending Milestone Submission
  // Supervisor can review a submitted milestone; student can also view milestones
  const p3 = await Project.create({
    title: 'Autonomous Indoor Drone Navigation via Visual SLAM',
    abstract: 'A monocular camera-driven spatial mapping and waypoint navigation framework for lightweight quadcopters operating in GPS-denied indoor warehouse environments.',
    problemStatement: 'Automated warehouse inventory inspection requires autonomous drones, but indoor facilities lack reliable GPS satellite reception.',
    objectives: [
      'Implement ORB-SLAM3 visual odometry pipeline',
      'Integrate PX4 flight controller over MAVLink',
      'Demonstrate obstacle avoidance in simulated warehouse aisle',
    ],
    methodology: 'Robotics operating system (ROS2 Humble) integration with Gazebo simulation and physical PX4 flight controller hardware tests.',
    technologies: ['ROS2', 'Python', 'C++', 'OpenCV', 'Gazebo'],
    keywords: ['Robotics', 'Computer Vision', 'SLAM', 'Autonomous Systems'],
    category: 'Robotics & AI',
    students: [userMap.student_primary._id],
    supervisorId: userMap.supervisor_primary._id,
    status: 'In Progress',
    progress: 17,
  });

  const p3Milestones = await createDefaultMilestones(p3._id, 'pending');
  // Milestone 1 is approved
  p3Milestones[0].status = 'approved';
  await p3Milestones[0].save();

  // Milestone 2 has a pending submission ready for supervisor review!
  p3Milestones[1].status = 'submitted';
  await p3Milestones[1].save();

  await Submission.create({
    milestoneId: p3Milestones[1]._id,
    projectId: p3._id,
    studentId: userMap.student_primary._id,
    githubUrl: 'https://github.com/gradflow/drone-vslam-system',
    description: 'Completed system architecture diagrams, ROS2 package manifests, and initial monocular SLAM tracking video capture.',
    fileName: 'System_Architecture_v1.0.pdf',
    fileType: 'application/pdf',
    fileSize: 2450000,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await Notification.create({
    userId: userMap.supervisor_primary._id,
    type: 'milestone_submitted',
    title: 'Milestone Deliverable Submitted',
    message: `Alex Morgan submitted deliverable for milestone "${p3Milestones[1].title}" in project "${p3.title}".`,
    relatedProjectId: p3._id,
  });
  console.log('[seed-demo] Stage 3 created: In Progress Project with Submitted Milestone ("Autonomous Indoor Drone Navigation")');

  // 5. Stage 4: Project in Final Submission, Ready for Defense Scheduling
  // All 6 milestones approved; project is in Final Submission status; ready for Coordinator to schedule defense
  const p4 = await Project.create({
    title: 'Cloud-Native Microservices Security Observability Platform',
    abstract: 'A kernel-level eBPF monitoring agent capturing distributed service mesh telemetry and detecting privilege escalation in Kubernetes clusters with zero application instrumentation.',
    problemStatement: 'Traditional runtime security sidecars add excessive network latency and miss ephemeral container namespace breakouts.',
    objectives: [
      'Write Linux kernel eBPF probes for syscall monitoring',
      'Stream OpenTelemetry trace spans to distributed collectors',
      'Validate detection of container privilege escalation exploits',
    ],
    methodology: 'Kernel tracing programs compiled using LLVM/Clang running on Linux v5.15+ kernel with React visual security topology graph.',
    technologies: ['eBPF', 'Kubernetes', 'Linux', 'Go', 'React', 'OpenTelemetry'],
    keywords: ['Security', 'eBPF', 'Cloud Native', 'Observability'],
    category: 'Cybersecurity & Cloud',
    students: [userMap.student_backup._id],
    supervisorId: userMap.supervisor_backup._id,
    status: 'Final Submission',
    progress: 100,
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });

  // Create all milestones as approved
  const p4Milestones = await createDefaultMilestones(p4._id, 'approved');
  for (const ms of p4Milestones) {
    await Submission.create({
      milestoneId: ms._id,
      projectId: p4._id,
      studentId: userMap.student_backup._id,
      githubUrl: 'https://github.com/gradflow/ebpf-security-agent',
      description: `Completed final deliverable for ${ms.title}. Verified by faculty supervisor.`,
      status: 'approved',
      feedback: 'Excellent technical implementation and thorough documentation.',
      submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
  }
  console.log('[seed-demo] Stage 4 created: Final Submission Ready for Defense Scheduling ("Cloud-Native Security Observability")');

  // 6. Stage 5: Defense Scheduled, Ready for Examiner Evaluation
  // Defense is already scheduled on the calendar; Examiner can open #vivas and submit structured scoring
  const p5 = await Project.create({
    title: 'Predictive Healthcare Analytics Using Edge Computing',
    abstract: 'A privacy-preserving federated learning framework for predicting cardiac arrhythmias directly on hospital bedside telemetry edge nodes.',
    problemStatement: 'Centralized streaming of patient vitals creates serious HIPAA compliance concerns and suffers from catastrophic network disconnects.',
    objectives: [
      'Implement lightweight quantized neural net on edge TPUs',
      'Deploy federated averaging algorithm with differential privacy',
      'Achieve 96.4% arrhythmia classification accuracy on MIT-BIH dataset',
    ],
    methodology: 'Edge tensor processing on simulated medical gateways with cryptographic model aggregation and Flutter mobile clinician dashboard.',
    technologies: ['TensorFlow Lite', 'Python', 'Edge Computing', 'React', 'Federated Learning'],
    keywords: ['Healthcare', 'Edge AI', 'Machine Learning', 'Privacy'],
    category: 'Artificial Intelligence & Health',
    students: [userMap.student_primary._id],
    supervisorId: userMap.supervisor_backup._id,
    status: 'Defense Scheduled',
    progress: 100,
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });

  await createDefaultMilestones(p5._id, 'approved');

  const defenseDate = new Date();
  defenseDate.setDate(defenseDate.getDate() + 2); // 2 days in future
  const dateStr = defenseDate.toISOString().split('T')[0];

  const defense = await Defense.create({
    projectId: p5._id,
    examinerIds: [userMap.examiner_primary._id, userMap.examiner_backup._id],
    date: new Date(dateStr),
    startTime: '10:00',
    endTime: '11:30',
    room: 'Hall A - Boardroom 3',
    status: 'scheduled',
  });

  await Notification.create({
    userId: userMap.examiner_primary._id,
    type: 'defense_scheduled',
    title: 'Defense Examination Scheduled',
    message: `You have been appointed to examine project defense for "${p5.title}" on ${dateStr} at 10:00 in Hall A - Boardroom 3.`,
    relatedProjectId: p5._id,
  });

  await Notification.create({
    userId: userMap.student_primary._id,
    type: 'defense_scheduled',
    title: 'Defense Scheduled',
    message: `Your project defense for "${p5.title}" is scheduled on ${dateStr} (10:00 - 11:30) in Hall A - Boardroom 3.`,
    relatedProjectId: p5._id,
  });

  console.log('[seed-demo] Stage 5 created: Scheduled Defense Ready for Examiner Scoring ("Predictive Healthcare Analytics")');

  return {
    users: userMap,
    projects: { p1, p2, p3, p4, p5 },
    defense,
  };
}

async function run() {
  const isReset = process.argv.includes('--reset') || process.argv.includes('-r');
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('[seed-demo] ERROR: MONGO_URI is missing in process.env or server/.env');
    process.exit(1);
  }

  console.log(`[seed-demo] Connecting to database: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri);
  console.log('[seed-demo] Connected to MongoDB.');

  try {
    // Both default run and --reset will clean previous demo records to maintain idempotency
    await cleanupDemoData();
    const result = await seedDemoData();

    console.log('\n======================================================');
    console.log('✅ DEMO SEEDING COMPLETED SUCCESSFULLY');
    console.log('======================================================');
    console.log('All 4 Primary Accounts and 4 Backup Accounts are ready.');
    console.log('Default Password for all demo accounts:', DEFAULT_PASSWORD);
    console.log('======================================================\n');
  } catch (error) {
    console.error('[seed-demo] Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[seed-demo] Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  run();
}

module.exports = { seedDemoData, cleanupDemoData, DEMO_USERS, DEFAULT_PASSWORD };
