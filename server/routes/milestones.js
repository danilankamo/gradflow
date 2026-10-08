const express = require('express');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/projects/:id/milestones', authorize('supervisor'), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    req.body.projectId = req.params.id;
    const milestone = await Milestone.create(req.body);
    res.status(201).json({ success: true, data: milestone });
  } catch (err) {
    next(err);
  }
});

router.get('/projects/:id/milestones', async (req, res, next) => {
  try {
    const milestones = await Milestone.find({ projectId: req.params.id }).sort('order');
    res.status(200).json({ success: true, count: milestones.length, data: milestones });
  } catch (err) {
    next(err);
  }
});

router.post('/milestones/:id/submissions', authorize('student'), async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    const Submission = require('../models/Submission');
    req.body.milestoneId = req.params.id;
    req.body.projectId = milestone.projectId;
    req.body.studentId = req.user.id;
    const submission = await Submission.create(req.body);
    milestone.status = 'submitted';
    await milestone.save();
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

router.patch('/submissions/:id/review', authorize('supervisor'), async (req, res, next) => {
  try {
    const Submission = require('../models/Submission');
    const Milestone = require('../models/Milestone');
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    const { action, feedback } = req.body;
    if (action === 'approve') {
      submission.status = 'approved';
      submission.reviewedAt = Date.now();
    } else if (action === 'revision') {
      submission.status = 'revision';
      submission.reviewedAt = Date.now();
    }
    if (feedback) submission.feedback = feedback;
    await submission.save();
    const milestone = await Milestone.findById(submission.milestoneId);
    if (milestone) {
      milestone.status = submission.status === 'approved' ? 'approved' : 'revision';
      await milestone.save();
    }
    res.status(200).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
