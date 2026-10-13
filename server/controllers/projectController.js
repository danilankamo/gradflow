const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');

const proposalStatuses = ['Submitted', 'Under Review', 'Resubmitted'];
const editableStatuses = ['Draft', 'Revision'];
const editableFields = [
  'title',
  'abstract',
  'problemStatement',
  'objectives',
  'methodology',
  'technologies',
  'category',
  'keywords',
];

const getProjectAccessFilter = (user) => {
  if (user.role === 'coordinator') return {};
  if (user.role === 'student') return { students: user._id };
  if (user.role === 'supervisor') return { supervisorId: user._id };
  return { _id: null };
};

const normalizeList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : value;

exports.createProject = async (req, res, next) => {
  try {
    const projectData = {};
    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        projectData[field] = ['objectives', 'technologies', 'keywords'].includes(field)
          ? normalizeList(req.body[field])
          : typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
      }
    });

    if (!projectData.title) {
      return res.status(400).json({ success: false, message: 'Project title is required' });
    }

    const project = await Project.create({
      ...projectData,
      students: [req.user.id],
      status: 'Draft',
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

    if (!editableStatuses.includes(project.status)) {
      return res.status(400).json({
        success: false,
        message: 'Proposal editing is only allowed for drafts or proposals returned for revision',
      });
    }

    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = ['objectives', 'technologies', 'keywords'].includes(field)
          ? normalizeList(req.body[field])
          : typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
        project[field] = value;
      }
    });

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

exports.getCoordinatorDashboard = async (req, res, next) => {
  try {
    const counts = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const projectsByStatus = counts.reduce((result, item) => {
      result[item._id] = item.count;
      return result;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalProjects: counts.reduce((total, item) => total + item.count, 0),
        pendingProposals: proposalStatuses.reduce(
          (total, status) => total + (projectsByStatus[status] || 0),
          0
        ),
        projectsByStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProposalsForReview = async (req, res, next) => {
  try {
    const projects = await Project.find({ status: { $in: proposalStatuses } })
      .populate('students', 'name email department studentId')
      .sort({ submittedAt: 1, createdAt: 1 });
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.getProjectsForAssignment = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [
        {
          status: 'Approved',
          $or: [
            { supervisorId: { $exists: false } },
            { supervisorId: null },
          ],
        },
        {
          status: 'In Progress',
          supervisorId: { $exists: true, $ne: null },
        },
      ],
    })
      .populate('students', 'name email department studentId')
      .populate('supervisorId', 'name email department')
      .sort({ updatedAt: 1 });
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.getAssignedProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ supervisorId: req.user._id })
      .populate('students', 'name email department studentId')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ...getProjectAccessFilter(req.user),
    })
      .populate('students', 'name email department studentId')
      .populate('supervisorId', 'name email department');
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

    if (!editableStatuses.includes(project.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only a draft or a proposal returned for revision can be submitted',
      });
    }

    if (!project.title || !project.abstract || !project.problemStatement || !project.methodology) {
      return res.status(400).json({
        success: false,
        message: 'Complete the title, abstract, problem statement and methodology before submitting',
      });
    }

    project.status = project.status === 'Revision' ? 'Resubmitted' : 'Submitted';
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

    if (!proposalStatuses.includes(project.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only submitted proposals can be reviewed',
      });
    }

    const transitions = {
      approve: 'Approved',
      reject: 'Rejected',
      revision: 'Revision',
    };

    if (action === 'start_review') {
      if (project.status === 'Under Review') {
        return res.status(400).json({
          success: false,
          message: 'This proposal is already under review',
        });
      }
      project.status = 'Under Review';
    } else if (Object.prototype.hasOwnProperty.call(transitions, action)) {
      project.status = transitions[action];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action must be start_review, approve, reject or revision',
      });
    }

    project.coordinatorComment = typeof comment === 'string' ? comment.trim() : '';
    await project.save();
    await project.populate('students', 'name email department studentId');
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.assignSupervisor = async (req, res, next) => {
  try {
    const { supervisorId, currentSupervisorId } = req.body;
    if (!mongoose.isValidObjectId(supervisorId)) {
      return res.status(400).json({ success: false, message: 'A valid supervisor is required' });
    }
    if (
      currentSupervisorId !== undefined &&
      !mongoose.isValidObjectId(currentSupervisorId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid current supervisor is required to reassign a project',
      });
    }
    if (currentSupervisorId && String(currentSupervisorId) === String(supervisorId)) {
      return res.status(409).json({
        success: false,
        message: 'This supervisor is already assigned to the project',
      });
    }

    const supervisor = await User.findOne({ _id: supervisorId, role: 'supervisor' });
    if (!supervisor) {
      return res.status(400).json({
        success: false,
        message: 'The selected user is not an active supervisor',
      });
    }

    const eligibleAssignments = [
      {
        status: 'Approved',
        $or: [
          { supervisorId: { $exists: false } },
          { supervisorId: null },
        ],
      },
    ];
    if (currentSupervisorId) {
      eligibleAssignments.push({
        status: 'In Progress',
        supervisorId: currentSupervisorId,
      });
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, $or: eligibleAssignments },
      {
        $set: {
          supervisorId: supervisor._id,
          status: 'In Progress',
        },
      },
      { new: true, runValidators: true }
    )
      .populate('students', 'name email department studentId')
      .populate('supervisorId', 'name email department skills');

    if (!project) {
      const existingProject = await Project.findById(req.params.id).select('status supervisorId');
      if (!existingProject) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      return res.status(409).json({
        success: false,
        message: existingProject.supervisorId
          ? 'The project assignment has changed; refresh the assignment list and try again'
          : 'Only approved, unassigned projects can receive a supervisor',
      });
    }
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};
