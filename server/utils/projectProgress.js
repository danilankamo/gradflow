const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

const TERMINAL_STATUSES = [
  'Final Submission',
  'Defense Scheduled',
  'Evaluated',
  'Completed',
  'Archived',
];

const getMilestoneSummary = (milestones = []) => {
  const safeMilestones = Array.isArray(milestones) ? milestones : [];
  const approvedCount = safeMilestones.filter((milestone) => milestone.status === 'approved').length;
  const total = safeMilestones.length || 1;
  const progress = Math.round((approvedCount / total) * 100);
  const nextDeadline =
    safeMilestones
      .filter((milestone) => milestone.dueDate && milestone.status !== 'approved')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] || null;
  const overdue = safeMilestones.filter((milestone) => {
    if (!milestone.dueDate || milestone.status === 'approved') return false;
    return new Date(milestone.dueDate) < new Date();
  });

  return {
    total,
    completed: approvedCount,
    progress,
    nextDeadline,
    overdue,
  };
};

const syncProjectProgress = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;

  const milestones = await Milestone.find({ projectId }).sort({ order: 1, dueDate: 1 });
  const summary = getMilestoneSummary(milestones);

  project.progress = summary.progress;
  if (
    milestones.length &&
    summary.completed === milestones.length &&
    !TERMINAL_STATUSES.includes(project.status)
  ) {
    project.status = 'Final Submission';
  }

  await project.save();
  return project;
};

module.exports = { syncProjectProgress, getMilestoneSummary, TERMINAL_STATUSES };
