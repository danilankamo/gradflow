const express = require('express');
const {
  createDefense,
  getDefenses,
  getDefense,
  updateDefense,
  cancelDefense,
  getSchedulableProjects,
  getAvailableExaminers,
} = require('../controllers/defenseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/schedulable-projects', authorize('coordinator'), getSchedulableProjects);
router.get('/examiners', authorize('coordinator'), getAvailableExaminers);

const {
  submitEvaluation,
  getDefenseEvaluations,
} = require('../controllers/evaluationController');

router.post('/', authorize('coordinator'), createDefense);
router.get('/', getDefenses);
router.get('/:id', getDefense);
router.put('/:id', authorize('coordinator'), updateDefense);
router.patch('/:id/cancel', authorize('coordinator'), cancelDefense);

router.post('/:id/evaluations', authorize('examiner'), submitEvaluation);
router.get('/:id/evaluations', getDefenseEvaluations);

module.exports = router;
