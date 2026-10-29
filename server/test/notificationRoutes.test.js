const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Notification = require('../models/Notification');
const router = require('../routes/notifications');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439012';

const originalMethods = {
  find: Notification.find,
  updateMany: Notification.updateMany,
  findOneAndUpdate: Notification.findOneAndUpdate,
};

afterEach(() => {
  Notification.find = originalMethods.find;
  Notification.updateMany = originalMethods.updateMany;
  Notification.findOneAndUpdate = originalMethods.findOneAndUpdate;
});

const getRouteHandler = (method, path) => {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} route exists`);
  return layer.route.stack[0].handle;
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

test('notification list is scoped to the authenticated user and includes related project details', async () => {
  const notifications = [{ _id: 'notification-1', userId: USER_ID }];
  let filter;
  let populatedPath;
  let selectedFields;

  Notification.find = (query) => {
    filter = query;
    return {
      populate(path, fields) {
        populatedPath = path;
        selectedFields = fields;
        return this;
      },
      sort(order) {
        assert.equal(order, '-createdAt');
        return Promise.resolve(notifications);
      },
    };
  };

  const res = responseRecorder();
  await getRouteHandler('get', '/')({ user: { id: USER_ID } }, res, assert.fail);

  assert.deepEqual(filter, { userId: USER_ID });
  assert.equal(populatedPath, 'relatedProjectId');
  assert.equal(selectedFields, 'title status');
  assert.deepEqual(res.body.data, notifications);
});

test('mark-all-read only updates unread notifications owned by the authenticated user', async () => {
  let updateFilter;
  Notification.updateMany = async (filter, update) => {
    updateFilter = filter;
    assert.deepEqual(update, { isRead: true });
  };
  Notification.find = () => ({
    populate() {
      return this;
    },
    sort() {
      return Promise.resolve([]);
    },
  });

  const res = responseRecorder();
  await getRouteHandler('patch', '/read-all')({ user: { id: USER_ID } }, res, assert.fail);

  assert.deepEqual(updateFilter, { userId: USER_ID, isRead: false });
  assert.equal(res.statusCode, 200);
});

test('mark-read does not expose or update another user notification', async () => {
  let updateFilter;
  Notification.findOneAndUpdate = async (filter) => {
    updateFilter = filter;
    return null;
  };

  const res = responseRecorder();
  await getRouteHandler('patch', '/:id/read')(
    { params: { id: 'notification-1' }, user: { id: USER_ID } },
    res,
    assert.fail
  );

  assert.deepEqual(updateFilter, { _id: 'notification-1', userId: USER_ID });
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});
