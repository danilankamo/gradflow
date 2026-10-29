const { test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const Defense = require('../models/Defense');
const User = require('../models/User');
const projectController = require('../controllers/projectController');
const submissionController = require('../controllers/submissionController');
const defenseController = require('../controllers/defenseController');
const evaluationController = require('../controllers/evaluationController');
const Evaluation = require('../models/Evaluation');

const makeId = (() => {
  let counter = 0;
  return () => (++counter).toString(16).padStart(24, '0');
})();

const matchesValue = (actual, expected) => {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Object.entries(expected).every(([operator, value]) => {
      if (operator === '$in') {
        return value.some((candidate) => matchesValue(actual, candidate));
      }
      if (operator === '$exists') {
        const exists = actual !== undefined && actual !== null;
        return value ? exists : !exists;
      }
      if (operator === '$ne') {
        if (value === null) return actual !== undefined && actual !== null;
        return String(actual) !== String(value);
      }
      return false;
    });
  }
  if (expected === null) return actual === undefined || actual === null;
  if (Array.isArray(actual)) {
    return actual.some((item) => String(item) === String(expected));
  }
  return String(actual) === String(expected);
};

const matchesFilter = (doc, filter) =>
  Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some((condition) => matchesFilter(doc, condition));
    return matchesValue(doc[key], expected);
  });

const makeQuery = (exec) => {
  const query = {
    populate() {
      return query;
    },
    sort() {
      return query;
    },
    select() {
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve().then(exec).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve().then(exec).catch(reject);
    },
  };
  return query;
};

const decorate = (doc) => {
  doc.populate = async function populate() {
    return this;
  };
  doc.save = async function save() {
    return this;
  };
  return doc;
};

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const throwNext = (error) => {
  throw error;
};

const createDatabase = () => {
  const projects = [];
  const milestones = [];
  const submissions = [];
  const defenses = [];
  const evaluations = [];
  const users = [];

  const attach = (collection) => ({
    create: async (data) => {
      const doc = decorate({ ...data, _id: data._id || makeId() });
      collection.push(doc);
      return doc;
    },
    findById: (id) => makeQuery(async () => collection.find((doc) => String(doc._id) === String(id)) || null),
    findOne: (filter) => makeQuery(async () => collection.find((doc) => matchesFilter(doc, filter)) || null),
    find: (filter) => makeQuery(async () => (filter ? collection.filter((doc) => matchesFilter(doc, filter)) : [...collection])),
  });

  const projectMethods = attach(projects);
  Project.create = projectMethods.create;
  Project.findById = projectMethods.findById;
  Project.findOne = projectMethods.findOne;
  Project.find = projectMethods.find;
  Project.findOneAndUpdate = (filter, update) =>
    makeQuery(async () => {
      const doc = projects.find((candidate) => matchesFilter(candidate, filter));
      if (!doc) return null;
      if (update.$set) Object.assign(doc, update.$set);
      return doc;
    });
  Project.aggregate = async () => [];

  const milestoneMethods = attach(milestones);
  Milestone.create = milestoneMethods.create;
  Milestone.findById = milestoneMethods.findById;
  Milestone.find = milestoneMethods.find;
  Milestone.countDocuments = async (filter) =>
    milestones.filter((doc) => matchesFilter(doc, filter)).length;
  Milestone.insertMany = async (docs) => {
    const created = docs.map((doc) => decorate({ ...doc, _id: makeId() }));
    milestones.push(...created);
    return created;
  };

  const submissionMethods = attach(submissions);
  Submission.create = submissionMethods.create;
  Submission.findById = submissionMethods.findById;
  Submission.find = submissionMethods.find;

  const defenseMethods = attach(defenses);
  Defense.create = defenseMethods.create;
  Defense.findById = defenseMethods.findById;
  Defense.findOne = defenseMethods.findOne;
  Defense.find = defenseMethods.find;

  const evaluationMethods = attach(evaluations);
  Evaluation.create = evaluationMethods.create;
  Evaluation.findById = evaluationMethods.findById;
  Evaluation.findOne = evaluationMethods.findOne;
  Evaluation.find = evaluationMethods.find;
  Evaluation.countDocuments = async (filter) =>
    evaluations.filter((doc) => matchesFilter(doc, filter)).length;

  User.findOne = (filter) => makeQuery(async () => users.find((doc) => matchesFilter(doc, filter)) || null);
  User.find = (filter) => makeQuery(async () => (filter ? users.filter((doc) => matchesFilter(doc, filter)) : [...users]));

  const Notification = require('../models/Notification');
  Notification.insertMany = async () => [];
  Notification.create = async () => ({});

  return { projects, milestones, submissions, defenses, evaluations, users };
};

