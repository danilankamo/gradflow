const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Defense = require('../models/Defense');
const controller = require('../controllers/projectController');

const SUPERVISOR_ID = '507f1f77bcf86cd799439011';
const PROJECT_ID = '507f1f77bcf86cd799439012';

const originals = {
  projectFind: Project.find,
  milestoneFind: Milestone.find,
  submissionFind: Submission.find,
  userFind: User.find,
  defenseFind: Defense.find,
};

afterEach(() => {
  Project.find = originals.projectFind;
  Milestone.find = originals.milestoneFind;
  Submission.find = originals.submissionFind;
  User.find = originals.userFind;
  Defense.find = originals.defenseFind;
});

const makeQuery = (result) => {
  const query = {
    populate() { return query; },
    sort() { return query; },
    select() { return query; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return query;
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

test('supervisor dashboard is scoped to assigned projects and reports reviews and health', async () => {
  let projectFilter;
  Project.find = (filter) => {
    projectFilter = filter;
    return makeQuery([{
      _id: PROJECT_ID,
      title: 'Sensor Network',
      status: 'In Progress',
      updatedAt: new Date(),
      progress: 0,
      students: [],
      supervisorId: SUPERVISOR_ID,
    }]);
  };
  Milestone.find = () => makeQuery([
    { projectId: PROJECT_ID, status: 'pending', dueDate: new Date(Date.now() - 86400000) },
  ]);
  Submission.find = () => makeQuery([
    { projectId: PROJECT_ID, status: 'submitted', updatedAt: new Date() },
  ]);

  const res = responseRecorder();
  await controller.getRoleDashboard({ user: { _id: SUPERVISOR_ID, role: 'supervisor' } }, res, assert.fail);

  assert.deepEqual(projectFilter, { supervisorId: SUPERVISOR_ID });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.stats.assignedProjects, 1);
  assert.equal(res.body.data.stats.pendingReviews, 1);
  assert.equal(res.body.data.stats.overdueMilestones, 1);
  assert.equal(res.body.data.projects[0].health.status, 'Delayed');
});

test('dashboard rejects roles outside the supported user roles', async () => {
  const res = responseRecorder();
  await controller.getRoleDashboard({ user: { _id: SUPERVISOR_ID, role: 'guest' } }, res, assert.fail);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test('coordinator dashboard summarizes project health, workflow status and supervisor workload', async () => {
  const secondProjectId = '507f1f77bcf86cd799439013';
  const projectRecords = [
    {
      _id: PROJECT_ID,
      title: 'Sensor Network',
      status: 'In Progress',
      updatedAt: new Date(),
      supervisorId: SUPERVISOR_ID,
    },
    {
      _id: secondProjectId,
      title: 'Campus Accessibility',
      status: 'Submitted',
      updatedAt: new Date(),
      supervisorId: SUPERVISOR_ID,
    },
  ];
  Project.find = () => makeQuery(projectRecords);
  Milestone.find = () => makeQuery([
    { projectId: PROJECT_ID, title: 'Prototype', status: 'pending', dueDate: new Date(Date.now() - 86400000) },
  ]);
  Submission.find = () => makeQuery([]);
  User.find = () => ({
    select: () => Promise.resolve([{
      _id: SUPERVISOR_ID,
      name: 'Dr. Supervisor',
      department: 'Engineering',
    }]),
  });
  Defense.find = () => {
    const query = {
      populate() { return query; },
      sort() { return query; },
      limit() { return query; },
      then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
    };
    return query;
  };

  const res = responseRecorder();
  await controller.getRoleDashboard({ user: { role: 'coordinator' } }, res, assert.fail);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.totalProjects, 2);
  assert.equal(res.body.data.pendingProposals, 1);
  assert.equal(res.body.data.projectsByStatus['In Progress'], 1);
  assert.equal(res.body.data.healthCounts.Delayed, 1);
  assert.equal(res.body.data.supervisorWorkload[0].projectCount, 2);
});
