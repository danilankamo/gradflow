const express = require('express');
const {
  createProject,
  updateProject,
  getMyProjects,
  getProjectArchive,
  getRoleDashboard,
  getCoordinatorDashboard,
  getProposalsForReview,
  getProjectsForAssignment,
  getAssignedProjects,
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
router.get('/archive', getProjectArchive);
router.get('/dashboard', getRoleDashboard);
router.get('/coordinator/dashboard', authorize('coordinator'), getCoordinatorDashboard);
router.get('/coordinator/review', authorize('coordinator'), getProposalsForReview);
router.get('/coordinator/assignments', authorize('coordinator'), getProjectsForAssignment);
router.get('/supervisor/assigned', authorize('supervisor'), getAssignedProjects);
router.put('/:id', authorize('student'), updateProject);
router.get('/:id', getProject);
router.patch('/:id/submit', authorize('student'), submitProposal);
router.patch('/:id/review', authorize('coordinator'), reviewProposal);
router.patch('/:id/supervisor', authorize('coordinator'), assignSupervisor);

module.exports = router;
