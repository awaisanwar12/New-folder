const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// Route to manually trigger sending reminders
// Using POST as this is an action that changes state (sends emails)
router.post('/send', reminderController.sendManualReminders);

module.exports = router;
