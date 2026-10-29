const mongoose = require('mongoose');
const Defense = require('../models/Defense');
const Notification = require('../models/Notification');
const Project = require('../models/Project');
const User = require('../models/User');
const { detectDefenseConflicts, isTimeIntervalValid } = require('../utils/defenseConflict');

exports.createDefense = async (req, res, next) => {
  try {
    const { projectId, examinerIds, date, startTime, endTime, room } = req.body;

    if (!projectId || !date || !startTime || !endTime || !room) {
      return res.status(400).json({
        success: false,
        message: 'Project, date, start time, end time, and room are required to schedule a defense',
      });
    }

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format' });
    }

    const intervalCheck = isTimeIntervalValid(startTime, endTime);
    if (!intervalCheck.valid) {
      return res.status(400).json({ success: false, message: intervalCheck.message });
    }

    if (!Array.isArray(examinerIds) || examinerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one examiner must be assigned to the defense panel',
      });
    }

    const uniqueExaminerIds = [...new Set(examinerIds.map((id) => String(id).trim()))];
    for (const examinerId of uniqueExaminerIds) {
      if (!mongoose.isValidObjectId(examinerId)) {
        return res.status(400).json({ success: false, message: 'Invalid examiner ID format' });
      }
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status !== 'Final Submission') {
      return res.status(409).json({
        success: false,
        message: `Only projects in Final Submission status can be scheduled for defense. Current status is "${project.status}".`,
      });
    }

    if (project.supervisorId && uniqueExaminerIds.includes(String(project.supervisorId))) {
      return res.status(400).json({
        success: false,
        message: 'The project supervisor cannot be assigned as an examiner for the same project',
      });
    }

    const validExaminers = await User.find({
      _id: { $in: uniqueExaminerIds },
      role: 'examiner',
    });

    if (validExaminers.length !== uniqueExaminerIds.length) {
      return res.status(400).json({
        success: false,
        message: 'All assigned examiners must be active users with the examiner role',
      });
    }

    const existingProjectDefense = await Defense.findOne({
      projectId: project._id,
      status: 'scheduled',
    });
    if (existingProjectDefense) {
      return res.status(409).json({
        success: false,
        message: 'This project already has an active defense scheduled',
      });
    }

    const existingDefenses = await Defense.find({ status: 'scheduled' }).populate(
      'examinerIds',
      'name email'
    );

    const conflict = detectDefenseConflicts(
      {
        projectId: project._id,
        examinerIds: uniqueExaminerIds,
        date,
        startTime,
        endTime,
        room,
      },
      existingDefenses
    );

    if (conflict.conflict) {
      return res.status(409).json({
        success: false,
        conflictType: conflict.type,
        message: conflict.message,
      });
    }

    const defense = await Defense.create({
      projectId: project._id,
      examinerIds: uniqueExaminerIds,
      date: new Date(date),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      room: room.trim(),
      status: 'scheduled',
    });

    project.status = 'Defense Scheduled';
    await project.save();

    const formattedDate = new Date(date).toLocaleDateString();
    const notifications = [];

    (project.students || []).forEach((studentId) => {
      notifications.push({
        userId: studentId,
        type: 'defense_scheduled',
        title: 'Defense Scheduled',
        message: `Your project defense has been scheduled on ${formattedDate} (${startTime} - ${endTime}) in ${room}.`,
        relatedProjectId: project._id,
      });
    });

    if (project.supervisorId) {
      notifications.push({
        userId: project.supervisorId,
        type: 'defense_scheduled',
        title: 'Defense Scheduled',
        message: `Defense for project "${project.title}" has been scheduled on ${formattedDate} in ${room}.`,
        relatedProjectId: project._id,
      });
    }

    uniqueExaminerIds.forEach((examinerId) => {
      notifications.push({
        userId: examinerId,
        type: 'defense_assigned',
        title: 'Defense Panel Assignment',
        message: `You have been assigned as an examiner for project "${project.title}" on ${formattedDate} in ${room}.`,
        relatedProjectId: project._id,
      });
    });

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    const populated = await Defense.findById(defense._id)
      .populate({
        path: 'projectId',
        select: 'title status category students supervisorId progress',
        populate: [
          { path: 'students', select: 'name email department studentId' },
          { path: 'supervisorId', select: 'name email department skills' },
        ],
      })
      .populate('examinerIds', 'name email department skills bio');

    res.status(201).json({ success: true, data: populated || defense });
  } catch (err) {
    next(err);
  }
};

exports.getDefenses = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'coordinator') {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.projectId) filter.projectId = req.query.projectId;
    } else if (req.user.role === 'student') {
      const studentProjects = await Project.find({ students: req.user._id }).select('_id');
      const projectIds = studentProjects.map((p) => p._id);
      filter.projectId = { $in: projectIds };
    } else if (req.user.role === 'supervisor') {
      const supervisedProjects = await Project.find({ supervisorId: req.user._id }).select('_id');
      const projectIds = supervisedProjects.map((p) => p._id);
      filter.projectId = { $in: projectIds };
    } else if (req.user.role === 'examiner') {
      filter.examinerIds = req.user._id;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized role for defense access' });
    }

    const defenses = await Defense.find(filter)
      .populate({
        path: 'projectId',
        select: 'title status category students supervisorId progress abstract problemStatement methodology',
        populate: [
          { path: 'students', select: 'name email department studentId' },
          { path: 'supervisorId', select: 'name email department skills' },
        ],
      })
      .populate('examinerIds', 'name email department skills bio')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({ success: true, count: defenses.length, data: defenses });
  } catch (err) {
    next(err);
  }
};

