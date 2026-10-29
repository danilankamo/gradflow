const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Submission = require('../models/Submission');
const Project = require('../models/Project');
const Defense = require('../models/Defense');
const { uploadsDir } = require('../middleware/upload');

router.get('/:filename', protect, async (req, res, next) => {
  try {
    if (!/^[\w-]+\.[a-z0-9]+$/i.test(req.params.filename)) return res.sendStatus(404);
    const submission = await Submission.findOne({ fileUrl: `/uploads/${req.params.filename}` });
    const project = submission && await Project.findById(submission.projectId);
    const user = req.user;
    let allowed = project && (user.role === 'coordinator' ||
      (user.role === 'student' && project.students.some(id => String(id) === String(user._id))) ||
      (user.role === 'supervisor' && String(project.supervisorId) === String(user._id)));
    if (project && user.role === 'examiner') {
      allowed = await Defense.exists({ projectId: project._id, examinerIds: user._id });
    }
    if (!allowed) return res.sendStatus(404);
    res.download(require('path').join(uploadsDir, req.params.filename), error => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) { next(error); }
});

module.exports = router;
