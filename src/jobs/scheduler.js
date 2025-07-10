const cron = require('node-cron');
const reminderService = require('../services/reminderService');
const newTournamentNotificationService = require('../services/newTournamentNotificationService');

const scheduledJobs = {};
const runningJobs = new Set(); // Track currently running jobs

const jobs = [
    {
        name: 'tournamentReminders',
        schedule: '0 0 * * * *', // Every hour
        task: reminderService.sendTournamentReminders,
        description: 'Sends reminders for tournaments starting soon.'
    },
    {
        name: 'newTournamentNotifications',
        schedule: '0 */30 * * * *', // Every 30 minutes
        task: newTournamentNotificationService.sendNewTournamentNotifications,
        description: 'Sends notifications for newly created tournaments.'
    }
];

const startJob = (name, runImmediately = true) => {
    const jobInfo = jobs.find(j => j.name === name);
    if (!jobInfo) {
        console.error(`Job "${name}" not found.`);
        return false;
    }

    if (scheduledJobs[name]) {
        console.log(`Job "${name}" is already running.`);
        return true;
    }

    // Helper function to execute the job
    const executeJob = async () => {
        // Check if job is already running
        if (runningJobs.has(jobInfo.name)) {
            console.log(`⚠️ Job "${jobInfo.name}" is already running, skipping this execution.`);
            return;
        }

        console.log(`--- Running job: ${jobInfo.name} ---`);
        
        // Mark job as running
        runningJobs.add(jobInfo.name);
        
        try {
            await jobInfo.task();
            console.log(`✅ Job "${jobInfo.name}" completed successfully`);
        } catch (error) {
            console.error(`🚨 Job "${jobInfo.name}" failed:`, error);
        } finally {
            // Always remove from running jobs when done
            runningJobs.delete(jobInfo.name);
        }
    };

    // Schedule the recurring job
    const cronJob = cron.schedule(jobInfo.schedule, executeJob);

    scheduledJobs[name] = cronJob;
    console.log(`Job "${name}" scheduled. Description: ${jobInfo.description}`);
    
    // Run immediately if requested
    if (runImmediately) {
        console.log(`🚀 Starting job "${name}" immediately...`);
        executeJob().catch(error => {
            console.error(`🚨 Immediate execution of job "${jobInfo.name}" failed:`, error);
        });
    }
    
    return true;
};

const stopJob = (name) => {
    if (scheduledJobs[name]) {
        scheduledJobs[name].stop();
        delete scheduledJobs[name];
        
        // Also remove from running jobs if it was running
        if (runningJobs.has(name)) {
            runningJobs.delete(name);
            console.log(`Job "${name}" stopped (was running).`);
        } else {
            console.log(`Job "${name}" stopped.`);
        }
        return true;
    } else {
        console.log(`Job "${name}" is not running.`);
        return false;
    }
};

// Helper function to check job status
const getJobStatus = (name) => {
    const isScheduled = !!scheduledJobs[name];
    const isRunning = runningJobs.has(name);
    return { isScheduled, isRunning };
};

// Helper function to get all job statuses
const getAllJobStatuses = () => {
    return jobs.map(job => ({
        name: job.name,
        schedule: job.schedule,
        description: job.description,
        ...getJobStatus(job.name)
    }));
};

// Function to run a job immediately without scheduling
const runJobNow = async (name) => {
    const jobInfo = jobs.find(j => j.name === name);
    if (!jobInfo) {
        console.error(`Job "${name}" not found.`);
        return { success: false, error: `Job "${name}" not found.` };
    }

    // Check if job is already running
    if (runningJobs.has(jobInfo.name)) {
        console.log(`⚠️ Job "${jobInfo.name}" is already running, cannot start another instance.`);
        return { success: false, error: `Job "${jobInfo.name}" is already running.` };
    }

    console.log(`🚀 Running job "${jobInfo.name}" immediately...`);
    
    // Mark job as running
    runningJobs.add(jobInfo.name);
    
    try {
        await jobInfo.task();
        console.log(`✅ Job "${jobInfo.name}" completed successfully`);
        return { success: true, message: `Job "${jobInfo.name}" completed successfully` };
    } catch (error) {
        console.error(`🚨 Job "${jobInfo.name}" failed:`, error);
        return { success: false, error: error.message };
    } finally {
        // Always remove from running jobs when done
        runningJobs.delete(jobInfo.name);
    }
};

const initializeSchedulers = () => {
    // Start jobs by default here if needed
    // startJob('tournamentReminders');
    // The new job is off by default, can be started via API
};

module.exports = { 
    initializeSchedulers, 
    startJob, 
    stopJob, 
    runJobNow,
    jobs, 
    getJobStatus, 
    getAllJobStatuses 
};
