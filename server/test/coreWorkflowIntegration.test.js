const { test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const User = require('../models/User');
const projectController = require('../controllers/projectController');
const submissionController = require('../controllers/submissionController');

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
  const users = [];

  const attach = (collection) => ({
    create: async (data) => {
      const doc = decorate({ ...data, _id: data._id || makeId() });
      collection.push(doc);
      return doc;
    },
    findById: (id) => makeQuery(async () => collection.find((doc) => String(doc._id) === String(id)) || null),
    findOne: (filter) => makeQuery(async () => collection.find((doc) => matchesFilter(doc, filter)) || null),
    find: (filter) => makeQuery(async () => collection.filter((doc) => matchesFilter(doc, filter))),
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

  User.findOne = (filter) => makeQuery(async () => users.find((doc) => matchesFilter(doc, filter)) || null);

  return { projects, milestones, submissions, users };
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
