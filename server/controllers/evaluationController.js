const mongoose = require('mongoose');
const Defense = require('../models/Defense');
const Project = require('../models/Project');
const Evaluation = require('../models/Evaluation');
const Notification = require('../models/Notification');

/**
 * Calculates total score from configured 5-criteria rubric:
 * - problemUnderstanding: max 20 pts
 * - implementation: max 25 pts
 * - functionality: max 25 pts
 * - documentation: max 15 pts
 * - presentation: max 15 pts
 * Total: 100 points
 */
function calculateRubricTotal(scores = {}) {
  const pU = Math.max(0, Number(scores.problemUnderstanding) || 0);
  const imp = Math.max(0, Number(scores.implementation) || 0);
  const func = Math.max(0, Number(scores.functionality) || 0);
  const doc = Math.max(0, Number(scores.documentation) || 0);
  const pres = Math.max(0, Number(scores.presentation) || 0);

  // If scores exceed rubric weights (e.g., entered on 0-100 percentage scale)
  const isPercentageScale = pU > 20 || imp > 25 || func > 25 || doc > 15 || pres > 15;
  let total;
  if (isPercentageScale) {
    total = (pU * 0.2) + (imp * 0.25) + (func * 0.25) + (doc * 0.15) + (pres * 0.15);
  } else {
    total = pU + imp + func + doc + pres;
  }

  return Math.min(100, Math.max(0, Math.round(total * 10) / 10));
}

exports.calculateRubricTotal = calculateRubricTotal;

/**
 * @desc    Submit or update structured evaluation for a scheduled defense
 * @route   POST /api/defenses/:id/evaluations
 * @access  Private (Examiner only)
 */
