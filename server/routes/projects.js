const express = require('express');
const {
  createProject,
  getMyProjects,
  getProject,
  submitProposal,
  reviewProposal,
  assignSupervisor,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/', authorize('student'), createProject);
router.get('/my', authorize('student'), getMyProjects);
router.get('/:id', getProject);
router.patch('/:id/submit', authorize('student'), submitProposal);
router.patch('/:id/review', authorize('coordinator'), reviewProposal);
router.patch('/:id/supervisor', authorize('coordinator'), assignSupervisor);

module.exports = router;
