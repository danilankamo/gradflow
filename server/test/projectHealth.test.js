const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateProjectHealth } = require('../utils/projectHealth');

const NOW = new Date('2026-10-29T09:00:00Z');
const recentProject = { progress: 0, updatedAt: new Date('2026-10-28T09:00:00Z') };

test('marks projects with no overdue work, recent activity and distant deadlines healthy', () => {
  const health = evaluateProjectHealth(
    recentProject,
    [{ status: 'pending', dueDate: new Date('2026-11-20T09:00:00Z') }],
    [],
    NOW
  );

  assert.equal(health.status, 'Healthy');
  assert.equal(health.progress, 0);
  assert.equal(health.overdueMilestones, 0);
});

test('marks a project delayed when any unfinished milestone is overdue', () => {
  const health = evaluateProjectHealth(
    recentProject,
    [{ status: 'revision', dueDate: new Date('2026-10-28T09:00:00Z') }],
    [],
    NOW
  );

  assert.equal(health.status, 'Delayed');
  assert.equal(health.overdueMilestones, 1);
});

test('marks an inactive project at risk after fourteen days without activity', () => {
  const health = evaluateProjectHealth(
    { updatedAt: new Date('2026-10-14T08:59:59Z') },
    [],
    [],
    NOW
  );

  assert.equal(health.status, 'At Risk');
  assert.equal(health.daysSinceActivity, 15);
});

test('marks a low-progress project at risk when its next milestone is due within fourteen days', () => {
  const health = evaluateProjectHealth(
    recentProject,
    [{ status: 'pending', dueDate: new Date('2026-11-10T09:00:00Z') }],
    [],
    NOW
  );

  assert.equal(health.status, 'At Risk');
  assert.equal(health.progress, 0);
});

test('does not mark a fully completed project at risk because it has no upcoming milestone', () => {
  const health = evaluateProjectHealth(
    recentProject,
    [{ status: 'approved', dueDate: new Date('2026-10-20T09:00:00Z') }],
    [],
    NOW
  );

  assert.equal(health.status, 'Healthy');
  assert.equal(health.progress, 100);
  assert.equal(health.nextDeadline, null);
});

test('completed and archived projects remain healthy regardless of stale or unfinished milestone dates', () => {
  const health = evaluateProjectHealth(
    { status: 'Archived' },
    [{ status: 'pending', dueDate: new Date('2026-10-20T09:00:00Z') }],
    [],
    NOW
  );

  assert.equal(health.status, 'Healthy');
  assert.equal(health.progress, 100);
  assert.equal(health.overdueMilestones, 0);
});
