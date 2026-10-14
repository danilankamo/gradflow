const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const controller = require('../controllers/projectController');

const PROJECT_ID = '507f1f77bcf86cd799439012';
const STUDENT_ID = '507f1f77bcf86cd799439014';
const SUPERVISOR_ID = '507f1f77bcf86cd799439015';
const COORDINATOR_ID = '507f1f77bcf86cd799439016';

const originals = {
  projectFindOne: Project.findOne,
  projectFind: Project.find,
  milestoneFind: Milestone.find,
};

afterEach(() => {
  Project.findOne = originals.projectFindOne;
  Project.find = originals.projectFind;
  Milestone.find = originals.milestoneFind;
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

const throwNext = (error) => {
  throw error;
};

const stubMilestones = () => {
  Milestone.find = () => ({ sort: async () => [] });
};

test('a student can only submit a project they own', async () => {
  let filter;
  Project.findOne = async (query) => {
    filter = query;
    return null;
  };

  const res = responseRecorder();
  await controller.submitProposal(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(filter, { _id: PROJECT_ID, students: STUDENT_ID });
});

test('a student can only edit a project they own', async () => {
  let filter;
  Project.findOne = async (query) => {
    filter = query;
    return null;
  };

  const res = responseRecorder();
  await controller.updateProject(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID }, body: { title: 'X' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(filter, { _id: PROJECT_ID, students: STUDENT_ID });
});

test('getProject scopes a student query to their own projects', async () => {
  let filter;
  Project.findOne = (query) => {
    filter = query;
    return {
      populate: () => ({
        populate: async () => ({ _id: PROJECT_ID, _doc: {} }),
      }),
    };
  };
  stubMilestones();

  const res = responseRecorder();
  await controller.getProject(
    { params: { id: PROJECT_ID }, user: { _id: STUDENT_ID, role: 'student' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(filter.students, STUDENT_ID);
  assert.equal(filter.supervisorId, undefined);
});

test('getProject scopes a supervisor query to their assigned projects', async () => {
  let filter;
  Project.findOne = (query) => {
    filter = query;
    return {
      populate: () => ({
        populate: async () => ({ _id: PROJECT_ID, _doc: {} }),
      }),
    };
  };
  stubMilestones();

  const res = responseRecorder();
  await controller.getProject(
    { params: { id: PROJECT_ID }, user: { _id: SUPERVISOR_ID, role: 'supervisor' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(filter.supervisorId, SUPERVISOR_ID);
  assert.equal(filter.students, undefined);
});

test('getProject lets a coordinator access any project', async () => {
  let filter;
  Project.findOne = (query) => {
    filter = query;
    return {
      populate: () => ({
        populate: async () => ({ _id: PROJECT_ID, _doc: {} }),
      }),
    };
  };
  stubMilestones();

  const res = responseRecorder();
  await controller.getProject(
    { params: { id: PROJECT_ID }, user: { _id: COORDINATOR_ID, role: 'coordinator' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(filter, { _id: PROJECT_ID });
});

test('getProject denies roles without project access', async () => {
  let filter;
  Project.findOne = (query) => {
    filter = query;
    return {
      populate: () => ({
        populate: async () => null,
      }),
    };
  };

  const res = responseRecorder();
  await controller.getProject(
    { params: { id: PROJECT_ID }, user: { _id: 'examiner-1', role: 'examiner' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 404);
  assert.equal(filter._id, null);
});

test('getAssignedProjects only returns projects owned by the authenticated supervisor', async () => {
  let filter;
  Project.find = (query) => {
    filter = query;
    return {
      populate: () => ({
        sort: async () => [],
      }),
    };
  };

  const res = responseRecorder();
  await controller.getAssignedProjects(
    { user: { _id: SUPERVISOR_ID, role: 'supervisor' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(filter, { supervisorId: SUPERVISOR_ID });
  assert.equal(res.body.count, 0);
});