test('core lifecycle runs end to end from proposal to supervisor feedback', async () => {
  const db = createDatabase();

  const student = { _id: makeId(), role: 'student', name: 'Sam Student' };
  const supervisor = { _id: makeId(), role: 'supervisor', name: 'Dr. Supervisor' };
  const coordinator = { _id: makeId(), role: 'coordinator', name: 'Casey Coordinator' };
  db.users.push(student, supervisor, coordinator);

  const createRes = responseRecorder();
  await projectController.createProject(
    {
      body: {
        title: 'Smart Campus Portal',
        abstract: 'A portal for campus services',
        problemStatement: 'Services are fragmented',
        methodology: 'Agile',
      },
      user: { id: student._id },
    },
    createRes,
    throwNext
  );
  assert.equal(createRes.statusCode, 201);
  const projectId = createRes.body.data._id;
  assert.equal(createRes.body.data.status, 'Draft');
  assert.equal(db.milestones.length, 6);

  const submitRes = responseRecorder();
  await projectController.submitProposal(
    { params: { id: projectId }, user: { id: student._id } },
    submitRes,
    throwNext
  );
  assert.equal(submitRes.statusCode, 200);
  assert.equal(submitRes.body.status, 'Submitted');

  const reviewRes = responseRecorder();
  await projectController.reviewProposal(
    { params: { id: projectId }, body: { action: 'approve', comment: 'Strong proposal' } },
    reviewRes,
    throwNext
  );
  assert.equal(reviewRes.statusCode, 200);
  assert.equal(reviewRes.body.data.status, 'Approved');

  const assignRes = responseRecorder();
  await projectController.assignSupervisor(
    { params: { id: projectId }, body: { supervisorId: supervisor._id } },
    assignRes,
    throwNext
  );
  assert.equal(assignRes.statusCode, 200);

  const storedProject = db.projects.find((project) => project._id === projectId);
  assert.equal(String(storedProject.supervisorId), String(supervisor._id));
  assert.equal(storedProject.status, 'In Progress');

  const firstMilestone = db.milestones.find(
    (milestone) => String(milestone.projectId) === String(projectId)
  );

  const submissionRes = responseRecorder();
  await submissionController.createSubmission(
    {
      params: { id: firstMilestone._id },
      user: { _id: student._id },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow', description: 'First draft' },
    },
    submissionRes,
    throwNext
  );
  assert.equal(submissionRes.statusCode, 201);
  assert.equal(firstMilestone.status, 'submitted');

  const revisionRes = responseRecorder();
  await submissionController.reviewSubmission(
    {
      params: { id: submissionRes.body.data._id },
      user: { _id: supervisor._id },
      body: { action: 'revision', feedback: 'Add unit tests' },
    },
    revisionRes,
    throwNext
  );
  assert.equal(revisionRes.statusCode, 200);
  assert.equal(revisionRes.body.data.status, 'revision');
  assert.equal(revisionRes.body.data.feedback, 'Add unit tests');
  assert.equal(firstMilestone.status, 'revision');
  assert.equal(storedProject.progress, 0);

  const finalSubmissionRes = responseRecorder();
  await submissionController.createSubmission(
    {
      params: { id: firstMilestone._id },
      user: { _id: student._id },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow', description: 'Added tests' },
    },
    finalSubmissionRes,
    throwNext
  );
  assert.equal(finalSubmissionRes.statusCode, 201);

  const approveRes = responseRecorder();
  await submissionController.reviewSubmission(
    {
      params: { id: finalSubmissionRes.body.data._id },
      user: { _id: supervisor._id },
      body: { action: 'approve', feedback: 'Approved' },
    },
    approveRes,
    throwNext
  );
  assert.equal(approveRes.statusCode, 200);
  assert.equal(firstMilestone.status, 'approved');
  assert.equal(storedProject.progress, 17);
});

