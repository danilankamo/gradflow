const mongoose = require('mongoose');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const Submission = require('../models/Submission');
const Notification = require('../models/Notification');
const { persistFile } = require('../middleware/upload');
const {
  validateSubmissionInput,
  canSubmitToMilestone,
  isValidReviewAction,
  REVIEW_ACTION_STATUS,
} = require('../utils/submissionWorkflow');
const { syncProjectProgress } = require('../utils/projectProgress');
const { isReadOnlyProject } = require('../utils/projectStatus');

const PROPOSAL_STAGE_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Revision',
  'Resubmitted',
];

const canAccessProject = (project, user) => {
  if (!project || !user) return false;
  if (user.role === 'coordinator') return true;
  if (user.role === 'student') {
    return (project.students || []).some((studentId) => String(studentId) === String(user._id));
  }
  if (user.role === 'supervisor') {
    return Boolean(project.supervisorId) && String(project.supervisorId) === String(user._id);
  }
  return false;
};

exports.createSubmission = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const project = await Project.findById(milestone.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (isReadOnlyProject(project)) {
      return res.status(409).json({ success: false, message: 'Completed projects are read-only' });
    }

    const isOwner = (project.students || []).some(
      (studentId) => String(studentId) === String(req.user._id)
    );
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit deliverables for your own project',
      });
    }

    if (PROPOSAL_STAGE_STATUSES.includes(project.status)) {
      return res.status(409).json({
        success: false,
        message: 'Deliverables can be submitted once the project is in progress',
      });
    }

    if (!canSubmitToMilestone(milestone.status)) {
      return res.status(409).json({
        success: false,
        message:
          milestone.status === 'approved'
            ? 'This milestone has already been approved'
            : 'This deliverable is awaiting supervisor review',
      });
    }

    const validation = validateSubmissionInput({
      githubUrl: req.body.githubUrl,
      description: req.body.description,
      hasFile: Boolean(req.file),
    });
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const fileUrl = req.file ? await persistFile(req.file) : undefined;

    const submission = await Submission.create({
      milestoneId: milestone._id,
      projectId: project._id,
      studentId: req.user._id,
      fileUrl,
      fileName: req.file ? req.file.originalname : undefined,
      fileType: req.file ? req.file.mimetype : undefined,
      fileSize: req.file ? req.file.size : undefined,
      githubUrl: validation.githubUrl || undefined,
      description: validation.description || undefined,
      status: 'submitted',
      submittedAt: new Date(),
    });

    milestone.status = 'submitted';
    await milestone.save();
    await syncProjectProgress(project._id);

    if (project.supervisorId) {
      await Notification.create({
        userId: project.supervisorId,
        type: 'milestone_submitted',
        title: 'Milestone Deliverable Submitted',
        message: `Candidate submitted a deliverable for milestone "${milestone.title}" in project "${project.title}".`,
        relatedProjectId: project._id,
      });
    }

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

exports.reviewSubmission = async (req, res, next) => {
  try {
    const { action } = req.body;
    const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';

    if (!isValidReviewAction(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be approve or revision',
      });
    }

    if (action === 'revision' && !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Provide feedback when requesting a revision',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const project = await Project.findById(submission.projectId);
    if (!project || String(project.supervisorId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only review submissions for your assigned project',
      });
    }
    if (isReadOnlyProject(project)) {
      return res.status(409).json({ success: false, message: 'Completed projects are read-only' });
    }

    if (submission.status !== 'submitted') {
      return res.status(409).json({
        success: false,
        message: 'This submission has already been reviewed',
      });
    }

    const nextStatus = REVIEW_ACTION_STATUS[action];
    submission.status = nextStatus;
    submission.feedback = feedback;
    submission.reviewedAt = new Date();
    await submission.save();

    const milestone = await Milestone.findById(submission.milestoneId);
    if (milestone) {
      milestone.status = nextStatus;
      await milestone.save();
    }

    await syncProjectProgress(submission.projectId);

    const milestoneTitle = milestone ? milestone.title : 'Milestone';
    const isApproved = action === 'approve';
    const notifications = (project.students || []).map((studentId) => ({
      userId: studentId,
      type: isApproved ? 'milestone_reviewed' : 'milestone_feedback',
      title: isApproved ? 'Milestone Deliverable Approved' : 'Milestone Revision Requested',
      message: isApproved
        ? `Supervisor approved deliverable for milestone "${milestoneTitle}".`
        : `Supervisor requested revisions on milestone "${milestoneTitle}". Feedback: ${feedback}`,
      relatedProjectId: project._id,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(200).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

exports.getProjectSubmissions = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ success: false, message: 'You cannot access this project' });
    }

    const submissions = await Submission.find({ projectId: project._id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    next(err);
  }
};

exports.getMilestoneSubmissions = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const project = await Project.findById(milestone.projectId);
    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ success: false, message: 'You cannot access this milestone' });
    }

    const submissions = await Submission.find({ milestoneId: milestone._id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    next(err);
  }
};
