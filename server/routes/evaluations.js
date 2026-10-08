const express = require('express');
const Evaluation = require('../models/Evaluation');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/projects/:id/evaluations', async (req, res, next) => {
  try {
    const evaluations = await Evaluation.find({ projectId: req.params.id });
    res.status(200).json({ success: true, count: evaluations.length, data: evaluations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
