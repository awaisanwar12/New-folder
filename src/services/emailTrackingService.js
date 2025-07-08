const fs = require('fs');
const path = require('path');

const TRACKING_FILE = path.join(__dirname, '../../email-tracking.json');

/**
 * Load email tracking data from file
 */
const loadTrackingData = () => {
    try {
        if (fs.existsSync(TRACKING_FILE)) {
            const data = fs.readFileSync(TRACKING_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading email tracking data:', error);
    }
    return { sentEmails: [] };
};

/**
 * Save email tracking data to file
 */
const saveTrackingData = (data) => {
    try {
        fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving email tracking data:', error);
    }
};

/**
 * Generate unique key for email tracking
 */
const generateEmailKey = (tournamentId, emailType, date = null) => {
    const dateKey = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${tournamentId}-${emailType}-${dateKey}`;
};

/**
 * Check if email has already been sent
 */
const hasEmailBeenSent = (tournamentId, emailType) => {
    const data = loadTrackingData();
    const emailKey = generateEmailKey(tournamentId, emailType);
    
    return data.sentEmails.some(entry => entry.key === emailKey);
};

/**
 * Mark email as sent
 */
const markEmailAsSent = (tournamentId, emailType, additionalInfo = {}) => {
    const data = loadTrackingData();
    const emailKey = generateEmailKey(tournamentId, emailType);
    
    // Check if already exists
    if (!data.sentEmails.some(entry => entry.key === emailKey)) {
        data.sentEmails.push({
            key: emailKey,
            tournamentId,
            emailType,
            sentAt: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            ...additionalInfo
        });
        
        saveTrackingData(data);
        console.log(`Email marked as sent: ${emailKey}`);
    }
};

/**
 * Clean up old tracking entries (older than 7 days)
 */
const cleanupOldEntries = () => {
    const data = loadTrackingData();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const initialCount = data.sentEmails.length;
    data.sentEmails = data.sentEmails.filter(entry => {
        const entryDate = new Date(entry.sentAt);
        return entryDate > sevenDaysAgo;
    });
    
    const removedCount = initialCount - data.sentEmails.length;
    if (removedCount > 0) {
        saveTrackingData(data);
        console.log(`Cleaned up ${removedCount} old email tracking entries`);
    }
};

/**
 * Get all sent emails (for debugging)
 */
const getAllSentEmails = () => {
    return loadTrackingData().sentEmails;
};

/**
 * Clear all tracking data (for testing)
 */
const clearAllTracking = () => {
    saveTrackingData({ sentEmails: [] });
    console.log('All email tracking data cleared');
};

module.exports = {
    hasEmailBeenSent,
    markEmailAsSent,
    cleanupOldEntries,
    getAllSentEmails,
    clearAllTracking
}; 