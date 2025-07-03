const reminderService = require('../services/reminderService');

const sendManualReminders = async (req, res, next) => {
    try {
        console.log('Manual reminder process triggered via API.');
        const result = await reminderService.sendTournamentReminders();
        res.status(200).json({
            success: true,
            message: 'Manual reminder process completed successfully.',
            details: result,
        });
    } catch (error) {
        console.error('API call to send reminders failed:', error);
        next(error); // Pass to the global error handler
    }
};

module.exports = { sendManualReminders };
