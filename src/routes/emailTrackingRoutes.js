const express = require('express');
const router = express.Router();
const emailTrackingService = require('../services/emailTrackingService');

/**
 * Get all sent emails (for debugging/monitoring)
 */
router.get('/sent-emails', async (req, res) => {
    try {
        const sentEmails = emailTrackingService.getAllSentEmails();
        res.json({
            success: true,
            count: sentEmails.length,
            emails: sentEmails.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)) // Sort by newest first
        });
    } catch (error) {
        console.error('Error fetching sent emails:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get sent emails summary by date
 */
router.get('/summary', async (req, res) => {
    try {
        const sentEmails = emailTrackingService.getAllSentEmails();
        
        // Group by date and type
        const summary = {};
        sentEmails.forEach(email => {
            const date = email.date;
            if (!summary[date]) {
                summary[date] = { reminder: 0, new_tournament: 0, total: 0 };
            }
            summary[date][email.emailType]++;
            summary[date].total++;
        });

        res.json({
            success: true,
            totalEmails: sentEmails.length,
            summary
        });
    } catch (error) {
        console.error('Error fetching email summary:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Check if specific email was sent
 */
router.get('/check/:tournamentId/:emailType', async (req, res) => {
    try {
        const { tournamentId, emailType } = req.params;
        
        if (!['reminder', 'new_tournament'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type. Must be "reminder" or "new_tournament"' });
        }

        const hasBeenSent = emailTrackingService.hasEmailBeenSent(tournamentId, emailType);
        
        res.json({
            success: true,
            tournamentId,
            emailType,
            hasBeenSent
        });
    } catch (error) {
        console.error('Error checking email status:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Clean up old entries manually
 */
router.post('/cleanup', async (req, res) => {
    try {
        emailTrackingService.cleanupOldEntries();
        const remaining = emailTrackingService.getAllSentEmails();
        
        res.json({
            success: true,
            message: 'Cleanup completed',
            remainingEntries: remaining.length
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Clear all tracking data (DANGER - use carefully!)
 */
router.delete('/clear-all', async (req, res) => {
    try {
        const { confirm } = req.query;
        
        if (confirm !== 'yes') {
            return res.status(400).json({ 
                error: 'Add ?confirm=yes to confirm deletion of all tracking data' 
            });
        }

        emailTrackingService.clearAllTracking();
        
        res.json({
            success: true,
            message: 'All email tracking data cleared'
        });
    } catch (error) {
        console.error('Error clearing tracking data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 