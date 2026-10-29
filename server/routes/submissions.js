const express = require('express');
const {
  createSubmission,
  reviewSubmission,
  getProjectSubmissions,
  getMilestoneSubmissions,
} = require('../controllers/submissionController');
const { upload } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { safeInput } = require('../middleware/security');

const router = express.Router();

router.use(protect);

router.post(
  '/milestones/:id/submissions',
  authorize('student'),
  upload.single('file'),
  safeInput,
  createSubmission
);
router.patch('/submissions/:id/review', authorize('supervisor'), reviewSubmission);
router.get('/projects/:id/submissions', getProjectSubmissions);
router.get('/milestones/:id/submissions', getMilestoneSubmissions);

module.exports = router;
