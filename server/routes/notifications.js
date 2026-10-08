const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort('-createdAt');
    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
