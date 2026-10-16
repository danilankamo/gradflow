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

router.post('/', authorize('coordinator'), createDefense);
router.get('/', getDefenses);
router.get('/:id', getDefense);
router.put('/:id', authorize('coordinator'), updateDefense);
router.patch('/:id/cancel', authorize('coordinator'), cancelDefense);

router.post('/:id/evaluations', authorize('examiner'), async (req, res, next) => {
  try {
    const Evaluation = require('../models/Evaluation');
    req.body.projectId = req.params.projectId;
    req.body.examinerId = req.user.id;
    const scores = req.body.scores || {};
    const total =
      (scores.implementation +
        scores.documentation +
        scores.presentation +
        scores.problemUnderstanding +
        scores.functionality) /
      5;
    req.body.total = total;
    const evaluation = await Evaluation.create(req.body);
    res.status(201).json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
