const express = require('express');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const Defense = require('../models/Defense');
const { protect, authorize } = require('../middleware/auth');
const { syncProjectProgress } = require('../utils/projectProgress');
const { isReadOnlyProject } = require('../utils/projectStatus');

const router = express.Router();

router.use(protect);

router.post('/projects/:id/milestones', authorize('supervisor'), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (req.user.role === 'supervisor' && String(project.supervisorId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only manage milestones for your assigned project' });
    }
    if (isReadOnlyProject(project)) {
      return res.status(409).json({ success: false, message: 'Completed projects are read-only' });
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
    let projectFilter;
    if (req.user.role === 'coordinator') {
      projectFilter = {};
    } else if (req.user.role === 'student') {
      projectFilter = { students: req.user._id };
    } else if (req.user.role === 'supervisor') {
      projectFilter = { supervisorId: req.user._id };
    } else if (req.user.role === 'examiner') {
      const assignedDefenses = await Defense.find({
        examinerIds: req.user._id,
        projectId: req.params.id,
      }).select('projectId');
      if (assignedDefenses.length === 0) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      projectFilter = { _id: req.params.id };
    } else {
      return res.status(403).json({ success: false, message: 'User role is not authorized to view milestones' });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      ...projectFilter,
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const milestones = await Milestone.find({ projectId: req.params.id }).sort({ order: 1, dueDate: 1 });
    res.status(200).json({ success: true, count: milestones.length, data: milestones });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
