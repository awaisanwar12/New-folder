const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const emailTrackingService = require('./emailTrackingService');
const { generateNewTournamentEmail } = require('../templates/newTournamentTemplate');

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
        
        // 3. Filter for unique mailinator emails
        const mailinatorEmails = [...new Set(
            allRegistrations
                .map(reg => reg.email)
                .filter(email => email && email.toLowerCase().includes('mailinator'))
        )];

        if (mailinatorEmails.length === 0) {
            console.log('No mailinator users found to notify.');
            return { success: true, message: 'No mailinator users to notify.' };
        }

        console.log(`Found ${mailinatorEmails.length} unique mailinator users to notify.`);

        let totalEmailsSent = 0;
        let emailsSkipped = 0;

        // 4. Send consolidated email for each new tournament
        for (const tournament of recentTournaments) {
            try {
                // Check if new tournament notification already sent for this tournament today
                if (emailTrackingService.hasEmailBeenSent(tournament.tournament_ID, 'new_tournament')) {
                    console.log(`New tournament notification already sent today for: ${tournament.name} (ID: ${tournament.tournament_ID})`);
                    emailsSkipped++;
                    continue;
                }

                console.log(`Preparing notification for new tournament: ${tournament.name}`);
                
                const userList = mailinatorEmails.join('<br>');
                const emailHtml = `
                    <h2>New Tournament Alert - ${tournament.name}</h2>
                    <p><strong>A new tournament has been created!</strong></p>
                    <p><strong>Tournament Details:</strong></p>
                    <ul>
                        <li>Name: ${tournament.name}</li>
                        <li>ID: ${tournament.tournament_ID}</li>
                        <li>Registration Opens: ${tournament.registration_opening_datetime}</li>
                        <li>Registration Closes: ${tournament.registration_closing_datetime}</li>
                    </ul>
                    <p><strong>Mailinator Users to Notify (${mailinatorEmails.length}):</strong></p>
                    <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
                        ${userList}
                    </div>
                    <p><em>This email was sent to the verified address instead of individual mailinator addresses due to AWS SES sandbox limitations.</em></p>
                `;

                await emailService.sendEmail(
                    'noreply@tgcesports.gg',
                    `New Tournament Alert: ${tournament.name} (${mailinatorEmails.length} users)`,
                    emailHtml
                );

                // Mark email as sent to prevent duplicates
                emailTrackingService.markEmailAsSent(tournament.tournament_ID, 'new_tournament', {
                    tournamentName: tournament.name,
                    userCount: mailinatorEmails.length
                });

                totalEmailsSent++;
                console.log(`Sent consolidated new tournament notification to: noreply@tgcesports.gg for ${mailinatorEmails.length} users`);

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
