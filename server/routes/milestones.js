const express = require('express');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');
const { syncProjectProgress } = require('../utils/projectProgress');

const router = express.Router();

router.use(protect);

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

module.exports = router;
