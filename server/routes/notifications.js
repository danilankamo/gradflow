const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('relatedProjectId', 'title status')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('relatedProjectId', 'title status')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
