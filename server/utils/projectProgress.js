const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

const TERMINAL_STATUSES = [
  'Final Submission',
  'Defense Scheduled',
  'Evaluated',
  'Completed',
  'Archived',
];

const syncProjectProgress = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;

  const milestones = await Milestone.find({ projectId }).sort({ order: 1, dueDate: 1 });
  const approvedCount = milestones.filter((milestone) => milestone.status === 'approved').length;
  const total = milestones.length || 1;

  project.progress = Math.round((approvedCount / total) * 100);
  if (
    milestones.length &&
    approvedCount === milestones.length &&
    !TERMINAL_STATUSES.includes(project.status)
  ) {
    project.status = 'Final Submission';
  }

  await project.save();
  return project;
};

module.exports = { syncProjectProgress, TERMINAL_STATUSES };
