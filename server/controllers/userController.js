const User = require('../models/User');
const Project = require('../models/Project');
const mongoose = require('mongoose');

const supervisorFields = ['name', 'email', 'department', 'bio', 'skills'];

const normalizeSkills = (skills) => {
  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill).trim()).filter(Boolean);
  }
  if (typeof skills === 'string') {
    return skills.split(',').map((skill) => skill.trim()).filter(Boolean);
  }
  return null;
};

exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      department: req.body.department,
      bio: req.body.bio,
      skills: req.body.skills,
      studentId: req.body.studentId,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
};

exports.getSupervisors = async (req, res, next) => {
  try {
    const supervisors = await User.find({ role: 'supervisor' })
      .select('name email role department bio skills createdAt')
      .sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: supervisors.length,
      data: supervisors,
    });
  } catch (err) {
    next(err);
  }
};

exports.createSupervisor = async (req, res, next) => {
  try {
    const { name, email, password, department, bio } = req.body;
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and a password of at least 8 characters are required',
      });
    }

    const skills = req.body.skills === undefined ? [] : normalizeSkills(req.body.skills);
    if (!skills) {
      return res.status(400).json({
        success: false,
        message: 'Skills must be provided as a list or comma-separated string',
      });
    }

    const supervisor = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: password,
      department,
      bio,
      skills,
      role: 'supervisor',
    });

    res.status(201).json({
      success: true,
      data: await User.findById(supervisor._id)
        .select('name email role department bio skills createdAt'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSupervisor = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supervisor ID' });
    }

    const supervisor = await User.findOne({
      _id: req.params.id,
      role: 'supervisor',
    });
    if (!supervisor) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }

    for (const field of supervisorFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) continue;

      if (field === 'skills') {
        const skills = normalizeSkills(req.body.skills);
        if (!skills) {
          return res.status(400).json({
            success: false,
            message: 'Skills must be provided as a list or comma-separated string',
          });
        }
        supervisor.skills = skills;
      } else if (field === 'email') {
        if (typeof req.body.email !== 'string' || !req.body.email.trim()) {
          return res.status(400).json({ success: false, message: 'Email is required' });
        }
        supervisor.email = req.body.email.trim().toLowerCase();
      } else if (field === 'name') {
        if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
          return res.status(400).json({ success: false, message: 'Name is required' });
        }
        supervisor.name = req.body.name.trim();
      } else {
        supervisor[field] = req.body[field];
      }
    }

    if (req.body.password !== undefined) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }
      supervisor.passwordHash = req.body.password;
    }

    await supervisor.save();
    res.status(200).json({
      success: true,
      data: await User.findById(supervisor._id)
        .select('name email role department bio skills createdAt'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSupervisor = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid supervisor ID' });
    }

    const supervisor = await User.findOne({
      _id: req.params.id,
      role: 'supervisor',
    });
    if (!supervisor) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }

    const hasAssignedProjects = await Project.exists({ supervisorId: supervisor._id });
    if (hasAssignedProjects) {
      return res.status(409).json({
        success: false,
        message: 'Reassign the supervisor’s projects before deleting this account',
      });
    }

    await supervisor.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