exports.submitEvaluation = async (req, res, next) => {
  try {
    const defenseId = req.params.id;

    if (!mongoose.isValidObjectId(defenseId)) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    const defense = await Defense.findById(defenseId).populate('projectId');
    if (!defense) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    if (defense.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot evaluate a cancelled defense schedule',
      });
    }

    // Authorization check: Prevent unauthorized examiners from evaluating other projects (TC-8)
    const examinerIdStr = String(req.user._id || req.user.id);
    const isAssigned = (defense.examinerIds || []).some(
      (id) => String(id._id || id) === examinerIdStr
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Examiner is not authorized to evaluate this project defense',
      });
    }

    const {
      scores = {},
      comments = '',
      manuscriptAmendments = '',
      verdict = 'minor-corrections',
    } = req.body;

    const validatedScores = {
      problemUnderstanding: Math.max(0, Number(scores.problemUnderstanding) || 0),
      implementation: Math.max(0, Number(scores.implementation) || 0),
      functionality: Math.max(0, Number(scores.functionality) || 0),
      documentation: Math.max(0, Number(scores.documentation) || 0),
      presentation: Math.max(0, Number(scores.presentation) || 0),
    };

    const calculatedTotal = calculateRubricTotal(validatedScores);

    const projectId = defense.projectId?._id || defense.projectId;

    let evaluation = await Evaluation.findOne({
      defenseId: defense._id,
      examinerId: req.user._id,
    });

    if (evaluation) {
      // Update existing evaluation
      evaluation.scores = validatedScores;
      evaluation.total = calculatedTotal;
      evaluation.comments = comments;
      evaluation.manuscriptAmendments = manuscriptAmendments;
      evaluation.verdict = verdict;
      evaluation.submittedAt = new Date();
      await evaluation.save();
    } else {
      // Create new evaluation
      evaluation = await Evaluation.create({
        projectId,
        defenseId: defense._id,
        examinerId: req.user._id,
        scores: validatedScores,
        total: calculatedTotal,
        comments,
        manuscriptAmendments,
        verdict,
        submittedAt: new Date(),
      });
    }

    // Transition project status to 'Evaluated' as defined in GradFlow lifecycle (FR-15)
    const project = await Project.findById(projectId);
    if (project && project.status !== 'Completed' && project.status !== 'Archived') {
      project.status = 'Evaluated';
      await project.save();
    }

    // Update defense completion status if all examiners have submitted
    const evaluationCount = await Evaluation.countDocuments({ defenseId: defense._id });
    if (evaluationCount >= defense.examinerIds.length) {
      defense.status = 'completed';
      await defense.save();
    }

    // Generate in-app notifications for candidates and supervisor
    try {
      const notifications = [];
      const studentIds = project?.students || [];
      const examinerName = req.user.name || 'An examiner';

      studentIds.forEach((studentId) => {
        notifications.push({
          userId: studentId,
          type: 'evaluation_submitted',
          title: 'Defense Evaluation Recorded',
          message: `${examinerName} has recorded a defense evaluation for "${project?.title}" with score ${calculatedTotal}/100.`,
          relatedProjectId: projectId,
        });
      });

      if (project?.supervisorId) {
        notifications.push({
          userId: project.supervisorId,
          type: 'evaluation_submitted',
          title: 'Defense Evaluation Recorded',
          message: `${examinerName} has submitted an oral defense evaluation for project "${project?.title}" with score ${calculatedTotal}/100.`,
          relatedProjectId: projectId,
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      // Non-fatal notification failure
    }

    const populated = await Evaluation.findById(evaluation._id).populate(
      'examinerId',
      'name email department skills'
    );

    res.status(201).json({
      success: true,
      message: 'Defense evaluation recorded successfully',
      data: populated || evaluation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get evaluations for a project
 * @route   GET /api/projects/:id/evaluations
 * @access  Private (Authorized users)
 */
exports.getProjectEvaluations = async (req, res, next) => {
  try {
    const projectId = req.params.id;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Role-based authorization check
    const userIdStr = String(req.user._id || req.user.id);
    if (req.user.role === 'coordinator') {
      // Coordinator has access to all project evaluations
    } else if (req.user.role === 'student') {
      const isStudent = (project.students || []).some(
        (id) => String(id._id || id) === userIdStr
      );
      if (!isStudent) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view evaluations for this project',
        });
      }
    } else if (req.user.role === 'supervisor') {
      const isSupervisor = String(project.supervisorId || '') === userIdStr;
      if (!isSupervisor) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view evaluations for this project',
        });
      }
    } else if (req.user.role === 'examiner') {
      const defense = await Defense.findOne({
        projectId: project._id,
        examinerIds: req.user._id,
      });
      if (!defense) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned as an examiner for this project',
        });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized role' });
    }

    const evaluations = await Evaluation.find({ projectId })
      .populate('examinerId', 'name email department skills bio')
      .populate('defenseId', 'date startTime endTime room status')
      .sort({ submittedAt: -1 });

    const totalScores = evaluations.map((e) => e.total);
    const averageScore = totalScores.length > 0
      ? Math.round((totalScores.reduce((acc, curr) => acc + curr, 0) / totalScores.length) * 10) / 10
      : null;

    res.status(200).json({
      success: true,
      count: evaluations.length,
      averageScore,
      data: evaluations,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get evaluations for a defense
 * @route   GET /api/defenses/:id/evaluations
 * @access  Private (Authorized users)
 */
exports.getDefenseEvaluations = async (req, res, next) => {
  try {
    const defenseId = req.params.id;

    if (!mongoose.isValidObjectId(defenseId)) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    const defense = await Defense.findById(defenseId).populate('projectId');
    if (!defense) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    const userIdStr = String(req.user._id || req.user.id);
    if (req.user.role === 'coordinator') {
      // Coordinator access
    } else if (req.user.role === 'student') {
      const isStudent = (defense.projectId?.students || []).some(
        (id) => String(id._id || id) === userIdStr
      );
      if (!isStudent) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else if (req.user.role === 'supervisor') {
      const isSupervisor = String(defense.projectId?.supervisorId || '') === userIdStr;
      if (!isSupervisor) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else if (req.user.role === 'examiner') {
      const isExaminer = (defense.examinerIds || []).some(
        (id) => String(id._id || id) === userIdStr
      );
      if (!isExaminer) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const evaluations = await Evaluation.find({ defenseId })
      .populate('examinerId', 'name email department skills bio')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations,
    });
  } catch (err) {
    next(err);
  }
};
