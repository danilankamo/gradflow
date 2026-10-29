const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Defense = require('../models/Defense');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const controller = require('../controllers/defenseController');

const PROJECT_ID = '507f1f77bcf86cd799439011';
const STUDENT_ID = '507f1f77bcf86cd799439012';
const SUPERVISOR_ID = '507f1f77bcf86cd799439013';
const EXAMINER_ID_1 = '507f1f77bcf86cd799439014';
const EXAMINER_ID_2 = '507f1f77bcf86cd799439015';
const DEFENSE_ID = '507f1f77bcf86cd799439016';

const originals = {
  defenseCreate: Defense.create,
  defenseFind: Defense.find,
  defenseFindById: Defense.findById,
  defenseFindOne: Defense.findOne,
  projectFindById: Project.findById,
  projectFind: Project.find,
  userFind: User.find,
  notificationInsertMany: Notification.insertMany,
};

afterEach(() => {
  Defense.create = originals.defenseCreate;
  Defense.find = originals.defenseFind;
  Defense.findById = originals.defenseFindById;
  Defense.findOne = originals.defenseFindOne;
  Project.findById = originals.projectFindById;
  Project.find = originals.projectFind;
  User.find = originals.userFind;
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

const throwNext = (err) => {
  throw err;
};

const makeQuery = (result) => {
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
      return Promise.resolve(result).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(result).catch(reject);
    },
  };
  return query;
};

test('rejects scheduling defense when required fields are missing', async () => {
  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        // missing date, times, room
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /required/i);
});

test('rejects scheduling defense when start time is after or equal to end time', async () => {
  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '11:00',
        endTime: '10:00',
        room: 'Hall A',
        examinerIds: [EXAMINER_ID_1],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /after start time/i);
});

test('rejects scheduling defense for an incomplete or non-final-submission project', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    status: 'In Progress', // Incomplete!
    title: 'Graduation Management System',
  });

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [EXAMINER_ID_1],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /Only projects in Final Submission status/i);
});

test('rejects assigning the project supervisor as an examiner for the same project', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    status: 'Final Submission',
    supervisorId: SUPERVISOR_ID,
  });

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [SUPERVISOR_ID], // Supervisor passed as examiner!
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /supervisor cannot be assigned as an examiner/i);
});

test('rejects scheduling when assigned user does not have the examiner role', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    status: 'Final Submission',
    supervisorId: SUPERVISOR_ID,
  });

  User.find = async () => []; // No valid examiner users found

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [EXAMINER_ID_1],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /examiner role/i);
});

test('rejects scheduling when project already has an active scheduled defense', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    status: 'Final Submission',
    supervisorId: SUPERVISOR_ID,
  });

  User.find = async () => [{ _id: EXAMINER_ID_1, role: 'examiner' }];

  Defense.findOne = async () => ({
    _id: DEFENSE_ID,
    projectId: PROJECT_ID,
    status: 'scheduled',
  });

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [EXAMINER_ID_1],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /already has an active defense/i);
});

test('rejects scheduling when room conflict is detected on same date and time (TC-7)', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    status: 'Final Submission',
    supervisorId: SUPERVISOR_ID,
  });

  User.find = async () => [{ _id: EXAMINER_ID_1, role: 'examiner' }];
  Defense.findOne = async () => null;

  // Existing defense in Hall A from 09:00 to 10:30
  Defense.find = () =>
    makeQuery([
      {
        _id: '507f1f77bcf86cd799439099',
        date: new Date('2026-10-25'),
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [{ _id: EXAMINER_ID_2, name: 'Dr. Grace Hopper' }],
        status: 'scheduled',
      },
    ]);

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '10:00', // Overlaps with 09:00 - 10:30 in Hall A!
        endTime: '11:30',
        room: 'Hall A',
        examinerIds: [EXAMINER_ID_1],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.conflictType, 'room');
  assert.match(res.body.message, /Room "Hall A" is already booked/i);
});

