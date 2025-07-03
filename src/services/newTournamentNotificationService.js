const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const { generateNewTournamentEmail } = require('../templates/newTournamentTemplate');

const sendNewTournamentNotifications = async () => {
    console.log('Starting process to send new tournament notifications...');
    try {
        // 1. Fetch all tournaments and filter for those created recently
        const allTournaments = await tournamentService.fetchAllTournaments();
        const recentTournaments = tournamentService.filterRecentTournaments(allTournaments);

        if (recentTournaments.length === 0) {
            console.log('No recently created tournaments found. No notifications to send.');
            return { success: true, message: 'No new tournaments.' };
        }

        console.log(`Found ${recentTournaments.length} new tournament(s).`);

        // 2. Fetch all registered users
        const allRegistrations = await tournamentService.fetchAllRegistrations();
        
        // 3. Filter for unique @mailinator.com emails
        const emailsToNotify = [...new Set(
            allRegistrations
                .map(reg => reg.email)
                .filter(email => email && email.endsWith('@ofacer.com'))
        )];

        if (emailsToNotify.length === 0) {
            console.log('No mailinator users found to notify.');
            return { success: true, message: 'No mailinator users to notify.' };
        }

        console.log(`Found ${emailsToNotify.length} unique mailinator users to notify.`);

        let totalEmailsSent = 0;

        // 4. Send email for each new tournament to each user
        for (const tournament of recentTournaments) {
            console.log(`Sending notifications for new tournament: ${tournament.name}`);
            const emailHtml = generateNewTournamentEmail(tournament);
            const subject = `New Tournament Alert: ${tournament.name}`;

            for (const email of emailsToNotify) {
                try {
                    await emailService.sendEmail(email, subject, emailHtml);
                    totalEmailsSent++;
                } catch (error) {
                    console.error(`Failed to send new tournament email to ${email}:`, error.message);
                }
            }
        }

        const summary = `New tournament notification process complete. Total emails sent: ${totalEmailsSent}.`;
        console.log(summary);
        return { success: true, message: summary, emailsSent: totalEmailsSent };

    } catch (error) {
        console.error('An unexpected error occurred during the new tournament notification process:', error);
        throw new Error('Failed to send new tournament notifications.');
    }
};

module.exports = { sendNewTournamentNotifications };
