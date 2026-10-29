const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const controller = require('../controllers/projectController');

const originals = {
  findOne: User.findOne,
  findOneAndUpdate: Project.findOneAndUpdate,
  findById: Project.findById,
  find: Project.find,
  notificationInsertMany: Notification.insertMany,
};

afterEach(() => {
  User.findOne = originals.findOne;
  Project.findOneAndUpdate = originals.findOneAndUpdate;
  Project.findById = originals.findById;
  Project.find = originals.find;
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

test('assigns an eligible supervisor to an approved, unassigned project', async () => {
  Notification.insertMany = async () => [];
  const supervisorId = '507f1f77bcf86cd799439011';
  const projectId = '507f1f77bcf86cd799439012';
  let queriedFilter;
  let update;

  User.findOne = async (filter) => {
    assert.deepEqual(filter, { _id: supervisorId, role: 'supervisor' });
    return { _id: supervisorId };
  };
  Project.findOneAndUpdate = (filter, changes, options) => {
    queriedFilter = filter;
    update = { changes, options };
    return {
      populate: () => ({
        populate: async () => ({
          _id: projectId,
          title: 'Capstone',
          supervisorId: { _id: supervisorId, name: 'Dr. Supervisor' },
        }),
      }),
    };
  };

  const res = responseRecorder();
  await controller.assignSupervisor(
    { body: { supervisorId }, params: { id: projectId } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.supervisorId._id, supervisorId);
  assert.equal(queriedFilter._id, projectId);
  assert.ok(
    queriedFilter.$or.some((condition) =>
      condition.status === 'Approved' &&
      condition.$or.some((availability) => availability.supervisorId?.$exists === false)
    )
  );
  assert.equal(update.changes.$set.supervisorId, supervisorId);
  assert.equal(update.changes.$set.status, 'In Progress');
  assert.equal(update.options.new, true);
});

test('rejects a user who is not a supervisor', async () => {
  User.findOne = async () => null;
  Project.findOneAndUpdate = () => {
    throw new Error('Assignment update must not run for a non-supervisor');
  };

  const res = responseRecorder();
  await controller.assignSupervisor(
    {
      body: { supervisorId: '507f1f77bcf86cd799439011' },
      params: { id: '507f1f77bcf86cd799439012' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /not an active supervisor/);
});

test('rejects stale assignments without overwriting ownership', async () => {
  User.findOne = async () => ({ _id: '507f1f77bcf86cd799439011' });
  Project.findOneAndUpdate = () => ({
    populate: () => ({
      populate: async () => null,
    }),
  });
  Project.findById = () => ({
    select: async () => ({
      status: 'In Progress',
      supervisorId: '507f1f77bcf86cd799439013',
    }),
  });

  const res = responseRecorder();
  await controller.assignSupervisor(
    {
      body: { supervisorId: '507f1f77bcf86cd799439011' },
      params: { id: '507f1f77bcf86cd799439012' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /assignment has changed/);
});

test('reassignment uses the expected current supervisor as an atomic guard', async () => {
  Notification.insertMany = async () => [];
  const currentSupervisorId = '507f1f77bcf86cd799439013';
  const nextSupervisorId = '507f1f77bcf86cd799439011';
  let query;
  User.findOne = async () => ({ _id: nextSupervisorId });
  Project.findOneAndUpdate = (filter) => {
    query = filter;
    return {
      populate: () => ({
        populate: async () => ({
          _id: '507f1f77bcf86cd799439012',
          supervisorId: { _id: nextSupervisorId, name: 'New Supervisor' },
        }),
      }),
    };
  };

  const res = responseRecorder();
  await controller.assignSupervisor(
    {
      body: { supervisorId: nextSupervisorId, currentSupervisorId },
      params: { id: '507f1f77bcf86cd799439012' },
    },
    res,
    (error) => {
      throw error;
    }
  );

  assert.ok(query.$or.some((condition) =>
    condition.status === 'In Progress' &&
    condition.supervisorId === currentSupervisorId
  ));
  assert.equal(res.statusCode, 200);
});

test('returns only the authenticated supervisor’s assigned projects', async () => {
  const supervisorId = '507f1f77bcf86cd799439011';
  let filter;
  Project.find = (query) => {
    filter = query;
    return {
      populate: () => ({
        sort: async () => [{ _id: '507f1f77bcf86cd799439012' }],
      }),
    };
  };

  const res = responseRecorder();
  await controller.getAssignedProjects(
    { user: { _id: supervisorId } },
    res,
    (error) => {
      throw error;
    }
  );

  assert.deepEqual(filter, { supervisorId });
  assert.equal(res.body.count, 1);
});

test('an assigned approved project immediately appears in the supervisor workspace', async () => {
  Notification.insertMany = async () => [];
  const supervisorId = '507f1f77bcf86cd799439011';
  const projectId = '507f1f77bcf86cd799439012';
  const project = {
    _id: projectId,
    title: 'Graduation Project',
    status: 'Approved',
    supervisorId: null,
  };
  User.findOne = async () => ({ _id: supervisorId });
  Project.findOneAndUpdate = (filter, changes) => {
    assert.equal(filter._id, projectId);
    project.supervisorId = changes.$set.supervisorId;
    project.status = changes.$set.status;
    return {
      populate: () => ({
        populate: async () => ({
          ...project,
          supervisorId: { _id: supervisorId, name: 'Dr. Supervisor' },
        }),
      }),
    };
  };
  Project.find = (filter) => {
    assert.deepEqual(filter, { supervisorId });
    return {
      populate: () => ({
        sort: async () => [project],
      }),
    };
  };

  const assigned = responseRecorder();
  await controller.assignSupervisor(
    {
      body: { supervisorId },
      params: { id: projectId },
    },
    assigned,
    (error) => {
      throw error;
    }
  );
  assert.equal(assigned.statusCode, 200);
  assert.equal(project.status, 'In Progress');

  const workspace = responseRecorder();
  await controller.getAssignedProjects(
    { user: { _id: supervisorId } },
    workspace,
    (error) => {
      throw error;
    }
  );
  assert.equal(workspace.body.count, 1);
  assert.equal(workspace.body.data[0]._id, projectId);
});
