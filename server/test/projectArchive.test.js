const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Defense = require('../models/Defense');
const Evaluation = require('../models/Evaluation');
const Submission = require('../models/Submission');
const controller = require('../controllers/projectController');

const STUDENT_ID = '507f1f77bcf86cd799439011';
const SUPERVISOR_ID = '507f1f77bcf86cd799439012';
const EXAMINER_ID = '507f1f77bcf86cd799439013';
const PROJECT_ID = '507f1f77bcf86cd799439014';

const originals = {
  projectFind: Project.find,
  defenseFind: Defense.find,
  evaluationFind: Evaluation.find,
  submissionFind: Submission.find,
};

afterEach(() => {
  Project.find = originals.projectFind;
  Defense.find = originals.defenseFind;
  Evaluation.find = originals.evaluationFind;
  Submission.find = originals.submissionFind;
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

const query = (value) => {
  const result = {
    populate() {
      return result;
    },
    select() {
      return result;
    },
    sort() {
      return result;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return result;
};

test('coordinator archive includes completed project details, average score, and submission links', async () => {
  const project = {
    _id: PROJECT_ID,
    title: 'Accessible Campus Navigator',
    abstract: 'A navigation tool for accessible routes.',
    technologies: ['React', 'Maps'],
    status: 'Completed',
    students: [{ name: 'Alex Student', department: 'Computing', studentId: 'S-100' }],
    supervisorId: { name: 'Dr. Mentor', department: 'Computing' },
    updatedAt: new Date('2026-10-25T10:00:00Z'),
  };
  let projectFilter;
  Project.find = (filter) => {
    projectFilter = filter;
    return query([project]);
  };
  Evaluation.find = () => query([{ projectId: PROJECT_ID, total: 92 }, { projectId: PROJECT_ID, total: 84 }]);
  Submission.find = () => query([
    {
      projectId: PROJECT_ID,
      githubUrl: 'https://github.com/example/campus-navigator',
      fileUrl: 'https://files.example/final-report.pdf',
      fileName: 'final-report.pdf',
    },
  ]);
  Defense.find = () => query([
    { projectId: PROJECT_ID, date: new Date('2026-10-20T09:00:00Z'), room: 'Hall A' },
  ]);

  const res = responseRecorder();
  await controller.getProjectArchive(
    { user: { _id: '507f1f77bcf86cd799439015', role: 'coordinator' } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.deepEqual(projectFilter, { status: { $in: ['Completed', 'Archived'] } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.data[0].department, 'Computing');
  assert.equal(res.body.data[0].score, 88);
  assert.equal(res.body.data[0].supervisor.name, 'Dr. Mentor');
  assert.equal(res.body.data[0].links.length, 2);
  assert.equal(res.body.data[0].links[1].label, 'final-report.pdf');
});

test('archive results are scoped to the current student, supervisor, or examiner assignment', async () => {
  const projects = [{ _id: PROJECT_ID, status: 'Archived', students: [], technologies: [] }];
  const projectFilters = [];
  const defenseFilters = [];
  Project.find = (filter) => {
    projectFilters.push(filter);
    return query(projects);
  };
  Defense.find = (filter) => {
    defenseFilters.push(filter);
    return query([{ projectId: PROJECT_ID }]);
  };
  Evaluation.find = () => query([]);
  Submission.find = () => query([]);

  for (const [role, userId] of [['student', STUDENT_ID], ['supervisor', SUPERVISOR_ID], ['examiner', EXAMINER_ID]]) {
    const res = responseRecorder();
    await controller.getProjectArchive({ user: { _id: userId, role } }, res, (error) => {
      throw error;
    });
    assert.equal(res.statusCode, 200);
  }

  assert.deepEqual(projectFilters[0], {
    status: { $in: ['Completed', 'Archived'] },
    students: STUDENT_ID,
  });
  assert.deepEqual(projectFilters[1], {
    status: { $in: ['Completed', 'Archived'] },
    supervisorId: SUPERVISOR_ID,
  });
  assert.ok(defenseFilters.some((filter) =>
    filter.examinerIds === EXAMINER_ID && filter.status === 'completed'
  ));
  assert.deepEqual(projectFilters[2], {
    status: { $in: ['Completed', 'Archived'] },
    _id: { $in: [PROJECT_ID] },
  });
});
