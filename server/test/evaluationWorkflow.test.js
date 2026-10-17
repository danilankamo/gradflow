const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Defense = require('../models/Defense');
const Project = require('../models/Project');
const Evaluation = require('../models/Evaluation');
const Notification = require('../models/Notification');
const controller = require('../controllers/evaluationController');

const PROJECT_ID = '507f1f77bcf86cd799439011';
const STUDENT_ID = '507f1f77bcf86cd799439012';
const SUPERVISOR_ID = '507f1f77bcf86cd799439013';
const ASSIGNED_EXAMINER_ID = '507f1f77bcf86cd799439014';
const UNASSIGNED_EXAMINER_ID = '507f1f77bcf86cd799439015';
const DEFENSE_ID = '507f1f77bcf86cd799439016';
const EVAL_ID = '507f1f77bcf86cd799439017';

const originals = {
  defenseFindById: Defense.findById,
  defenseFindOne: Defense.findOne,
  projectFindById: Project.findById,
  evaluationFindOne: Evaluation.findOne,
  evaluationCreate: Evaluation.create,
  evaluationFind: Evaluation.find,
  evaluationFindById: Evaluation.findById,
  evaluationCountDocuments: Evaluation.countDocuments,
  notificationInsertMany: Notification.insertMany,
};

afterEach(() => {
  Defense.findById = originals.defenseFindById;
  Defense.findOne = originals.defenseFindOne;
  Project.findById = originals.projectFindById;
  Evaluation.findOne = originals.evaluationFindOne;
  Evaluation.create = originals.evaluationCreate;
  Evaluation.find = originals.evaluationFind;
  Evaluation.findById = originals.evaluationFindById;
  Evaluation.countDocuments = originals.evaluationCountDocuments;
  Notification.insertMany = originals.notificationInsertMany;
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

test('calculateRubricTotal computes sum correctly for standard rubric points', () => {
  const scores = {
    problemUnderstanding: 18, // /20
    implementation: 23,       // /25
    functionality: 22,        // /25
    documentation: 13,        // /15
    presentation: 14,         // /15
  };
  const total = controller.calculateRubricTotal(scores);
  assert.equal(total, 90);
});

test('calculateRubricTotal computes weighted sum correctly for percentage inputs', () => {
  const scores = {
    problemUnderstanding: 90,
    implementation: 92,
    functionality: 88,
    documentation: 86.6,
    presentation: 93.3,
  };
  const total = controller.calculateRubricTotal(scores);
  assert.equal(total, 90);
});

test('rejects evaluation submission if defense is not found', async () => {
  Defense.findById = () => ({
    populate: () => Promise.resolve(null),
  });

  const req = {
    params: { id: DEFENSE_ID },
    user: { _id: ASSIGNED_EXAMINER_ID, role: 'examiner' },
    body: { scores: { problemUnderstanding: 18 } },
  };
  const res = responseRecorder();

  await controller.submitEvaluation(req, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /Defense not found/i);
});

test('rejects evaluation submission if defense is cancelled', async () => {
  Defense.findById = () => ({
    populate: () => Promise.resolve({
      _id: DEFENSE_ID,
      status: 'cancelled',
      examinerIds: [ASSIGNED_EXAMINER_ID],
    }),
  });

  const req = {
    params: { id: DEFENSE_ID },
    user: { _id: ASSIGNED_EXAMINER_ID, role: 'examiner' },
    body: { scores: { problemUnderstanding: 18 } },
  };
  const res = responseRecorder();

  await controller.submitEvaluation(req, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cancelled defense/i);
});

test('TC-8: rejects evaluation when examiner is not assigned to the defense', async () => {
  Defense.findById = () => ({
    populate: () => Promise.resolve({
      _id: DEFENSE_ID,
      status: 'scheduled',
      examinerIds: [ASSIGNED_EXAMINER_ID],
      projectId: { _id: PROJECT_ID },
    }),
  });

  const req = {
    params: { id: DEFENSE_ID },
    user: { _id: UNASSIGNED_EXAMINER_ID, role: 'examiner' },
    body: {
      scores: {
        problemUnderstanding: 18,
        implementation: 23,
        functionality: 22,
        documentation: 13,
        presentation: 14,
      },
    },
  };
  const res = responseRecorder();

  await controller.submitEvaluation(req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not authorized to evaluate/i);
});

test('successfully records examiner evaluation, updates project to Evaluated, and notifies parties', async () => {
  let projectSaved = false;
  let notificationsCreated = [];

  const fakeProject = {
    _id: PROJECT_ID,
    title: 'Precision Sensor Mesh',
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
    status: 'Defense Scheduled',
    save() {
      projectSaved = true;
      return Promise.resolve(this);
    },
  };

  const fakeDefense = {
    _id: DEFENSE_ID,
    status: 'scheduled',
    examinerIds: [ASSIGNED_EXAMINER_ID],
    projectId: fakeProject,
    save() {
      return Promise.resolve(this);
    },
  };

  Defense.findById = () => ({
    populate: () => Promise.resolve(fakeDefense),
  });

  Project.findById = () => Promise.resolve(fakeProject);

  Evaluation.findOne = () => Promise.resolve(null);
  Evaluation.create = (doc) => Promise.resolve({ ...doc, _id: EVAL_ID });
  Evaluation.countDocuments = () => Promise.resolve(1);
  Evaluation.findById = () => ({
    populate: () => Promise.resolve({
      _id: EVAL_ID,
      total: 90,
      scores: { problemUnderstanding: 18, implementation: 23, functionality: 22, documentation: 13, presentation: 14 },
      comments: 'Excellent live demonstration.',
      verdict: 'Approved with Distinction',
    }),
  });

  Notification.insertMany = (notifs) => {
    notificationsCreated = notifs;
    return Promise.resolve(notifs);
  };

  const req = {
    params: { id: DEFENSE_ID },
    user: { _id: ASSIGNED_EXAMINER_ID, name: 'Dr. Helen Sterling', role: 'examiner' },
    body: {
      scores: {
        problemUnderstanding: 18,
        implementation: 23,
        functionality: 22,
        documentation: 13,
        presentation: 14,
      },
      comments: 'Excellent live demonstration.',
      verdict: 'Approved with Distinction',
    },
  };
  const res = responseRecorder();

  await controller.submitEvaluation(req, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(fakeProject.status, 'Evaluated');
  assert.equal(projectSaved, true);
  assert.equal(fakeDefense.status, 'completed');
  assert.equal(notificationsCreated.length, 2);
  assert.equal(notificationsCreated[0].userId, STUDENT_ID);
  assert.equal(notificationsCreated[1].userId, SUPERVISOR_ID);
});

test('getProjectEvaluations blocks an unauthorized student from viewing another project evaluations', async () => {
  Project.findById = () => Promise.resolve({
    _id: PROJECT_ID,
    students: [STUDENT_ID],
  });

  const req = {
    params: { id: PROJECT_ID },
    user: { _id: '507f1f77bcf86cd799439099', role: 'student' },
  };
  const res = responseRecorder();

  await controller.getProjectEvaluations(req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not authorized/i);
});

test('getProjectEvaluations returns evaluation list with average score for coordinator', async () => {
  Project.findById = () => Promise.resolve({
    _id: PROJECT_ID,
    students: [STUDENT_ID],
  });

  Evaluation.find = () => ({
    populate: () => ({
      populate: () => ({
        sort: () => Promise.resolve([
          { total: 90, examinerId: { name: 'Examiner 1' } },
          { total: 80, examinerId: { name: 'Examiner 2' } },
        ]),
      }),
    }),
  });

  const req = {
    params: { id: PROJECT_ID },
    user: { _id: '507f1f77bcf86cd799439098', role: 'coordinator' },
  };
  const res = responseRecorder();

  await controller.getProjectEvaluations(req, res, () => {});
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.averageScore, 85);
});