test('the workflow blocks a student from acting on another student project', async () => {
  const db = createDatabase();

  const owner = { _id: makeId(), role: 'student' };
  const intruder = { _id: makeId(), role: 'student' };
  db.users.push(owner, intruder);

  const createRes = responseRecorder();
  await projectController.createProject(
    { body: { title: 'Owned Project' }, user: { id: owner._id } },
    createRes,
    throwNext
  );
  const projectId = createRes.body.data._id;

  const submitRes = responseRecorder();
  await projectController.submitProposal(
    { params: { id: projectId }, user: { id: intruder._id } },
    submitRes,
    throwNext
  );
  assert.equal(submitRes.statusCode, 404);

  const firstMilestone = db.milestones.find(
    (milestone) => String(milestone.projectId) === String(projectId)
  );
  const submissionRes = responseRecorder();
  await submissionController.createSubmission(
    {
      params: { id: firstMilestone._id },
      user: { _id: intruder._id },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow' },
    },
    submissionRes,
    throwNext
  );
  assert.equal(submissionRes.statusCode, 403);
  assert.equal(db.submissions.length, 0);
});

test('the workflow rejects an invalid proposal status transition', async () => {
  const db = createDatabase();
  const student = { _id: makeId(), role: 'student' };
  db.users.push(student);

  const createRes = responseRecorder();
  await projectController.createProject(
    {
      body: {
        title: 'Transition Guard',
        abstract: 'An abstract',
        problemStatement: 'A problem',
        methodology: 'A methodology',
      },
      user: { id: student._id },
    },
    createRes,
    throwNext
  );
  const projectId = createRes.body.data._id;

  const firstSubmit = responseRecorder();
  await projectController.submitProposal(
    { params: { id: projectId }, user: { id: student._id } },
    firstSubmit,
    throwNext
  );
  assert.equal(firstSubmit.body.status, 'Submitted');

  const secondSubmit = responseRecorder();
  await projectController.submitProposal(
    { params: { id: projectId }, user: { id: student._id } },
    secondSubmit,
    throwNext
  );
  assert.equal(secondSubmit.statusCode, 400);

  const storedProject = db.projects.find((project) => project._id === projectId);
  assert.equal(storedProject.status, 'Submitted');
});

