const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const controller = require('../controllers/projectController');

const PROJECT_ID = '507f1f77bcf86cd799439012';
const STUDENT_ID = '507f1f77bcf86cd799439014';

const originals = {
  projectCreate: Project.create,
  projectFindOne: Project.findOne,
  projectFindById: Project.findById,
  milestoneCount: Milestone.countDocuments,
  milestoneInsertMany: Milestone.insertMany,
};

afterEach(() => {
  Project.create = originals.projectCreate;
  Project.findOne = originals.projectFindOne;
  Project.findById = originals.projectFindById;
  Milestone.countDocuments = originals.milestoneCount;
  Milestone.insertMany = originals.milestoneInsertMany;
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

const completeProposal = () => ({
  _id: PROJECT_ID,
  status: 'Draft',
  title: 'Smart Campus Portal',
  abstract: 'An abstract',
  problemStatement: 'A problem',
  methodology: 'A methodology',
  save: async function save() {
    return this;
  },
});

test('creating a proposal starts in Draft and seeds the standard milestone plan', async () => {
  let captured;
  let inserted;
  Project.create = async (payload) => {
    captured = payload;
    return { _id: PROJECT_ID, ...payload };
  };
  Milestone.countDocuments = async () => 0;
  Milestone.insertMany = async (milestones) => {
    inserted = milestones;
    return milestones;
  };

  const res = responseRecorder();
  await controller.createProject(
    { body: { title: 'Smart Campus Portal' }, user: { id: STUDENT_ID } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 201);
  assert.equal(captured.status, 'Draft');
  assert.deepEqual(captured.students, [STUDENT_ID]);
  assert.equal(inserted.length, 6);
  assert.deepEqual(
    inserted.map((milestone) => milestone.title),
    ['Requirements', 'System Design', 'Implementation', 'Testing', 'Final Report', 'Defense']
  );
  assert.ok(inserted.every((milestone) => milestone.status === 'pending'));
});

test('rejects a proposal without a title', async () => {
  Project.create = () => {
    throw new Error('Project must not be created without a title');
  };

  const res = responseRecorder();
  await controller.createProject({ body: {}, user: { id: STUDENT_ID } }, res, throwNext);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /title is required/i);
});

test('allows editing a proposal while it is a draft', async () => {
  const project = completeProposal();
  Project.findOne = async () => project;

  const res = responseRecorder();
  await controller.updateProject(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID }, body: { title: 'Updated title' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(project.title, 'Updated title');
});

test('blocks editing once a proposal has been submitted', async () => {
  const project = { ...completeProposal(), status: 'Submitted' };
  Project.findOne = async () => project;

  const res = responseRecorder();
  await controller.updateProject(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID }, body: { title: 'Sneaky edit' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /drafts or proposals returned for revision/i);
});

test('submitting a draft moves the proposal to Submitted', async () => {
  const project = completeProposal();
  Project.findOne = async () => project;

  const res = responseRecorder();
  await controller.submitProposal(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(project.status, 'Submitted');
  assert.ok(project.submittedAt instanceof Date);
  assert.equal(res.body.status, 'Submitted');
});

test('resubmitting a proposal returned for revision moves it to Resubmitted', async () => {
  const project = { ...completeProposal(), status: 'Revision' };
  Project.findOne = async () => project;

  const res = responseRecorder();
  await controller.submitProposal(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(project.status, 'Resubmitted');
});

test('rejects submitting a proposal that is not a draft or revision', async () => {
  const project = { ...completeProposal(), status: 'Approved' };
  Project.findOne = async () => project;

  const res = responseRecorder();
  await controller.submitProposal(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /draft or a proposal returned for revision/i);
});

test('rejects submitting an incomplete proposal', async () => {
  const project = { ...completeProposal(), methodology: '' };
  Project.findOne = async () => project;

  const res = responseRecorder();
  await controller.submitProposal(
    { params: { id: PROJECT_ID }, user: { id: STUDENT_ID } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /title, abstract, problem statement and methodology/i);
  assert.equal(project.status, 'Draft');
});

test('coordinator can start a review, moving Submitted to Under Review', async () => {
  const project = {
    ...completeProposal(),
    status: 'Submitted',
    populate: async function populate() {
      return this;
    },
  };
  Project.findById = async () => project;

  const res = responseRecorder();
  await controller.reviewProposal(
    { params: { id: PROJECT_ID }, body: { action: 'start_review' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(project.status, 'Under Review');
});

test('rejects starting a review on a proposal already under review', async () => {
  const project = {
    ...completeProposal(),
    status: 'Under Review',
    populate: async function populate() {
      return this;
    },
  };
  Project.findById = async () => project;

  const res = responseRecorder();
  await controller.reviewProposal(
    { params: { id: PROJECT_ID }, body: { action: 'start_review' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already under review/i);
});

const reviewCases = [
  ['approve', 'Approved'],
  ['reject', 'Rejected'],
  ['revision', 'Revision'],
];

for (const [action, expectedStatus] of reviewCases) {
  test(`coordinator "${action}" moves a submitted proposal to ${expectedStatus}`, async () => {
    const project = {
      ...completeProposal(),
      status: 'Submitted',
      populate: async function populate() {
        return this;
      },
    };
    Project.findById = async () => project;

    const res = responseRecorder();
    await controller.reviewProposal(
      { params: { id: PROJECT_ID }, body: { action, comment: '  looks good  ' } },
      res,
      throwNext
    );

    assert.equal(res.statusCode, 200);
    assert.equal(project.status, expectedStatus);
    assert.equal(project.coordinatorComment, 'looks good');
  });
}

test('rejects an unknown review action without changing status', async () => {
  const project = {
    ...completeProposal(),
    status: 'Submitted',
    populate: async function populate() {
      return this;
    },
  };
  Project.findById = async () => project;

  const res = responseRecorder();
  await controller.reviewProposal(
    { params: { id: PROJECT_ID }, body: { action: 'approve_ish' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /start_review, approve, reject or revision/i);
  assert.equal(project.status, 'Submitted');
});

test('rejects reviewing a project that is not a submitted proposal', async () => {
  const project = {
    ...completeProposal(),
    status: 'Draft',
    populate: async function populate() {
      return this;
    },
  };
  Project.findById = async () => project;

  const res = responseRecorder();
  await controller.reviewProposal(
    { params: { id: PROJECT_ID }, body: { action: 'approve' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /only submitted proposals can be reviewed/i);
});

test('returns 404 when reviewing a proposal that does not exist', async () => {
  Project.findById = async () => null;

  const res = responseRecorder();
  await controller.reviewProposal(
    { params: { id: PROJECT_ID }, body: { action: 'approve' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 404);
});
