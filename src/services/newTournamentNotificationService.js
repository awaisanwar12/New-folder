const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const emailTrackingService = require('./emailTrackingService');
const { generateNewTournamentEmail, getNewTournamentEmailSubject } = require('../templates/newTournamentTemplate');

const sendNewTournamentNotifications = async () => {
    console.log('Starting process to send new tournament notifications...');
    try {
        // Clean up old tracking entries first
        emailTrackingService.cleanupOldEntries();

        // 1. Fetch all tournaments (not just recent ones)
        const allTournaments = await tournamentService.fetchAllTournaments();

        if (allTournaments.length === 0) {
            console.log('No tournaments found. No notifications to send.');
            return { success: true, message: 'No tournaments found.' };
        }

        console.log(`Found ${allTournaments.length} total tournament(s). Checking registration status...`);

        // 2. Filter tournaments to only those with open registration
        const currentTime = new Date();
        console.log(`Current time: ${currentTime.toLocaleString()}`);
        
        const openRegistrationTournaments = allTournaments.filter(tournament => {
            try {
                console.log(`\n--- Checking Tournament: ${tournament.name} (ID: ${tournament.tournament_ID}) ---`);
                
                // First check if registration is enabled
                console.log(`Registration enabled: ${tournament.registration_enabled}`);
                if (!tournament.registration_enabled) {
                    console.log(`❌ Skipping tournament ${tournament.name} - Registration not enabled`);
                    return false;
                }

                // Check if registration dates are provided
                if (!tournament.registration_opening_datetime || !tournament.registration_closing_datetime) {
                    console.log(`❌ Skipping tournament ${tournament.name} - Missing registration dates (Open: ${tournament.registration_opening_datetime}, Close: ${tournament.registration_closing_datetime})`);
                    return false;
                }

                // Parse the dates (format: "3/30/2025 5:17:00 PM")
                const registrationOpen = new Date(tournament.registration_opening_datetime);
                const registrationClose = new Date(tournament.registration_closing_datetime);
                
                console.log(`Registration opens: ${registrationOpen.toLocaleString()} (${tournament.registration_opening_datetime})`);
                console.log(`Registration closes: ${registrationClose.toLocaleString()} (${tournament.registration_closing_datetime})`);
                
                // Check if dates are valid
                if (isNaN(registrationOpen.getTime()) || isNaN(registrationClose.getTime())) {
                    console.log(`❌ Skipping tournament ${tournament.name} - Invalid date format`);
                    return false;
                }
                
                // Check if current time is after registration opening
                const hasRegistrationStarted = currentTime >= registrationOpen;
                console.log(`Has registration started? ${hasRegistrationStarted} (Current: ${currentTime.toLocaleString()} >= Open: ${registrationOpen.toLocaleString()})`);
                
                // Check if current time is before registration closing
                const hasRegistrationNotEnded = currentTime <= registrationClose;
                console.log(`Has registration not ended? ${hasRegistrationNotEnded} (Current: ${currentTime.toLocaleString()} <= Close: ${registrationClose.toLocaleString()})`);
                
                                // Both conditions must be true for registration to be open
                const isRegistrationOpen = hasRegistrationStarted && hasRegistrationNotEnded;
                
                if (isRegistrationOpen) {
                    console.log(`✅ Tournament ${tournament.name} - Registration is OPEN and enabled`);
                    return true;  // ← IMPORTANT: This tells the filter to INCLUDE this tournament
                } else {
                    if (!hasRegistrationStarted) {
                        console.log(`❌ Skipping tournament ${tournament.name} - Registration has not started yet`);
                    } else {
                        console.log(`❌ Skipping tournament ${tournament.name} - Registration has ended`);
                    }
                    return false;  // ← IMPORTANT: This tells the filter to EXCLUDE this tournament
                }
                
            } catch (error) {
                console.error(`❌ Error checking registration status for tournament ${tournament.name}:`, error);
                return false; // Skip tournaments with invalid data
            }
        });

        if (openRegistrationTournaments.length === 0) {
            console.log('No tournaments with open registration found. No notifications to send.');
            return { success: true, message: 'No tournaments with open registration.' };
        }

        console.log(`\n🎯 RESULT: Found ${openRegistrationTournaments.length} tournament(s) with open registration (filtered ${allTournaments.length - openRegistrationTournaments.length} with closed/disabled registration).`);

        // 3. Fetch all registered users
        const allRegistrations = await tournamentService.fetchAllRegistrations();
        
        // 4. Filter for unique @mailinator.com users
        const mailinatorUsers = [...new Map(
            allRegistrations
                .filter(reg => reg.email && reg.email.toLowerCase().endsWith('@mailinator.com'))
                .map(reg => [reg.email, {
                    email: reg.email,
                    name: reg.name || reg.username || 'Gamer',
                    language: reg.language || 'arabic'
                }])
        ).values()];

        if (mailinatorUsers.length === 0) {
            console.log('No @mailinator.com users found to notify.');
            return { success: true, message: 'No @mailinator.com users to notify.' };
        }

        console.log(`Found ${mailinatorUsers.length} unique @mailinator.com users to notify.`);

        let totalEmailsSent = 0;
        let emailsSkipped = 0;

        // 5. Send individual emails to each user for each tournament with open registration
        for (const tournament of openRegistrationTournaments) {
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
                        // Set language to Arabic by default if not already Arabic
                        if (!user.language || user.language.toLowerCase() !== 'arabic') {
                            user.language = 'arabic';
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
