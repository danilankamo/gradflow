const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { getMilestoneSummary, syncProjectProgress } = require('../utils/projectProgress');
const { evaluateProjectHealth } = require('../utils/projectHealth');
const Defense = require('../models/Defense');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const { READ_ONLY_PROJECT_STATUSES, isReadOnlyProject } = require('../utils/projectStatus');

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
const defaultMilestoneSequence = [
  'Requirements',
  'System Design',
  'Implementation',
  'Testing',
  'Final Report',
  'Defense',
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

const getProjectMilestoneMap = async (projectIds = []) => {
  if (!projectIds.length || mongoose.connection.readyState === 0) {
    return {};
  }

  const Milestone = require('../models/Milestone');
  const milestoneLookup = await Milestone.find({ projectId: { $in: projectIds } }).sort({ projectId: 1, order: 1 });
  return milestoneLookup.reduce((map, milestone) => {
    const projectId = String(milestone.projectId);
    if (!map[projectId]) map[projectId] = [];
    map[projectId].push(milestone);
    return map;
  }, {});
};

const createDefaultMilestones = async (projectId) => {
  const Milestone = require('../models/Milestone');
  const existing = await Milestone.countDocuments({ projectId });
  if (existing > 0) return []; 

  const milestones = defaultMilestoneSequence.map((title, index) => ({
    projectId,
    title,
    description: `${title} milestone for the project lifecycle.`,
    order: index + 1,
    dueDate: new Date(Date.now() + (index + 1) * 14 * 24 * 60 * 60 * 1000),
    status: 'pending',
  }));

  return Milestone.insertMany(milestones);
};

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
      progress: 0,
    });
    await createDefaultMilestones(project._id);
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

