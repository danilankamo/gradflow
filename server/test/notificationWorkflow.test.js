const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Notification = require('../models/Notification');
const projectController = require('../controllers/projectController');
const submissionController = require('../controllers/submissionController');

const STUDENT_ID = '507f1f77bcf86cd799439011';
const SUPERVISOR_ID = '507f1f77bcf86cd799439012';
const PROJECT_ID = '507f1f77bcf86cd799439013';
const MILESTONE_ID = '507f1f77bcf86cd799439014';
const SUBMISSION_ID = '507f1f77bcf86cd799439015';

const originals = {
  projectFindById: Project.findById,
  projectFindOneAndUpdate: Project.findOneAndUpdate,
  milestoneFindById: Milestone.findById,
  milestoneFind: Milestone.find,
  submissionCreate: Submission.create,
  submissionFindById: Submission.findById,
  userFindOne: User.findOne,
  notificationInsertMany: Notification.insertMany,
  notificationCreate: Notification.create,
};

afterEach(() => {
  Project.findById = originals.projectFindById;
  Project.findOneAndUpdate = originals.projectFindOneAndUpdate;
  Milestone.findById = originals.milestoneFindById;
  Milestone.find = originals.milestoneFind;
  Submission.create = originals.submissionCreate;
  Submission.findById = originals.submissionFindById;
  User.findOne = originals.userFindOne;
  Notification.insertMany = originals.notificationInsertMany;
  Notification.create = originals.notificationCreate;
});

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

test('reviewProposal creates server-side notifications when proposal is approved', async () => {
  let createdNotifications = [];
  Notification.insertMany = async (items) => {
    createdNotifications = items;
    return items;
  };

  const fakeProject = {
    _id: PROJECT_ID,
    title: 'Autonomous Drone Navigation',
    status: 'Submitted',
    students: [STUDENT_ID],
    save: async () => fakeProject,
    populate: async () => fakeProject,
  };
  Project.findById = async () => fakeProject;

  const req = {
    params: { id: PROJECT_ID },
    body: { action: 'approve', comment: 'Excellent technical scope' },
  };
  const res = responseRecorder();

  await projectController.reviewProposal(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(createdNotifications.length, 1);
  assert.equal(String(createdNotifications[0].userId), STUDENT_ID);
  assert.equal(createdNotifications[0].type, 'proposal_decision');
  assert.equal(createdNotifications[0].title, 'Proposal Approved');
  assert.match(createdNotifications[0].message, /Autonomous Drone Navigation/);
});

test('reviewProposal creates revision requested notification with feedback', async () => {
  let createdNotifications = [];
  Notification.insertMany = async (items) => {
    createdNotifications = items;
    return items;
  };

  const fakeProject = {
    _id: PROJECT_ID,
    title: 'Autonomous Drone Navigation',
    status: 'Submitted',
    students: [STUDENT_ID],
    save: async () => fakeProject,
    populate: async () => fakeProject,
  };
  Project.findById = async () => fakeProject;

  const req = {
    params: { id: PROJECT_ID },
    body: { action: 'revision', comment: 'Needs clearer methodology' },
  };
  const res = responseRecorder();

  await projectController.reviewProposal(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(createdNotifications.length, 1);
  assert.equal(createdNotifications[0].title, 'Proposal Revision Requested');
  assert.match(createdNotifications[0].message, /Needs clearer methodology/);
});

test('assignSupervisor creates notifications for both candidate and supervisor', async () => {
  let createdNotifications = [];
  Notification.insertMany = async (items) => {
    createdNotifications = items;
    return items;
  };

  User.findOne = async () => ({
    _id: SUPERVISOR_ID,
    name: 'Dr. Marcus Vance',
    role: 'supervisor',
  });

  const fakeProject = {
    _id: PROJECT_ID,
    title: 'Distributed Sensor Mesh',
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
    populate() {
      return this;
    },
  };
  Project.findOneAndUpdate = () => ({
    populate() {
      return this;
    },
    then(resolve) {
      return resolve(fakeProject);
    },
  });

  const req = {
    params: { id: PROJECT_ID },
    body: { supervisorId: SUPERVISOR_ID },
  };
  const res = responseRecorder();

  await projectController.assignSupervisor(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(createdNotifications.length, 2);
  // Student notification
  const studentNotif = createdNotifications.find((n) => String(n.userId) === STUDENT_ID);
  assert.ok(studentNotif);
  assert.equal(studentNotif.type, 'supervisor_assigned');
  assert.match(studentNotif.message, /Dr. Marcus Vance/);

  // Supervisor notification
  const supervisorNotif = createdNotifications.find((n) => String(n.userId) === SUPERVISOR_ID);
  assert.ok(supervisorNotif);
  assert.equal(supervisorNotif.type, 'supervisor_assigned');
  assert.match(supervisorNotif.message, /Distributed Sensor Mesh/);
});

test('createSubmission notifies supervisor when student submits deliverable', async () => {
  let createdNotif = null;
  Notification.create = async (item) => {
    createdNotif = item;
    return item;
  };

  Milestone.findById = async () => ({
    _id: MILESTONE_ID,
    title: 'Sprint 2 Architecture',
    projectId: PROJECT_ID,
    status: 'pending',
    save: async () => {},
  });
  Milestone.find = () => ({ sort: async () => [] });

  Project.findById = async () => ({
    _id: PROJECT_ID,
    title: 'Autonomous Drone Navigation',
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
    status: 'In Progress',
    save: async () => {},
  });

  Submission.create = async (doc) => doc;

  const req = {
    params: { id: MILESTONE_ID },
    user: { _id: STUDENT_ID, role: 'student' },
    body: {
      githubUrl: 'https://github.com/example/drone-nav',
      description: 'Completed telemetry and test flight benchmarks',
    },
  };
  const res = responseRecorder();

  await submissionController.createSubmission(req, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.ok(createdNotif);
  assert.equal(String(createdNotif.userId), SUPERVISOR_ID);
  assert.equal(createdNotif.type, 'milestone_submitted');
  assert.match(createdNotif.message, /Sprint 2 Architecture/);
});

test('reviewSubmission notifies student with feedback when revision is requested', async () => {
  let createdNotifications = [];
  Notification.insertMany = async (items) => {
    createdNotifications = items;
    return items;
  };

  Submission.findById = async () => ({
    _id: SUBMISSION_ID,
    milestoneId: MILESTONE_ID,
    projectId: PROJECT_ID,
    status: 'submitted',
    save: async () => {},
  });

  Project.findById = async () => ({
    _id: PROJECT_ID,
    title: 'Autonomous Drone Navigation',
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
    status: 'In Progress',
    save: async () => {},
  });

  Milestone.findById = async () => ({
    _id: MILESTONE_ID,
    title: 'Sprint 2 Architecture',
    save: async () => {},
  });
  Milestone.find = () => ({ sort: async () => [] });

  const req = {
    params: { id: SUBMISSION_ID },
    user: { _id: SUPERVISOR_ID, role: 'supervisor' },
    body: {
      action: 'revision',
      feedback: 'Please include ns-3 simulator benchmark plots before approval',
    },
  };
  const res = responseRecorder();

  await submissionController.reviewSubmission(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(createdNotifications.length, 1);
  assert.equal(String(createdNotifications[0].userId), STUDENT_ID);
  assert.equal(createdNotifications[0].type, 'milestone_feedback');
  assert.equal(createdNotifications[0].title, 'Milestone Revision Requested');
  assert.match(createdNotifications[0].message, /ns-3 simulator benchmark plots/);
});
