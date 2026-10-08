const Project = require('../models/Project');

exports.createProject = async (req, res, next) => {
  try {
    req.body.students = [req.user.id];
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ students: req.user.id });
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('students').populate('supervisorId');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.submitProposal = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    project.status = 'Submitted';
    await project.save();
    res.status(200).json({ success: true, projectId: project._id, status: project.status, submittedAt: new Date() });
  } catch (err) {
    next(err);
  }
};

exports.reviewProposal = async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (action === 'approve') {
      project.status = 'Approved';
    } else if (action === 'reject') {
      project.status = 'Rejected';
    } else if (action === 'revision') {
      project.status = 'Revision';
    }
    if (comment) project.coordinatorComment = comment;
    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.assignSupervisor = async (req, res, next) => {
  try {
    const { supervisorId } = req.body;
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    project.supervisorId = supervisorId;
    if (project.status === 'Approved') {
      project.status = 'In Progress';
    }
    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};