exports.getProjectArchive = async (req, res, next) => {
  try {
    const user = req.user;
    if (!['student', 'supervisor', 'coordinator', 'examiner'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'User role is not authorized to view the archive' });
    }

    const projectFilter = { status: { $in: READ_ONLY_PROJECT_STATUSES } };
    if (user.role === 'student') {
      projectFilter.students = user._id;
    } else if (user.role === 'supervisor') {
      projectFilter.supervisorId = user._id;
    } else if (user.role === 'examiner') {
      const completedDefenses = await Defense.find({
        examinerIds: user._id,
        status: 'completed',
      }).select('projectId');
      projectFilter._id = { $in: completedDefenses.map((defense) => defense.projectId) };
    }

    const projects = await Project.find(projectFilter)
      .populate('students', 'name department studentId')
      .populate('supervisorId', 'name department')
      .sort({ updatedAt: -1 });
    const projectIds = projects.map((project) => project._id);
    if (projectIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const [evaluations, submissions, defenses] = await Promise.all([
      Evaluation.find({ projectId: { $in: projectIds } })
        .select('projectId total submittedAt')
        .sort({ submittedAt: -1 }),
      Submission.find({ projectId: { $in: projectIds } })
        .select('projectId githubUrl fileUrl fileName submittedAt')
        .sort({ submittedAt: -1 }),
      Defense.find({ projectId: { $in: projectIds }, status: 'completed' })
        .select('projectId date room updatedAt')
        .sort({ updatedAt: -1 }),
    ]);

    const evaluationsByProject = new Map();
    evaluations.forEach((evaluation) => {
      const projectId = String(evaluation.projectId);
      if (!evaluationsByProject.has(projectId)) evaluationsByProject.set(projectId, []);
      evaluationsByProject.get(projectId).push(evaluation);
    });
    const submissionsByProject = new Map();
    submissions.forEach((submission) => {
      const projectId = String(submission.projectId);
      if (!submissionsByProject.has(projectId)) submissionsByProject.set(projectId, []);
      submissionsByProject.get(projectId).push(submission);
    });
    const defenseByProject = new Map();
    defenses.forEach((defense) => {
      const projectId = String(defense.projectId);
      if (!defenseByProject.has(projectId)) defenseByProject.set(projectId, defense);
    });

    const data = projects.map((project) => {
      const key = String(project._id);
      const projectEvaluations = evaluationsByProject.get(key) || [];
      const projectSubmissions = submissionsByProject.get(key) || [];
      const defense = defenseByProject.get(key);
      const score = projectEvaluations.length
        ? Math.round(
          (projectEvaluations.reduce((total, evaluation) => total + evaluation.total, 0) /
            projectEvaluations.length) *
            10
        ) / 10
        : null;

      return {
        _id: project._id,
        title: project.title,
        abstract: project.abstract || '',
        technologies: project.technologies || [],
        status: project.status,
        students: project.students || [],
        department: project.students?.[0]?.department || project.supervisorId?.department || '',
        supervisor: project.supervisorId || null,
        score,
        completionDate: defense?.updatedAt || defense?.date || project.updatedAt,
        defense: defense ? { date: defense.date, room: defense.room } : null,
        links: projectSubmissions.flatMap((submission) => [
          ...(submission.githubUrl
            ? [{ label: 'Source repository', type: 'Repository', url: submission.githubUrl }]
            : []),
          ...(submission.fileUrl
            ? [{
              label: submission.fileName || 'Submitted deliverable',
              type: 'Deliverable',
              url: submission.fileUrl,
            }]
            : []),
        ]),
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
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

exports.getRoleDashboard = async (req, res, next) => {
  try {
    const role = req.user.role;
    if (!['student', 'supervisor', 'coordinator', 'examiner'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized role for dashboard access' });
    }

    if (role === 'examiner') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const defenses = await Defense.find({ examinerIds: req.user._id })
        .populate('projectId', 'title status')
        .sort({ date: 1, startTime: 1 });
      const evaluations = defenses.length
        ? await Evaluation.find({
          defenseId: { $in: defenses.map((defense) => defense._id) },
          examinerId: req.user._id,
        })
        : [];
      const evaluatedDefenseIds = new Set(evaluations.map((evaluation) => String(evaluation.defenseId)));
      const pendingDefenses = defenses.filter(
        (defense) => defense.status !== 'cancelled' && !evaluatedDefenseIds.has(String(defense._id))
      );
      return res.status(200).json({
        success: true,
        data: {
          role,
          defenses,
          stats: {
            assignedDefenses: defenses.filter((defense) => defense.status !== 'cancelled').length,
            upcomingDefenses: defenses.filter((defense) =>
              defense.status === 'scheduled' && new Date(defense.date) >= startOfToday
            ).length,
            pendingEvaluations: pendingDefenses.length,
          },
        },
      });
    }

    const projectFilter = role === 'student'
      ? { students: req.user._id }
      : role === 'supervisor'
        ? { supervisorId: req.user._id }
        : {};
    let projectQuery = Project.find(projectFilter)
      .populate('students', 'name department studentId')
      .sort({ updatedAt: -1 });
    if (role !== 'coordinator') {
      projectQuery = projectQuery.populate('supervisorId', 'name department');
    }
    const projects = await projectQuery;
    const projectIds = projects.map((project) => project._id);
    const Milestone = require('../models/Milestone');
    const [milestones, submissions] = projectIds.length
      ? await Promise.all([
        Milestone.find({ projectId: { $in: projectIds } }).sort({ projectId: 1, order: 1 }),
        Submission.find({ projectId: { $in: projectIds } })
          .select('projectId status feedback updatedAt submittedAt')
          .sort({ updatedAt: -1 }),
      ])
      : [[], []];

    const milestonesByProject = new Map();
    milestones.forEach((milestone) => {
      const key = String(milestone.projectId);
      milestonesByProject.set(key, [...(milestonesByProject.get(key) || []), milestone]);
    });
    const submissionsByProject = new Map();
    submissions.forEach((submission) => {
      const key = String(submission.projectId);
      submissionsByProject.set(key, [...(submissionsByProject.get(key) || []), submission]);
    });
    const enrichedProjects = projects.map((project) => {
      const projectData = project && typeof project.toObject === 'function' ? project.toObject() : { ...project };
      const projectMilestones = milestonesByProject.get(String(projectData._id)) || [];
      const projectSubmissions = submissionsByProject.get(String(projectData._id)) || [];
      const health = evaluateProjectHealth(projectData, projectMilestones, projectSubmissions);
      const overdueMilestoneDetails = projectMilestones
        .filter((milestone) =>
          milestone.status !== 'approved' && milestone.dueDate && new Date(milestone.dueDate) < new Date()
        )
        .map((milestone) => ({ title: milestone.title, dueDate: milestone.dueDate }));
      return {
        ...projectData,
        progress: health.progress,
        health,
        overdueMilestoneDetails,
        milestoneSummary: {
          total: health.totalMilestones,
          completed: health.completedMilestones,
          nextDeadline: health.nextDeadline,
          overdue: health.overdueMilestones,
        },
        latestFeedback: projectSubmissions.find((submission) => submission.feedback)?.feedback || '',
        pendingReviews: projectSubmissions.filter((submission) => submission.status === 'submitted').length,
      };
    });

    const healthCounts = enrichedProjects.reduce((counts, project) => {
      counts[project.health.status] += 1;
      return counts;
    }, { Healthy: 0, 'At Risk': 0, Delayed: 0 });

    if (role === 'coordinator') {
      const projectsByStatus = enrichedProjects.reduce((counts, project) => {
        counts[project.status] = (counts[project.status] || 0) + 1;
        return counts;
      }, {});
      const supervisors = await User.find({ role: 'supervisor' }).select('name department');
      const workloadById = enrichedProjects.reduce((counts, project) => {
        const supervisorId = project.supervisorId?._id || project.supervisorId;
        if (supervisorId) {
          const key = String(supervisorId);
          counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
      }, {});
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const upcomingDefenses = await Defense.find({
          status: 'scheduled',
          date: { $gte: startOfToday },
      })
        .populate('projectId', 'title')
        .populate('examinerIds', 'name')
        .sort({ date: 1, startTime: 1 })
        .limit(5);

      return res.status(200).json({
        success: true,
        data: {
          role,
          projects: enrichedProjects,
          projectsByStatus,
          totalProjects: enrichedProjects.length,
          pendingProposals: proposalStatuses.reduce(
            (total, status) => total + (projectsByStatus[status] || 0),
            0
          ),
          supervisorWorkload: supervisors.map((supervisor) => ({
            _id: supervisor._id,
            name: supervisor.name,
            department: supervisor.department,
            projectCount: workloadById[String(supervisor._id)] || 0,
          })).sort((a, b) => b.projectCount - a.projectCount),
          upcomingDefenses,
          healthCounts,
          healthProjects: enrichedProjects
            .filter((project) => project.health.status !== 'Healthy')
            .sort((a, b) => {
              const priority = { Delayed: 0, 'At Risk': 1 };
              return priority[a.health.status] - priority[b.health.status];
            })
            .slice(0, 5),
        },
      });
    }

    if (role === 'student') {
      return res.status(200).json({
        success: true,
        data: {
          role,
          projects: enrichedProjects,
          stats: {
            projects: enrichedProjects.length,
            notifications: 0,
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        role,
        projects: enrichedProjects,
        stats: {
          assignedProjects: enrichedProjects.length,
          pendingReviews: enrichedProjects.reduce((total, project) => total + project.pendingReviews, 0),
          overdueMilestones: enrichedProjects.reduce(
            (total, project) => total + project.health.overdueMilestones,
            0
          ),
          atRiskProjects: healthCounts['At Risk'],
          delayedProjects: healthCounts.Delayed,
        },
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

    const projectIds = projects.map((project) => project._id);
    let milestoneMap = {};
    try {
      milestoneMap = await getProjectMilestoneMap(projectIds);
    } catch (milestoneError) {
      milestoneMap = {};
    }

    const enrichedProjects = projects.map((project) => {
      const projectData = project && typeof project.toObject === 'function' ? project.toObject() : project;
      const summary = getMilestoneSummary(milestoneMap[String(projectData._id)] || []);
      return {
        ...projectData,
        progress: summary.progress,
        milestoneSummary: {
          total: summary.total,
          completed: summary.completed,
          nextDeadline: summary.nextDeadline ? summary.nextDeadline.dueDate : null,
          overdue: summary.overdue.length,
        },
      };
    });

    res.status(200).json({ success: true, count: enrichedProjects.length, data: enrichedProjects });
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

    let milestones = [];
    try {
      milestones = await require('../models/Milestone').find({ projectId: project._id }).sort({ order: 1, dueDate: 1 });
    } catch (milestoneError) {
      milestones = [];
    }
    const summary = getMilestoneSummary(milestones);
    project._doc.milestoneSummary = {
      total: summary.total,
      completed: summary.completed,
      nextDeadline: summary.nextDeadline ? summary.nextDeadline.dueDate : null,
      overdue: summary.overdue.length,
    };
    project._doc.progress = summary.progress;

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

exports.getProjectMilestones = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ...getProjectAccessFilter(req.user),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const Milestone = require('../models/Milestone');
    const milestones = await Milestone.find({ projectId: req.params.id }).sort({ order: 1, dueDate: 1 });
    const summary = getMilestoneSummary(milestones);

    res.status(200).json({
      success: true,
      data: {
        project: {
          _id: project._id,
          title: project.title,
          status: project.status,
          progress: project.progress,
        },
        summary,
        milestones,
      },
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

    const notifConfigs = {
      approve: {
        title: 'Proposal Approved',
        message: `Coordinator approved proposal "${project.title}".`,
      },
      reject: {
        title: 'Proposal Rejected',
        message: `Coordinator rejected proposal "${project.title}".${project.coordinatorComment ? ' Reason: ' + project.coordinatorComment : ''}`,
      },
      revision: {
        title: 'Proposal Revision Requested',
        message: `Coordinator requested revisions on proposal "${project.title}".${project.coordinatorComment ? ' Feedback: ' + project.coordinatorComment : ''}`,
      },
    };
    const config = notifConfigs[action];
    if (config) {
      const notifications = (project.students || []).map((student) => ({
        userId: student._id || student,
        type: 'proposal_decision',
        title: config.title,
        message: config.message,
        relatedProjectId: project._id,
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

exports.createProjectMilestone = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ...getProjectAccessFilter(req.user),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (isReadOnlyProject(project)) {
      return res.status(409).json({ success: false, message: 'Completed projects are read-only' });
    }

    const Milestone = require('../models/Milestone');
    const { title, description, dueDate, order } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Milestone title is required' });
    }

    const milestone = await Milestone.create({
      projectId: req.params.id,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      order: order ?? (await Milestone.countDocuments({ projectId: req.params.id })) + 1,
      status: 'pending',
    });

    await syncProjectProgress(req.params.id);
    res.status(201).json({ success: true, data: milestone });
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
    const notifications = [];
    (project.students || []).forEach((student) => {
      notifications.push({
        userId: student._id || student,
        type: 'supervisor_assigned',
        title: 'Supervisor Assigned',
        message: `Coordinator assigned ${supervisor.name} as faculty supervisor for project "${project.title}".`,
        relatedProjectId: project._id,
      });
    });
    notifications.push({
      userId: supervisor._id,
      type: 'supervisor_assigned',
      title: 'Assigned as Faculty Supervisor',
      message: `You have been assigned as supervisor for project "${project.title}".`,
      relatedProjectId: project._id,
    });
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};
