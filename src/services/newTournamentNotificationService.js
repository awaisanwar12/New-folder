const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const emailTrackingService = require('./emailTrackingService');
const { generateNewTournamentEmail, getNewTournamentEmailSubject } = require('../templates/newTournamentTemplate');

const sendNewTournamentNotifications = async () => {
    console.log('Starting process to send new tournament notifications...');
    try {
        // Clean up old tracking entries first
        emailTrackingService.cleanupOldEntries();

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
        
        // 3. Filter for unique @mailinator.com users
        const mailinatorUsers = [...new Map(
            allRegistrations
                .filter(reg => reg.email && reg.email.toLowerCase().endsWith('@mailinator.com'))
                .map(reg => [reg.email, {
                    email: reg.email,
                    name: reg.name || reg.username || 'Gamer',
                    language: reg.language || 'english'
                }])
        ).values()];

        if (mailinatorUsers.length === 0) {
            console.log('No @mailinator.com users found to notify.');
            return { success: true, message: 'No @mailinator.com users to notify.' };
        }

        console.log(`Found ${mailinatorUsers.length} unique @mailinator.com users to notify.`);

        let totalEmailsSent = 0;
        let emailsSkipped = 0;

        // 4. Send individual emails to each user for each new tournament
        for (const tournament of recentTournaments) {
            try {
                // Check if new tournament notification already sent for this tournament today
                if (emailTrackingService.hasEmailBeenSent(tournament.tournament_ID, 'new_tournament')) {
                    console.log(`New tournament notification already sent today for: ${tournament.name} (ID: ${tournament.tournament_ID})`);
                    emailsSkipped++;
                    continue;
                }

                console.log(`Preparing notification for new tournament: ${tournament.name}`);
                
                let tournamentEmailsSent = 0;
                for (const user of mailinatorUsers) {
                    try {
                        // Set language to English by default if not already English
                        if (!user.language || user.language.toLowerCase() !== 'english') {
                            user.language = 'english';
                        }

                        // Generate personalized email using bilingual template
                        const emailHtml = generateNewTournamentEmail(tournament, user, user.language);
                        const emailSubject = getNewTournamentEmailSubject(user.language, tournament);

                        await emailService.sendEmail(
                            user.email,
                            emailSubject,
                            emailHtml
                        );

                        tournamentEmailsSent++;
                        console.log(`Sent new tournament notification to: ${user.email} for tournament: ${tournament.name}`);

                    } catch (error) {
                        console.error(`Failed to send email to ${user.email}:`, error.message);
                        // Continue to next user even if one fails
                    }
                }

                // Mark email as sent to prevent duplicates
                emailTrackingService.markEmailAsSent(tournament.tournament_ID, 'new_tournament', {
                    tournamentName: tournament.name,
                    userCount: mailinatorUsers.length,
                    emailsSent: tournamentEmailsSent
                });

                totalEmailsSent += tournamentEmailsSent;
                console.log(`Sent ${tournamentEmailsSent} individual new tournament notifications for: ${tournament.name}`);

            } catch (error) {
                console.error(`Failed to send new tournament email for ${tournament.name}:`, error.message);
            }
        }

        const summary = `New tournament notification process complete. Total emails sent: ${totalEmailsSent}. Emails skipped (already sent): ${emailsSkipped}.`;
        console.log(summary);
        return { success: true, message: summary, emailsSent: totalEmailsSent, emailsSkipped };

    } catch (error) {
        console.error('An unexpected error occurred during the new tournament notification process:', error);
        throw new Error('Failed to send new tournament notifications.');
    }
};

module.exports = { sendNewTournamentNotifications };
