const cron = require('node-cron');
const reminderService = require('../services/reminderService');
const newTournamentNotificationService = require('../services/newTournamentNotificationService');

const scheduledJobs = {};

const jobs = [
    {
        name: 'tournamentReminders',
        schedule: '* * * * *', // Every hour
        task: reminderService.sendTournamentReminders,
        description: 'Sends reminders for tournaments starting soon.'
    },
    {
        name: 'newTournamentNotifications',
        schedule: '* * * * *', // Every minute for testing
        task: newTournamentNotificationService.sendNewTournamentNotifications,
        description: 'Sends notifications for newly created tournaments.'
    }
];

const startJob = (name) => {
    const jobInfo = jobs.find(j => j.name === name);
    if (!jobInfo) {
        console.error(`Job "${name}" not found.`);
        return false;
    }

    if (scheduledJobs[name]) {
        console.log(`Job "${name}" is already running.`);
        return true;
    }

    const cronJob = cron.schedule(jobInfo.schedule, () => {
        console.log(`--- Running job: ${jobInfo.name} ---`);
        jobInfo.task().catch(error => {
            console.error(`Job "${jobInfo.name}" failed:`, error);
        });
    });

    scheduledJobs[name] = cronJob;
    console.log(`Job "${name}" scheduled. Description: ${jobInfo.description}`);
    return true;
};

const stopJob = (name) => {
    if (scheduledJobs[name]) {
        scheduledJobs[name].stop();
        delete scheduledJobs[name];
        console.log(`Job "${name}" stopped.`);
        return true;
    } else {
        console.log(`Job "${name}" is not running.`);
        return false;
    }
};

const initializeSchedulers = () => {
    // Start jobs by default here if needed
    // startJob('tournamentReminders');
    // The new job is off by default, can be started via API
};

module.exports = { initializeSchedulers, startJob, stopJob, jobs };
