const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Submission = require('../models/Submission');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const controller = require('../controllers/submissionController');

const MILESTONE_ID = '507f1f77bcf86cd799439011';
const PROJECT_ID = '507f1f77bcf86cd799439012';
const SUBMISSION_ID = '507f1f77bcf86cd799439013';
const STUDENT_ID = '507f1f77bcf86cd799439014';
const SUPERVISOR_ID = '507f1f77bcf86cd799439015';

const originals = {
  submissionFindById: Submission.findById,
  submissionCreate: Submission.create,
  submissionFind: Submission.find,
  milestoneFindById: Milestone.findById,
  milestoneFind: Milestone.find,
  projectFindById: Project.findById,
};

afterEach(() => {
  Submission.findById = originals.submissionFindById;
  Submission.create = originals.submissionCreate;
  Submission.find = originals.submissionFind;
  Milestone.findById = originals.milestoneFindById;
  Milestone.find = originals.milestoneFind;
  Project.findById = originals.projectFindById;
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

const stubProgressSync = () => {
  Milestone.find = () => ({ sort: async () => [] });
};

test('rejects a student submitting to a project they do not own', async () => {
  Milestone.findById = async () => ({ _id: MILESTONE_ID, projectId: PROJECT_ID, status: 'pending' });
  Project.findById = async () => ({ _id: PROJECT_ID, students: ['someone-else'] });

  const res = responseRecorder();
  await controller.createSubmission(
    { params: { id: MILESTONE_ID }, user: { _id: STUDENT_ID }, body: {} },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /your own project/);
});

test('rejects a deliverable without a file or GitHub URL', async () => {
  Milestone.findById = async () => ({
    _id: MILESTONE_ID,
    projectId: PROJECT_ID,
    status: 'pending',
    save: async () => {},
  });
  Project.findById = async () => ({ _id: PROJECT_ID, students: [STUDENT_ID] });

  const res = responseRecorder();
  await controller.createSubmission(
    { params: { id: MILESTONE_ID }, user: { _id: STUDENT_ID }, body: { description: 'draft' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Attach a deliverable file or provide a GitHub URL/);
});

test('rejects a resubmission while a deliverable is awaiting review', async () => {
  Milestone.findById = async () => ({ _id: MILESTONE_ID, projectId: PROJECT_ID, status: 'submitted' });
  Project.findById = async () => ({ _id: PROJECT_ID, students: [STUDENT_ID] });

  const res = responseRecorder();
  await controller.createSubmission(
    {
      params: { id: MILESTONE_ID },
      user: { _id: STUDENT_ID },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /awaiting supervisor review/);
});

test('rejects a deliverable while the project is still a proposal', async () => {
  Milestone.findById = async () => ({ _id: MILESTONE_ID, projectId: PROJECT_ID, status: 'pending' });
  Project.findById = async () => ({ _id: PROJECT_ID, students: [STUDENT_ID], status: 'Under Review' });

  const res = responseRecorder();
  await controller.createSubmission(
    {
      params: { id: MILESTONE_ID },
      user: { _id: STUDENT_ID },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /once the project is in progress/);
});

test('stores a submitted deliverable and marks the milestone as submitted', async () => {
  let captured;
  const milestone = {
    _id: MILESTONE_ID,
    projectId: PROJECT_ID,
    status: 'pending',
    save: async () => {},
  };
  Milestone.findById = async () => milestone;
  Project.findById = async () => ({ _id: PROJECT_ID, students: [STUDENT_ID], save: async () => {} });
  Submission.create = async (payload) => {
    captured = payload;
    return { _id: SUBMISSION_ID, ...payload };
  };
  stubProgressSync();

  const res = responseRecorder();
  await controller.createSubmission(
    {
      params: { id: MILESTONE_ID },
      user: { _id: STUDENT_ID },
      body: { githubUrl: 'https://github.com/danilankamo/gradflow', description: 'Initial build' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 201);
  assert.equal(captured.status, 'submitted');
  assert.equal(captured.githubUrl, 'https://github.com/danilankamo/gradflow');
  assert.equal(captured.description, 'Initial build');
  assert.equal(milestone.status, 'submitted');
});

test('rejects a supervisor who is not assigned to the submission project', async () => {
  Submission.findById = async () => ({
    _id: SUBMISSION_ID,
    status: 'submitted',
    milestoneId: MILESTONE_ID,
    projectId: PROJECT_ID,
  });
  Project.findById = async () => ({ _id: PROJECT_ID, supervisorId: 'someone-else' });

  const res = responseRecorder();
  await controller.reviewSubmission(
    { params: { id: SUBMISSION_ID }, user: { _id: SUPERVISOR_ID }, body: { action: 'approve' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /your assigned project/);
});

test('requires feedback when requesting a revision', async () => {
  Submission.findById = async () => ({
    _id: SUBMISSION_ID,
    status: 'submitted',
    milestoneId: MILESTONE_ID,
    projectId: PROJECT_ID,
  });
  Project.findById = async () => ({ _id: PROJECT_ID, supervisorId: SUPERVISOR_ID });

  const res = responseRecorder();
  await controller.reviewSubmission(
    { params: { id: SUBMISSION_ID }, user: { _id: SUPERVISOR_ID }, body: { action: 'revision', feedback: '   ' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Provide feedback/);
});

test('approving a submission stores feedback and timestamps', async () => {
  let savedSubmission;
  const submission = {
    _id: SUBMISSION_ID,
    status: 'submitted',
    milestoneId: MILESTONE_ID,
    projectId: PROJECT_ID,
    feedback: undefined,
    reviewedAt: undefined,
    save: async function save() {
      savedSubmission = this;
    },
  };
  const milestone = { _id: MILESTONE_ID, status: 'submitted', save: async () => {} };
  Submission.findById = async () => submission;
  Project.findById = async () => ({ _id: PROJECT_ID, supervisorId: SUPERVISOR_ID, save: async () => {} });
  Milestone.findById = async () => milestone;
  stubProgressSync();

  const res = responseRecorder();
  await controller.reviewSubmission(
    {
      params: { id: SUBMISSION_ID },
      user: { _id: SUPERVISOR_ID },
      body: { action: 'approve', feedback: 'Great work' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(savedSubmission.status, 'approved');
  assert.equal(savedSubmission.feedback, 'Great work');
  assert.ok(savedSubmission.reviewedAt instanceof Date);
  assert.equal(milestone.status, 'approved');
});

test('rejects reviewing a submission that was already reviewed', async () => {
  Submission.findById = async () => ({
    _id: SUBMISSION_ID,
    status: 'approved',
    milestoneId: MILESTONE_ID,
    projectId: PROJECT_ID,
  });
  Project.findById = async () => ({ _id: PROJECT_ID, supervisorId: SUPERVISOR_ID });

  const res = responseRecorder();
  await controller.reviewSubmission(
    { params: { id: SUBMISSION_ID }, user: { _id: SUPERVISOR_ID }, body: { action: 'revision', feedback: 'redo' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /already been reviewed/);
});

test('rejects listing submissions for a project the user cannot access', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
  });

  const res = responseRecorder();
  await controller.getProjectSubmissions(
    { params: { id: PROJECT_ID }, user: { _id: 'some-other-user', role: 'student' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /cannot access this project/);
});

test('allows the assigned supervisor to list project submissions', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
  });
  Submission.find = () => ({
    populate: () => ({
      sort: async () => [{ _id: SUBMISSION_ID, status: 'submitted' }],
    }),
  });

  const res = responseRecorder();
  await controller.getProjectSubmissions(
    { params: { id: PROJECT_ID }, user: { _id: SUPERVISOR_ID, role: 'supervisor' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 1);
});

