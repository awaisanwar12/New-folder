const scheduler = require('../jobs/scheduler');

const getJobsStatus = (req, res) => {
    const status = scheduler.getAllJobStatuses();
    res.json({ success: true, jobs: status });
};

const start = (req, res) => {
    const { name, runImmediately = true } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Job name is required.' });
    }

    const success = scheduler.startJob(name, runImmediately);
    if (success) {
        const message = runImmediately 
            ? `Job "${name}" started and running immediately.`
            : `Job "${name}" scheduled successfully.`;
        res.json({ success: true, message });
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

const runNow = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Job name is required.' });
    }

    try {
        const result = await scheduler.runJobNow(name);
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(400).json({ success: false, message: result.error });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Failed to run job "${name}": ${error.message}` 
        });
    }
};

module.exports = { getJobsStatus, start, stop, runNow };
