const Project = require('../models/Project');

const proposalStatuses = ['Submitted', 'Under Review', 'Resubmitted'];

const getProjectAccessFilter = (user) => {
  if (user.role === 'coordinator') return {};
  if (user.role === 'student') return { students: user._id };
  if (user.role === 'supervisor') return { supervisorId: user._id };
  return { _id: null };
};

exports.createProject = async (req, res, next) => {
  try {
    const { title, abstract, problemStatement, objectives, methodology, technologies, category, keywords } = req.body;
    const project = await Project.create({
      title,
      abstract,
      problemStatement,
      objectives,
      methodology,
      technologies,
      category,
      keywords,
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

    if (!['Draft', 'Revision'].includes(project.status)) {
      return res.status(400).json({
        success: false,
        message: 'Proposal editing is only allowed for drafts or proposals returned for revision',
      });
    }

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
    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        project[field] = req.body[field];
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
    const [counts, pendingCount] = await Promise.all([
      Project.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Project.countDocuments({ status: { $in: proposalStatuses } }),
    ]);

    const projectsByStatus = counts.reduce((result, item) => {
      result[item._id] = item.count;
      return result;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalProjects: counts.reduce((total, item) => total + item.count, 0),
        pendingProposals: pendingCount,
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

    if (!['Draft', 'Revision'].includes(project.status)) {
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
