const express = require('express');
const Defense = require('../models/Defense');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('coordinator'), async (req, res, next) => {
  try {
    const defense = await Defense.create(req.body);
    res.status(201).json({ success: true, data: defense });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const defenses = await Defense.find().populate('projectId examinerIds');
    res.status(200).json({ success: true, count: defenses.length, data: defenses });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/evaluations', authorize('examiner'), async (req, res, next) => {
  try {
    const Evaluation = require('../models/Evaluation');
    req.body.projectId = req.params.projectId;
    req.body.examinerId = req.user.id;
    const scores = req.body.scores || {};
    const total = (scores.implementation + scores.documentation + scores.presentation + scores.problemUnderstanding + scores.functionality) / 5;
    req.body.total = total;
    const evaluation = await Evaluation.create(req.body);
    res.status(201).json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
