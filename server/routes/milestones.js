const express = require('express');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const syncProjectProgress = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const milestones = await Milestone.find({ projectId }).sort({ order: 1, dueDate: 1 });
  const approvedCount = milestones.filter((milestone) => milestone.status === 'approved').length;
  const total = milestones.length || 1;
  project.progress = Math.round((approvedCount / total) * 100);
  if (milestones.length && approvedCount === milestones.length) {
    if (!['Final Submission', 'Defense Scheduled', 'Evaluated', 'Completed', 'Archived'].includes(project.status)) {
      project.status = 'Final Submission';
    }
  }
  await project.save();
  return project;
};

router.post('/projects/:id/milestones', authorize('supervisor'), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (req.user.role === 'supervisor' && String(project.supervisorId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only manage milestones for your assigned project' });
    }
    req.body.projectId = req.params.id;
    const milestone = await Milestone.create({
      ...req.body,
      status: req.body.status || 'pending',
      order: req.body.order ?? (await Milestone.countDocuments({ projectId: req.params.id })) + 1,
    });
    await syncProjectProgress(req.params.id);
    res.status(201).json({ success: true, data: milestone });
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/milestones', async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { students: req.user._id },
        { supervisorId: req.user._id },
        { status: { $in: ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Revision', 'Resubmitted', 'In Progress', 'Final Submission', 'Defense Scheduled', 'Evaluated', 'Completed', 'Archived'] } },
      ],
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const milestones = await Milestone.find({ projectId: req.params.id }).sort({ order: 1, dueDate: 1 });
    res.status(200).json({ success: true, count: milestones.length, data: milestones });
  } catch (err) {
    next(err);
  }
});

router.post('/milestones/:id/submissions', authorize('student'), async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    const project = await Project.findById(milestone.projectId);
    if (!project || !project.students.some((studentId) => String(studentId) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'You can only submit work for your own milestone' });
    }
    const Submission = require('../models/Submission');
    req.body.milestoneId = req.params.id;
    req.body.projectId = milestone.projectId;
    req.body.studentId = req.user.id;
    const submission = await Submission.create(req.body);
    milestone.status = 'submitted';
    await milestone.save();
    await syncProjectProgress(milestone.projectId);
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

router.patch('/submissions/:id/review', authorize('supervisor'), async (req, res, next) => {
  try {
    const Submission = require('../models/Submission');
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    const milestone = await Milestone.findById(submission.milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    const project = await Project.findById(submission.projectId);
    if (!project || String(project.supervisorId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only review milestones for your assigned project' });
    }
    const { action, feedback } = req.body;
    if (action === 'approve') {
      submission.status = 'approved';
      submission.reviewedAt = Date.now();
      milestone.status = 'approved';
    } else if (action === 'revision') {
      submission.status = 'revision';
      submission.reviewedAt = Date.now();
      milestone.status = 'revision';
    } else {
      return res.status(400).json({ success: false, message: 'Action must be approve or revision' });
    }
    if (feedback) submission.feedback = feedback;
    await submission.save();
    await milestone.save();
    await syncProjectProgress(submission.projectId);
    res.status(200).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
