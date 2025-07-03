const app = require('./src/app');
const config = require('./src/config/environment');
const { initializeSchedulers } = require('./src/jobs/scheduler');

const PORT = config.port;

// Initialize and start the scheduled jobs
initializeSchedulers();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Access filtered tournaments at the /api/tournaments endpoint.');
});
