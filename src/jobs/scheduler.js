const cron = require('node-cron');
const reminderService = require('../services/reminderService');

// Schedule a cron job to run every hour
const startReminderScheduler = () => {
    // This cron expression means 'at the beginning of every hour'
    cron.schedule('0 * * * *', () => {
        console.log('-------------------------------------');
        console.log('Running scheduled job: Send Tournament Reminders');
        reminderService.sendTournamentReminders().catch(error => {
            console.error('Scheduled reminder job failed:', error);
        });
        console.log('-------------------------------------');
    });

    console.log('Cron job for tournament reminders has been scheduled to run every hour.');
};

module.exports = { startReminderScheduler };
