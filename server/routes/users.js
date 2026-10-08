const express = require('express');
const { getMe, updateMe, getUser, getUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/:id', protect, getUser);
router.get('/', protect, authorize('coordinator'), getUsers);

module.exports = router;
