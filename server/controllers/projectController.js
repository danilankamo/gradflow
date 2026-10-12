const Project = require('../models/Project');

const sanitizeProjectInput = (input = {}) => ({
  title: input.title?.trim(),
  abstract: input.abstract?.trim(),
  problemStatement: input.problemStatement?.trim(),
  objectives: Array.isArray(input.objectives)
    ? input.objectives.map((objective) => String(objective).trim()).filter(Boolean)
    : [],
  methodology: input.methodology?.trim(),
  technologies: Array.isArray(input.technologies)
    ? input.technologies.map((technology) => String(technology).trim()).filter(Boolean)
    : [],
  keywords: Array.isArray(input.keywords)
    ? input.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
    : [],
  category: input.category?.trim(),
});

exports.createProject = async (req, res, next) => {
  try {
    const payload = sanitizeProjectInput(req.body);

    if (!payload.title) {
      return res.status(400).json({
        success: false,
        message: 'Project title is required',
      });
    }

    const project = await Project.create({
      ...payload,
      students: [req.user.id],
      status: req.body.status || 'Draft',
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      students: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (['Submitted', 'Under Review', 'Approved', 'Rejected', 'Revision', 'Resubmitted', 'In Progress'].includes(project.status)) {
      return res.status(400).json({
        success: false,
        message: 'This proposal can no longer be edited in its current state',
      });
    }

    const payload = sanitizeProjectInput(req.body);
    if (req.body.status) {
      payload.status = req.body.status;
    }

    Object.assign(project, payload);
    const updatedProject = await project.save();

    res.status(200).json({ success: true, data: updatedProject });
  } catch (err) {
    next(err);
  }
};

exports.getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ students: req.user.id }).sort({ updatedAt: -1 });
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
    const project = await Project.findOne({
      _id: req.params.id,
      students: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!project.title) {
      return res.status(400).json({
        success: false,
        message: 'A project title is required before submitting the proposal',
      });
    }

    project.status = 'Submitted';
    project.submittedAt = new Date();
    await project.save();

    res.status(200).json({
      success: true,
      projectId: project._id,
      status: project.status,
      submittedAt: project.submittedAt,
    });
  } catch (err) {
    next(err);
  }
};

exports.reviewProposal = async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const nextStatusMap = {
      review: 'Under Review',
      approve: 'Approved',
      reject: 'Rejected',
      revision: 'Revision',
      resubmit: 'Resubmitted',
    };

    if (action && nextStatusMap[action]) {
      project.status = nextStatusMap[action];
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
    const project = await Project.findById(req.params.id);
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