exports.getDefense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    const defense = await Defense.findById(req.params.id)
      .populate({
        path: 'projectId',
        select: 'title status category students supervisorId progress abstract problemStatement methodology',
        populate: [
          { path: 'students', select: 'name email department studentId' },
          { path: 'supervisorId', select: 'name email department skills' },
        ],
      })
      .populate('examinerIds', 'name email department skills bio');

    if (!defense) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    // Role-based authorization
    if (req.user.role === 'coordinator') {
      // Allowed
    } else if (req.user.role === 'student') {
      const isStudent = (defense.projectId?.students || []).some(
        (s) => String(s._id || s) === String(req.user._id)
      );
      if (!isStudent) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view this defense' });
      }
    } else if (req.user.role === 'supervisor') {
      const isSupervisor =
        defense.projectId?.supervisorId &&
        String(defense.projectId.supervisorId._id || defense.projectId.supervisorId) === String(req.user._id);
      if (!isSupervisor) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view this defense' });
      }
    } else if (req.user.role === 'examiner') {
      const isExaminer = (defense.examinerIds || []).some(
        (e) => String(e._id || e) === String(req.user._id)
      );
      if (!isExaminer) {
        return res.status(403).json({ success: false, message: 'You are not assigned as an examiner for this defense' });
      }
    }

    res.status(200).json({ success: true, data: defense });
  } catch (err) {
    next(err);
  }
};

exports.updateDefense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    const defense = await Defense.findById(req.params.id);
    if (!defense) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    if (defense.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a cancelled defense schedule',
      });
    }

    const date = req.body.date ? new Date(req.body.date) : defense.date;
    const startTime = req.body.startTime ? req.body.startTime.trim() : defense.startTime;
    const endTime = req.body.endTime ? req.body.endTime.trim() : defense.endTime;
    const room = req.body.room ? req.body.room.trim() : defense.room;
    let examinerIds = defense.examinerIds;

    const intervalCheck = isTimeIntervalValid(startTime, endTime);
    if (!intervalCheck.valid) {
      return res.status(400).json({ success: false, message: intervalCheck.message });
    }

    if (req.body.examinerIds) {
      if (!Array.isArray(req.body.examinerIds) || req.body.examinerIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one examiner must be assigned',
        });
      }
      const uniqueExaminers = [...new Set(req.body.examinerIds.map((id) => String(id).trim()))];
      const validExaminers = await User.find({
        _id: { $in: uniqueExaminers },
        role: 'examiner',
      });
      if (validExaminers.length !== uniqueExaminers.length) {
        return res.status(400).json({
          success: false,
          message: 'All assigned examiners must be active users with the examiner role',
        });
      }
      examinerIds = uniqueExaminers;
    }

    const existingDefenses = await Defense.find({
      _id: { $ne: defense._id },
      status: 'scheduled',
    }).populate('examinerIds', 'name email');

    const conflict = detectDefenseConflicts(
      {
        _id: defense._id,
        projectId: defense.projectId,
        examinerIds,
        date,
        startTime,
        endTime,
        room,
      },
      existingDefenses
    );

    if (conflict.conflict) {
      return res.status(409).json({
        success: false,
        conflictType: conflict.type,
        message: conflict.message,
      });
    }

    defense.date = date;
    defense.startTime = startTime;
    defense.endTime = endTime;
    defense.room = room;
    defense.examinerIds = examinerIds;
    await defense.save();

    const populated = await Defense.findById(defense._id)
      .populate({
        path: 'projectId',
        select: 'title status category students supervisorId progress',
        populate: [
          { path: 'students', select: 'name email department studentId' },
          { path: 'supervisorId', select: 'name email department skills' },
        ],
      })
      .populate('examinerIds', 'name email department skills bio');

    res.status(200).json({ success: true, data: populated || defense });
  } catch (err) {
    next(err);
  }
};

exports.cancelDefense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    const defense = await Defense.findById(req.params.id);
    if (!defense) {
      return res.status(404).json({ success: false, message: 'Defense not found' });
    }

    if (defense.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Defense is already cancelled',
      });
    }

    defense.status = 'cancelled';
    await defense.save();

    // Revert project status back to 'Final Submission' so it can be rescheduled
    const project = await Project.findById(defense.projectId);
    if (project && project.status === 'Defense Scheduled') {
      project.status = 'Final Submission';
      await project.save();
    }

    res.status(200).json({
      success: true,
      message: 'Defense cancelled successfully',
      data: defense,
    });
  } catch (err) {
    next(err);
  }
};

exports.getSchedulableProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      status: 'Final Submission',
    })
      .populate('students', 'name email department studentId')
      .populate('supervisorId', 'name email department skills')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

exports.getAvailableExaminers = async (req, res, next) => {
  try {
    const examiners = await User.find({ role: 'examiner' })
      .select('name email department skills bio createdAt')
      .sort({ name: 1 });

    res.status(200).json({ success: true, count: examiners.length, data: examiners });
  } catch (err) {
    next(err);
  }
};