test('rejects scheduling when examiner conflict is detected on same date and time', async () => {
  Project.findById = async () => ({
    _id: PROJECT_ID,
    status: 'Final Submission',
    supervisorId: SUPERVISOR_ID,
  });

  User.find = async () => [{ _id: EXAMINER_ID_1, role: 'examiner' }];
  Defense.findOne = async () => null;

  // Existing defense where EXAMINER_ID_1 is scheduled from 14:00 to 15:30
  Defense.find = () =>
    makeQuery([
      {
        _id: '507f1f77bcf86cd799439099',
        date: new Date('2026-10-25'),
        startTime: '14:00',
        endTime: '15:30',
        room: 'Lab 3', // Different room
        examinerIds: [{ _id: EXAMINER_ID_1, name: 'Dr. Turing' }],
        status: 'scheduled',
      },
    ]);

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '14:30', // Overlaps!
        endTime: '16:00',
        room: 'Conference Room',
        examinerIds: [EXAMINER_ID_1],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.conflictType, 'examiner');
  assert.match(res.body.message, /Dr\. Turing/i);
});

test('successfully schedules defense, updates project status to Defense Scheduled, and notifies parties', async () => {
  let savedStatus = null;
  const projectDoc = {
    _id: PROJECT_ID,
    title: 'Smart Campus',
    status: 'Final Submission',
    students: [STUDENT_ID],
    supervisorId: SUPERVISOR_ID,
    save: async () => {
      savedStatus = projectDoc.status;
    },
  };

  Project.findById = async () => projectDoc;
  User.find = async () => [
    { _id: EXAMINER_ID_1, role: 'examiner' },
    { _id: EXAMINER_ID_2, role: 'examiner' },
  ];
  Defense.findOne = async () => null;
  Defense.find = () => makeQuery([]); // No conflicting defenses

  let createdPayload = null;
  Defense.create = async (payload) => {
    createdPayload = payload;
    return {
      _id: DEFENSE_ID,
      ...payload,
      populate: async function () {
        return this;
      },
    };
  };

  Defense.findById = () =>
    makeQuery({
      _id: DEFENSE_ID,
      projectId: projectDoc,
      examinerIds: [{ _id: EXAMINER_ID_1, name: 'Examiner 1' }],
      status: 'scheduled',
    });

  let notificationsSaved = [];
  Notification.insertMany = async (notifs) => {
    notificationsSaved = notifs;
    return notifs;
  };

  const res = responseRecorder();
  await controller.createDefense(
    {
      body: {
        projectId: PROJECT_ID,
        date: '2026-10-25',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Hall A',
        examinerIds: [EXAMINER_ID_1, EXAMINER_ID_2],
      },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(savedStatus, 'Defense Scheduled');
  assert.equal(createdPayload.status, 'scheduled');
  assert.equal(createdPayload.room, 'Hall A');
  assert.equal(notificationsSaved.length, 4); // 1 student + 1 supervisor + 2 examiners
});

test('cancelling defense marks status cancelled and reverts project to Final Submission', async () => {
  let defenseStatus = 'scheduled';
  const defenseDoc = {
    _id: DEFENSE_ID,
    projectId: PROJECT_ID,
    status: defenseStatus,
    save: async () => {
      defenseStatus = defenseDoc.status;
    },
  };
  Defense.findById = async () => defenseDoc;

  let projectStatus = 'Defense Scheduled';
  const projectDoc = {
    _id: PROJECT_ID,
    status: projectStatus,
    save: async () => {
      projectStatus = projectDoc.status;
    },
  };
  Project.findById = async () => projectDoc;

  const res = responseRecorder();
  await controller.cancelDefense(
    {
      params: { id: DEFENSE_ID },
      user: { role: 'coordinator' },
    },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 200);
  assert.equal(defenseStatus, 'cancelled');
  assert.equal(projectStatus, 'Final Submission');
});

test('completed defense schedules cannot be edited', async () => {
  Defense.findById = async () => ({
    _id: DEFENSE_ID,
    projectId: PROJECT_ID,
    status: 'completed',
    save: async () => {
      throw new Error('A completed defense should not be changed');
    },
  });
  Project.findById = async () => ({ _id: PROJECT_ID, status: 'Completed' });

  const res = responseRecorder();
  await controller.updateDefense(
    { params: { id: DEFENSE_ID }, body: { room: 'New room' } },
    res,
    throwNext
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /read-only/i);
});
