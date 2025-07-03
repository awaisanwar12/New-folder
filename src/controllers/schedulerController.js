const scheduler = require('../jobs/scheduler');

const getJobsStatus = (req, res) => {
    const status = scheduler.jobs.map(job => ({
        name: job.name,
        description: job.description,
        running: scheduler.startJob.toString().includes(job.name) // A simple check
    }));
    res.json({ success: true, jobs: status });
};

const start = (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Job name is required.' });
    }

    const success = scheduler.startJob(name);
    if (success) {
        res.json({ success: true, message: `Job "${name}" started successfully.` });
    } else {
        res.status(404).json({ success: false, message: `Job "${name}" not found.` });
    }
};

const stop = (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Job name is required.' });
    }

    const success = scheduler.stopJob(name);
    if (success) {
        res.json({ success: true, message: `Job "${name}" stopped successfully.` });
    } else {
        res.status(404).json({ success: false, message: `Job "${name}" not found or not running.` });
    }
};

module.exports = { getJobsStatus, start, stop };
