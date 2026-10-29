const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { syncProjectProgress, getMilestoneSummary } = require('../utils/projectProgress');

const PROJECT_ID = '507f1f77bcf86cd799439012';

const originals = {
  projectFindById: Project.findById,
  milestoneFind: Milestone.find,
};

afterEach(() => {
  Project.findById = originals.projectFindById;
  Milestone.find = originals.milestoneFind;
});

const milestone = (status, dueDate) => ({ status, dueDate });

const stubProject = (status = 'In Progress') => {
  const project = {
    _id: PROJECT_ID,
    status,
    progress: 0,
    saved: false,
    save: async function save() {
      this.saved = true;
      return this;
    },
  };
  Project.findById = async () => project;
  return project;
};

const stubMilestones = (milestones) => {
  Milestone.find = () => ({ sort: async () => milestones });
};

test('progress is 0% when no milestones have been approved', async () => {
  const project = stubProject();
  stubMilestones([milestone('pending'), milestone('submitted')]);

  await syncProjectProgress(PROJECT_ID);

  assert.equal(project.progress, 0);
  assert.equal(project.status, 'In Progress');
  assert.equal(project.saved, true);
});

test('progress rounds the share of approved milestones', async () => {
  const project = stubProject();
  stubMilestones([milestone('approved'), milestone('pending'), milestone('pending')]);

  await syncProjectProgress(PROJECT_ID);

  assert.equal(project.progress, 33);
});

test('completing every milestone moves the project to Final Submission', async () => {
  const project = stubProject();
  stubMilestones([milestone('approved'), milestone('approved')]);

  await syncProjectProgress(PROJECT_ID);

  assert.equal(project.progress, 100);
  assert.equal(project.status, 'Final Submission');
});

test('a fully approved milestone plan does not overwrite a terminal status', async () => {
  const project = stubProject('Evaluated');
  stubMilestones([milestone('approved'), milestone('approved')]);

  await syncProjectProgress(PROJECT_ID);

  assert.equal(project.progress, 100);
  assert.equal(project.status, 'Evaluated');
});

test('a project with no milestones keeps 0% and its current status', async () => {
  const project = stubProject();
  stubMilestones([]);

  await syncProjectProgress(PROJECT_ID);

  assert.equal(project.progress, 0);
  assert.equal(project.status, 'In Progress');
});

test('returns null when the project does not exist', async () => {
  Project.findById = async () => null;
  Milestone.find = () => ({ sort: async () => [] });

  const result = await syncProjectProgress(PROJECT_ID);

  assert.equal(result, null);
});

test('summary reports counts, next deadline and overdue milestones', () => {
  const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const later = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const summary = getMilestoneSummary([
    milestone('approved', later),
    milestone('revision', overdueDate),
    milestone('pending', soon),
    milestone('pending', later),
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.completed, 1);
  assert.equal(summary.progress, 25);
  assert.equal(summary.overdue.length, 1);
  assert.equal(new Date(summary.nextDeadline.dueDate).getTime(), overdueDate.getTime());
});

test('summary handles an empty milestone list safely', () => {
  const summary = getMilestoneSummary([]);

  assert.equal(summary.total, 1);
  assert.equal(summary.completed, 0);
  assert.equal(summary.progress, 0);
  assert.equal(summary.nextDeadline, null);
  assert.deepEqual(summary.overdue, []);
});
