const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const milestonesRouter = require('../routes/milestones');

const PROJECT_ID = '507f1f77bcf86cd799439011';
const STUDENT_ID = '507f1f77bcf86cd799439012';
const originalFindOne = Project.findOne;

afterEach(() => {
  Project.findOne = originalFindOne;
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

const getProjectMilestonesHandler = () => {
  const route = milestonesRouter.stack.find(
    (layer) =>
      layer.route?.path === '/projects/:id/milestones' &&
      layer.route.methods.get
  );
  return route.route.stack.find((layer) => layer.method === 'get').handle;
};

test('milestone listing scopes student queries to their own projects', async () => {
  Project.findOne = async (filter) => {
    assert.deepEqual(filter, { _id: PROJECT_ID, students: STUDENT_ID });
    return null;
  };

  const res = responseRecorder();
  await getProjectMilestonesHandler()(
    {
      params: { id: PROJECT_ID },
      user: { _id: STUDENT_ID, role: 'student' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /Project not found/i);
});
