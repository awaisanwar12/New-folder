const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

router.get('/status', schedulerController.getJobsStatus);
router.post('/start', schedulerController.start);
router.post('/stop', schedulerController.stop);
router.post('/run-now', schedulerController.runNow);

module.exports = router;
