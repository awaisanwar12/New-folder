const express = require('express');
const tournamentRoutes = require('./routes/tournamentRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const emailTrackingRoutes = require('./routes/emailTrackingRoutes');

// Initialize Express app
const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Welcome Route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to the Tournament API. Visit /api/tournaments to get filtered tournaments.',
    });
});

// API Routes
app.use('/api', tournamentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/email-tracking', emailTrackingRoutes);

// 404 Not Found Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Not Found - The requested endpoint does not exist.',
    });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'An internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error',
    });
});

module.exports = app;
