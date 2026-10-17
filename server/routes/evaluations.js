const express = require('express');
const { protect } = require('../middleware/auth');
const { getProjectEvaluations } = require('../controllers/evaluationController');

const router = express.Router();

router.use(protect);

router.get('/projects/:id/evaluations', getProjectEvaluations);

module.exports = router;
