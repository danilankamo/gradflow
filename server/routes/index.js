const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/projects', require('./projects'));
router.use('/', require('./milestones'));
router.use('/defenses', require('./defenses'));
router.use('/', require('./evaluations'));
router.use('/notifications', require('./notifications'));

module.exports = router;