test('complete lifecycle advances through milestone approvals, final submission, and conflict-safe defense scheduling', async () => {
  const db = createDatabase();

  const student = { _id: makeId(), role: 'student', name: 'Alice Student' };
  const supervisor = { _id: makeId(), role: 'supervisor', name: 'Dr. Supervisor' };
  const coordinator = { _id: makeId(), role: 'coordinator', name: 'Prof. Coordinator' };
  const examiner1 = { _id: makeId(), role: 'examiner', name: 'Dr. Examiner Alpha' };
  const examiner2 = { _id: makeId(), role: 'examiner', name: 'Dr. Examiner Beta' };
  db.users.push(student, supervisor, coordinator, examiner1, examiner2);

  // 1. Create and submit project proposal
  const createRes = responseRecorder();
  await projectController.createProject(
    {
      body: {
        title: 'Autonomous Robotics Platform',
        abstract: 'Autonomous navigation system',
        problemStatement: 'Obstacle avoidance is slow',
        methodology: 'ROS2 and LiDAR',
      },
      user: { id: student._id },
    },
    createRes,
    throwNext
  );
  const projectId = createRes.body.data._id;

  const submitRes = responseRecorder();
  await projectController.submitProposal(
    { params: { id: projectId }, user: { id: student._id } },
    submitRes,
    throwNext
  );
  assert.equal(submitRes.body.status, 'Submitted');

  // 2. Coordinator approves and assigns supervisor
  const reviewRes = responseRecorder();
  await projectController.reviewProposal(
    { params: { id: projectId }, body: { action: 'approve' } },
    reviewRes,
    throwNext
  );
  assert.equal(reviewRes.body.data.status, 'Approved');

  const assignRes = responseRecorder();
  await projectController.assignSupervisor(
    { params: { id: projectId }, body: { supervisorId: supervisor._id } },
    assignRes,
    throwNext
  );
  assert.equal(assignRes.body.data.status, 'In Progress');

  // 3. Attempt to schedule defense while In Progress -> REJECTED (409)
  const prematureDefenseRes = responseRecorder();
  await defenseController.createDefense(
    {
      body: {
        projectId,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [examiner1._id],
      },
      user: { role: 'coordinator' },
    },
    prematureDefenseRes,
    throwNext
  );
  assert.equal(prematureDefenseRes.statusCode, 409);
  assert.match(prematureDefenseRes.body.message, /Final Submission/i);

  // 4. Student completes all 6 milestones with supervisor approvals
  const projectMilestones = db.milestones.filter(
    (m) => String(m.projectId) === String(projectId)
  );
  assert.equal(projectMilestones.length, 6);

  for (const milestone of projectMilestones) {
    const subRes = responseRecorder();
    await submissionController.createSubmission(
      {
        params: { id: milestone._id },
        user: { _id: student._id },
        body: { githubUrl: 'https://github.com/danilankamo/gradflow' },
      },
      subRes,
      throwNext
    );

    const appRes = responseRecorder();
    await submissionController.reviewSubmission(
      {
        params: { id: subRes.body.data._id },
        user: { _id: supervisor._id },
        body: { action: 'approve', feedback: 'Excellent work' },
      },
      appRes,
      throwNext
    );
  }

  // After all 6 milestones are approved, project progress is 100% and status is Final Submission
  const projectAfterMilestones = db.projects.find((p) => String(p._id) === String(projectId));
  assert.equal(projectAfterMilestones.progress, 100);
  assert.equal(projectAfterMilestones.status, 'Final Submission');

  // 5. Attempting to assign supervisor as examiner -> REJECTED (400)
  const supervisorAsExaminerRes = responseRecorder();
  await defenseController.createDefense(
    {
      body: {
        projectId,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [supervisor._id],
      },
      user: { role: 'coordinator' },
    },
    supervisorAsExaminerRes,
    throwNext
  );
  assert.equal(supervisorAsExaminerRes.statusCode, 400);
  assert.match(supervisorAsExaminerRes.body.message, /supervisor cannot be assigned as an examiner/i);

  // 6. Coordinator schedules defense with valid examiner -> SUCCEEDED (201)
  const validDefenseRes = responseRecorder();
  await defenseController.createDefense(
    {
      body: {
        projectId,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [examiner1._id],
      },
      user: { role: 'coordinator' },
    },
    validDefenseRes,
    throwNext
  );
  assert.equal(validDefenseRes.statusCode, 201);
  assert.equal(projectAfterMilestones.status, 'Defense Scheduled');
  assert.equal(db.defenses.length, 1);

  // 7. Conflicting defense: Room Hall A overlap on same date -> REJECTED (409)
  const anotherProject = {
    _id: makeId(),
    title: 'Second Final Project',
    status: 'Final Submission',
    students: [makeId()],
    supervisorId: makeId(),
    save: async () => {},
  };
  db.projects.push(anotherProject);

  const roomConflictRes = responseRecorder();
  await defenseController.createDefense(
    {
      body: {
        projectId: anotherProject._id,
        date: '2026-10-25',
        startTime: '10:00', // Overlaps with 09:00 - 10:30 in Hall A!
        endTime: '11:30',
        room: 'Hall A',
        examinerIds: [examiner2._id],
      },
      user: { role: 'coordinator' },
    },
    roomConflictRes,
    throwNext
  );
  assert.equal(roomConflictRes.statusCode, 409);
  assert.equal(roomConflictRes.body.conflictType, 'room');
  assert.match(roomConflictRes.body.message, /Room "Hall A" is already booked/i);

  // 8. Conflicting defense: Examiner 1 overlap on same date in another room -> REJECTED (409)
  const examinerConflictRes = responseRecorder();
  await defenseController.createDefense(
    {
      body: {
        projectId: anotherProject._id,
        date: '2026-10-25',
        startTime: '09:30', // Overlaps with Examiner 1's 09:00 - 10:30 defense!
        endTime: '11:00',
        room: 'Room 205',
        examinerIds: [examiner1._id],
      },
      user: { role: 'coordinator' },
    },
    examinerConflictRes,
    throwNext
  );
  assert.equal(examinerConflictRes.statusCode, 409);
  assert.equal(examinerConflictRes.body.conflictType, 'examiner');

  // 9. Consecutive non-overlapping slot in Hall A with Examiner 2 -> SUCCEEDED (201)
  const consecutiveSlotRes = responseRecorder();
  await defenseController.createDefense(
    {
      body: {
        projectId: anotherProject._id,
        date: '2026-10-25',
        startTime: '10:30', // Exactly at 10:30 when slot 1 ends
        endTime: '12:00',
        room: 'Hall A',
        examinerIds: [examiner2._id],
      },
      user: { role: 'coordinator' },
    },
    consecutiveSlotRes,
    throwNext
  );
  assert.equal(consecutiveSlotRes.statusCode, 201);
  assert.equal(anotherProject.status, 'Defense Scheduled');
  assert.equal(db.defenses.length, 2);

  // 10. TC-8: Unassigned Examiner 2 attempts to evaluate Defense 1 -> REJECTED (403)
  const unassignedEvalRes = responseRecorder();
  await evaluationController.submitEvaluation(
    {
      params: { id: db.defenses[0]._id },
      body: {
        scores: {
          problemUnderstanding: 18,
          implementation: 23,
          functionality: 22,
          documentation: 13,
          presentation: 14,
        },
      },
      user: { _id: examiner2._id, role: 'examiner' },
    },
    unassignedEvalRes,
    throwNext
  );
  assert.equal(unassignedEvalRes.statusCode, 403);
  assert.match(unassignedEvalRes.body.message, /not authorized to evaluate/i);

  // 11. Assigned Examiner 1 submits structured evaluation -> SUCCEEDED (201)
  const assignedEvalRes = responseRecorder();
  await evaluationController.submitEvaluation(
    {
      params: { id: db.defenses[0]._id },
      body: {
        scores: {
          problemUnderstanding: 18,
          implementation: 23,
          functionality: 22,
          documentation: 13,
          presentation: 14,
        },
        comments: 'Outstanding empirical demonstration and clear defense.',
        verdict: 'distinction',
      },
      user: { _id: examiner1._id, role: 'examiner' },
    },
    assignedEvalRes,
    throwNext
  );
  assert.equal(assignedEvalRes.statusCode, 201);
  assert.equal(assignedEvalRes.body.data.total, 90);
  assert.equal(projectAfterMilestones.status, 'Completed');
  assert.equal(db.defenses[0].status, 'completed');
  assert.equal(db.evaluations.length, 1);

  const archiveRes = responseRecorder();
  await projectController.getProjectArchive(
    { user: { _id: coordinator._id, role: 'coordinator' } },
    archiveRes,
    throwNext
  );
  assert.equal(archiveRes.statusCode, 200);
  assert.equal(archiveRes.body.count, 1);
  assert.equal(archiveRes.body.data[0]._id, projectId);
  assert.equal(archiveRes.body.data[0].score, 90);
  assert.equal(archiveRes.body.data[0].status, 'Completed');
  assert.equal(archiveRes.body.data[0].links[0].url, 'https://github.com/danilankamo/gradflow');

  const readOnlySubmissionRes = responseRecorder();
  await submissionController.createSubmission(
    {
      params: { id: projectMilestones[0]._id },
      user: { _id: student._id },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow' },
    },
    readOnlySubmissionRes,
    throwNext
  );
  assert.equal(readOnlySubmissionRes.statusCode, 409);
  assert.match(readOnlySubmissionRes.body.message, /read-only/i);
});
