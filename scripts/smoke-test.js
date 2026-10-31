const path = require('node:path');

// Ensure packages installed in server/node_modules can be required from root scripts
const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
if (!module.paths.includes(serverNodeModules)) {
  module.paths.unshift(serverNodeModules);
}

const dotenv = require('dotenv');

// Load environment variables from server/.env if available
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://gradflow-gamma.vercel.app';
const API_URL = process.env.API_URL || 'https://gradflow-ii8n.onrender.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Password123!';

const results = [];

function record(step, name, passed, details = '') {
  results.push({ step, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] Step ${step}: ${name} ${details ? `(${details})` : ''}`);
}

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${API_URL}${endpoint}`;
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;
  return { status: response.status, ok: response.ok, data, response };
}

async function loginUser(email, password = DEMO_PASSWORD) {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok || !res.data?.token) {
    throw new Error(`Failed to log in as ${email}: ${res.data?.message || res.status}`);
  }
  return { token: res.data.token, user: res.data.user };
}

async function runSmokeTest() {
  console.log('======================================================');
  console.log('🚀 GRADFLOW DAY 17 DEPLOYED SMOKE TEST');
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`API URL:      ${API_URL}`);
  console.log('======================================================\n');

  let studentAuth, coordAuth, supervAuth, examAuth;
  let throwawayStudentToken, throwawayStudentUser;
  let createdProjectId, createdMilestoneId, createdDefenseId;
  const timestamp = Date.now();

  try {
    // ------------------------------------------------------------------
    // Phase 1: Health & Infrastructure Checks
    // ------------------------------------------------------------------
    console.log('--- Phase 1: Infrastructure & Health ---');
    try {
      const feRes = await fetch(FRONTEND_URL);
      record(1.1, 'Frontend HTTP 200 Check', feRes.status === 200, `HTTP ${feRes.status}`);
    } catch (err) {
      record(1.1, 'Frontend HTTP 200 Check', false, err.message);
    }

    try {
      const apiRes = await apiRequest('/');
      const isHealthy = apiRes.status === 200 && apiRes.data?.message?.includes('GradFlow API');
      record(1.2, 'Backend API Health Check', isHealthy, `HTTP ${apiRes.status}`);
    } catch (err) {
      record(1.2, 'Backend API Health Check', false, err.message);
    }

    // ------------------------------------------------------------------
    // Phase 2: Role Authentication Checks
    // ------------------------------------------------------------------
    console.log('\n--- Phase 2: Role Authentication ---');
    try {
      studentAuth = await loginUser('student.demo@gradflow.com');
      record(2.1, 'Student Role Login', true, studentAuth.user.email);
    } catch (err) {
      record(2.1, 'Student Role Login', false, err.message);
    }

    try {
      coordAuth = await loginUser('coordinator.demo@gradflow.com');
      record(2.2, 'Coordinator Role Login', true, coordAuth.user.email);
    } catch (err) {
      record(2.2, 'Coordinator Role Login', false, err.message);
    }

    try {
      supervAuth = await loginUser('supervisor.demo@gradflow.com');
      record(2.3, 'Supervisor Role Login', true, supervAuth.user.email);
    } catch (err) {
      record(2.3, 'Supervisor Role Login', false, err.message);
    }

    try {
      examAuth = await loginUser('examiner.demo@gradflow.com');
      record(2.4, 'Examiner Role Login', true, examAuth.user.email);
    } catch (err) {
      record(2.4, 'Examiner Role Login', false, err.message);
    }

    // ------------------------------------------------------------------
    // Phase 3: Role-Based Access Control (RBAC) Protections
    // ------------------------------------------------------------------
    console.log('\n--- Phase 3: Role-Based Access Control (RBAC) ---');
    if (studentAuth) {
      const studentAttemptReview = await apiRequest(
        '/api/projects/507f1f77bcf86cd799439011/review',
        { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) },
        studentAuth.token
      );
      record(
        3.1,
        'Student Prohibited from Approving Proposals',
        studentAttemptReview.status === 403,
        `HTTP ${studentAttemptReview.status}`
      );

      const studentAttemptDefense = await apiRequest(
        '/api/defenses',
        { method: 'POST', body: JSON.stringify({ room: 'Forbidden Hall' }) },
        studentAuth.token
      );
      record(
        3.2,
        'Student Prohibited from Scheduling Defense',
        studentAttemptDefense.status === 403,
        `HTTP ${studentAttemptDefense.status}`
      );
    }

    if (examAuth) {
      const examinerAttemptAssign = await apiRequest(
        '/api/projects/507f1f77bcf86cd799439011/supervisor',
        { method: 'PATCH', body: JSON.stringify({ supervisorId: '507f1f77bcf86cd799439011' }) },
        examAuth.token
      );
      record(
        3.3,
        'Examiner Prohibited from Supervisor Assignment',
        examinerAttemptAssign.status === 403,
        `HTTP ${examinerAttemptAssign.status}`
      );
    }

    const unauthAttempt = await apiRequest('/api/projects/my', { method: 'GET' }, null);
    record(
      3.4,
      'Unauthenticated Requests Rejected with 401',
      unauthAttempt.status === 401,
      `HTTP ${unauthAttempt.status}`
    );

    // ------------------------------------------------------------------
    // Phase 4: Full 7-Step Golden Path (Throwaway Student & Project)
    // ------------------------------------------------------------------
    console.log('\n--- Phase 4: Full 7-Step End-to-End Workflow ---');

    // Register throwaway candidate
    const throwawayEmail = `smoke.student.${timestamp}@gradflow.com`;
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Smoke Test Candidate',
        email: throwawayEmail,
        password: DEMO_PASSWORD,
        department: 'Computer Science',
        studentId: `SMOKE-${timestamp.toString().slice(-4)}`,
      }),
    });

    if (!regRes.ok || !regRes.data?.token) {
      throw new Error(`Failed to register throwaway student: ${regRes.data?.message || regRes.status}`);
    }
    throwawayStudentToken = regRes.data.token;
    throwawayStudentUser = regRes.data.user;
    record(4.0, 'Throwaway Student Registered', true, throwawayEmail);

    // Step 1: Student creates proposal and submits it
    const proposalPayload = {
      title: `Automated Pipeline Verification Engine ${timestamp}`,
      abstract: 'End-to-end telemetry and validation engine for graduation project lifecycle management.',
      problemStatement: 'Manual testing of university project workflows leads to presentation-day defects.',
      methodology: 'Automated REST API integration suite covering all role-based state transitions.',
      technologies: ['Node.js', 'Express', 'React', 'MongoDB'],
      keywords: ['Verification', 'Quality Assurance', 'CI/CD'],
      category: 'Software Engineering',
    };

    const createProjRes = await apiRequest(
      '/api/projects',
      { method: 'POST', body: JSON.stringify(proposalPayload) },
      throwawayStudentToken
    );
    const projCreated = createProjRes.ok && createProjRes.data?.data?._id;
    createdProjectId = createProjRes.data?.data?._id;
    record(4.1, 'Step 1a: Student Creates Proposal Draft', projCreated, `ID: ${createdProjectId}`);

    const submitProjRes = await apiRequest(
      `/api/projects/${createdProjectId}/submit`,
      { method: 'PATCH' },
      throwawayStudentToken
    );
    const projSubmitted = submitProjRes.ok && submitProjRes.data?.status === 'Submitted';
    record(4.2, 'Step 1b: Student Submits Proposal for Review', projSubmitted, `Status: ${submitProjRes.data?.status}`);

    // Step 2: Coordinator reviews and approves proposal
    const approveProjRes = await apiRequest(
      `/api/projects/${createdProjectId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'approve',
          comment: 'Approved during automated smoke test verification.',
        }),
      },
      coordAuth.token
    );
    const projApproved = approveProjRes.ok && approveProjRes.data?.data?.status === 'Approved';
    record(4.3, 'Step 2: Coordinator Approves Proposal', projApproved, `Status: ${approveProjRes.data?.data?.status}`);

    // Step 3: Coordinator assigns supervisor
    const assignSupervRes = await apiRequest(
      `/api/projects/${createdProjectId}/supervisor`,
      {
        method: 'PATCH',
        body: JSON.stringify({ supervisorId: supervAuth.user._id }),
      },
      coordAuth.token
    );
    const supervAssigned = assignSupervRes.ok && assignSupervRes.data?.data?.status === 'In Progress';
    record(4.4, 'Step 3: Coordinator Assigns Supervisor', supervAssigned, `Status: ${assignSupervRes.data?.data?.status}`);

    // Step 4: Student submits milestone deliverable (with simulated file upload)
    const milestonesRes = await apiRequest(
      `/api/projects/${createdProjectId}/milestones`,
      { method: 'GET' },
      throwawayStudentToken
    );
    const milestonesList = milestonesRes.data?.data || [];
    if (milestonesList.length === 0) {
      throw new Error('Project has no milestones initialized');
    }
    createdMilestoneId = milestonesList[0]._id;

    // Use multipart/form-data for deliverable submission
    const formData = new FormData();
    const fileBlob = new Blob(['Smoke test deliverable verification file payload'], { type: 'text/plain' });
    formData.append('file', fileBlob, 'smoke-deliverable.txt');
    formData.append('githubUrl', 'https://github.com/gradflow/smoke-verification');
    formData.append('description', 'Automated smoke test milestone deliverable submission with file artifact.');

    const submitDeliverableRes = await apiRequest(
      `/api/milestones/${createdMilestoneId}/submissions`,
      { method: 'POST', body: formData },
      throwawayStudentToken
    );
    const deliverableSubmitted = submitDeliverableRes.ok && submitDeliverableRes.data?.data?.status === 'submitted';
    const submissionId = submitDeliverableRes.data?.data?._id;
    record(4.5, 'Step 4: Student Submits Deliverable (File + Link)', deliverableSubmitted, `Sub ID: ${submissionId}`);

    // Step 5: Supervisor reviews and approves milestone
    const reviewSubmissionRes = await apiRequest(
      `/api/submissions/${submissionId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'approve',
          feedback: 'Deliverable meets all technical specifications.',
        }),
      },
      supervAuth.token
    );
    const submissionApproved = reviewSubmissionRes.ok && reviewSubmissionRes.data?.data?.status === 'approved';
    record(4.6, 'Step 5a: Supervisor Reviews & Approves Deliverable', submissionApproved, `Status: ${reviewSubmissionRes.data?.data?.status}`);

    // Advance remaining milestones to reach Final Submission (required for Step 6 Defense)
    for (let i = 1; i < milestonesList.length; i++) {
      const ms = milestonesList[i];
      const autoForm = new FormData();
      autoForm.append('description', `Deliverable for ${ms.title}`);
      autoForm.append('githubUrl', 'https://github.com/gradflow/smoke-verification');
      const subRes = await apiRequest(
        `/api/milestones/${ms._id}/submissions`,
        { method: 'POST', body: autoForm },
        throwawayStudentToken
      );
      if (subRes.ok && subRes.data?.data?._id) {
        await apiRequest(
          `/api/submissions/${subRes.data.data._id}/review`,
          { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) },
          supervAuth.token
        );
      }
    }

    const checkProjectRes = await apiRequest(`/api/projects/${createdProjectId}`, { method: 'GET' }, coordAuth.token);
    const isFinalSubmission = checkProjectRes.data?.data?.status === 'Final Submission';
    record(4.7, 'Step 5b: Project Transitions to Final Submission', isFinalSubmission, `Status: ${checkProjectRes.data?.data?.status}`);

    // Step 6: Coordinator schedules defense
    const defenseDate = new Date();
    defenseDate.setDate(defenseDate.getDate() + 10);
    const dateStr = defenseDate.toISOString().split('T')[0];

    const scheduleDefenseRes = await apiRequest(
      '/api/defenses',
      {
        method: 'POST',
        body: JSON.stringify({
          projectId: createdProjectId,
          examinerIds: [examAuth.user._id],
          date: dateStr,
          startTime: '14:00',
          endTime: '15:30',
          room: `Hall Smoke-${timestamp.toString().slice(-4)}`,
        }),
      },
      coordAuth.token
    );
    const defenseScheduled = scheduleDefenseRes.ok && scheduleDefenseRes.data?.data?._id;
    createdDefenseId = scheduleDefenseRes.data?.data?._id;
    record(4.8, 'Step 6a: Coordinator Schedules Defense', defenseScheduled, `Defense ID: ${createdDefenseId}`);

    // Test conflict rejection (scheduling overlapping defense in same room)
    const conflictRes = await apiRequest(
      '/api/defenses',
      {
        method: 'POST',
        body: JSON.stringify({
          projectId: createdProjectId,
          examinerIds: [examAuth.user._id],
          date: dateStr,
          startTime: '14:30',
          endTime: '16:00',
          room: `Hall Smoke-${timestamp.toString().slice(-4)}`,
        }),
      },
      coordAuth.token
    );
    record(4.9, 'Step 6b: Defense Conflict Detection Holds', conflictRes.status === 409, `HTTP ${conflictRes.status} (Room/Time Conflict)`);

    // Step 7: Examiner evaluates defense and submits score
    const evalPayload = {
      scores: {
        problemUnderstanding: 19,
        implementation: 24,
        functionality: 24,
        documentation: 14,
        presentation: 14,
      },
      comments: 'Exceptional defense presentation and solid software engineering implementation.',
      manuscriptAmendments: 'Minor formatting adjustment in references section.',
      verdict: 'minor-corrections',
    };

    const submitEvalRes = await apiRequest(
      `/api/defenses/${createdDefenseId}/evaluations`,
      { method: 'POST', body: JSON.stringify(evalPayload) },
      examAuth.token
    );
    const evalRecorded = submitEvalRes.ok;
    record(4.10, 'Step 7a: Examiner Evaluates Defense', evalRecorded, `Total Score: ${submitEvalRes.data?.data?.total || 95}`);

    // Verify project has advanced to Completed and appears in Archive
    const completedProjectRes = await apiRequest(`/api/projects/${createdProjectId}`, { method: 'GET' }, coordAuth.token);
    const isCompleted = completedProjectRes.data?.data?.status === 'Completed';
    record(4.11, 'Step 7b: Project Status Completed & Archived', isCompleted, `Status: ${completedProjectRes.data?.data?.status}`);
  } catch (error) {
    record(9.9, 'Smoke Test Execution Exception', false, error.message);
  } finally {
    // ------------------------------------------------------------------
    // Phase 5: Cleanup of Throwaway Test Artifacts
    // ------------------------------------------------------------------
    console.log('\n--- Phase 5: Cleanup of Throwaway Test Data ---');
    if (process.env.MONGO_URI) {
      try {
        const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
        if (!module.paths.includes(serverNodeModules)) {
          module.paths.unshift(serverNodeModules);
        }
        const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
        const User = require(path.resolve(__dirname, '../server/models/User'));
        const Project = require(path.resolve(__dirname, '../server/models/Project'));
        const Milestone = require(path.resolve(__dirname, '../server/models/Milestone'));
        const Submission = require(path.resolve(__dirname, '../server/models/Submission'));
        const Defense = require(path.resolve(__dirname, '../server/models/Defense'));
        const Evaluation = require(path.resolve(__dirname, '../server/models/Evaluation'));
        const Notification = require(path.resolve(__dirname, '../server/models/Notification'));

        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGO_URI);
        }

        if (createdProjectId) {
          await Evaluation.deleteMany({ projectId: createdProjectId });
          await Defense.deleteMany({ projectId: createdProjectId });
          await Submission.deleteMany({ projectId: createdProjectId });
          await Milestone.deleteMany({ projectId: createdProjectId });
          await Notification.deleteMany({ relatedProjectId: createdProjectId });
          await Project.deleteMany({ _id: createdProjectId });
        }
        if (throwawayStudentUser?._id) {
          await Notification.deleteMany({ userId: throwawayStudentUser._id });
          await User.deleteMany({ _id: throwawayStudentUser._id });
        }
        await mongoose.disconnect();
        console.log('✅ Throwaway smoke test records cleaned from database.');
      } catch (cleanupErr) {
        console.warn('⚠️ Warning: Direct database cleanup encountered an issue:', cleanupErr.message);
      }
    }
  }

  // ------------------------------------------------------------------
  // Summary Table & Exit Code
  // ------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('📊 SMOKE TEST SUMMARY RESULTS');
  console.log('======================================================');
  let allPassed = true;
  for (const r of results) {
    const badge = r.passed ? 'PASS' : 'FAIL';
    if (!r.passed) allPassed = false;
    console.log(`[${badge}] ${r.step} | ${r.name.padEnd(46)} | ${r.details}`);
  }
  console.log('======================================================');
  if (allPassed) {
    console.log('🎉 ALL SMOKE TEST STEPS PASSED SUCCESSFULLY!');
    console.log('The deployed frontend and backend are 100% demo-ready.');
    process.exit(0);
  } else {
    console.error('❌ SOME SMOKE TEST STEPS FAILED. Check details above.');
    process.exit(1);
  }
}

if (require.main === module) {
  runSmokeTest();
}

module.exports = { runSmokeTest };
