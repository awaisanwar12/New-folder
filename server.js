const app = require('./src/app');
const config = require('./src/config/environment');
const { startReminderScheduler } = require('./src/jobs/scheduler');

const PORT = config.port;

// Start the cron job scheduler
startReminderScheduler();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Access filtered tournaments at the /api/tournaments endpoint.');
});
