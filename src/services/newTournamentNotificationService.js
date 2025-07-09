const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const emailTrackingService = require('./emailTrackingService');
const { generateNewTournamentEmail, getNewTournamentEmailSubject } = require('../templates/newTournamentTemplate');

const sendNewTournamentNotifications = async () => {
    try {
        // Clean up old tracking entries first
        emailTrackingService.cleanupOldEntries();

        // 1. Fetch all tournaments (ONCE)
        const allTournaments = await tournamentService.fetchAllTournaments();

        if (allTournaments.length === 0) {
            return { success: true, message: 'No tournaments found.' };
        }

        // 2. Filter tournaments to only those with open registration
        const currentTime = new Date();
        
        const openRegistrationTournaments = allTournaments.filter(tournament => {
            try {
                // Check if registration is enabled
                if (!tournament.registration_enabled) {
                    return false;
                }

                // Check if registration dates are provided
                if (!tournament.registration_opening_datetime || !tournament.registration_closing_datetime) {
                    return false;
                }

                // Parse the dates
                const registrationOpen = new Date(tournament.registration_opening_datetime);
                const registrationClose = new Date(tournament.registration_closing_datetime);
                
                // Check if dates are valid
                if (isNaN(registrationOpen.getTime()) || isNaN(registrationClose.getTime())) {
                    return false;
                }
                
                // Check if registration is currently open
                const hasRegistrationStarted = currentTime >= registrationOpen;
                const hasRegistrationNotEnded = currentTime <= registrationClose;
                const isRegistrationOpen = hasRegistrationStarted && hasRegistrationNotEnded;
                
                return isRegistrationOpen;
                
            } catch (error) {
                return false; // Skip tournaments with invalid data
            }
        });

        if (openRegistrationTournaments.length === 0) {
            return { success: true, message: 'No tournaments with open registration.' };
        }

        console.log(`🎯 Found ${openRegistrationTournaments.length} tournament(s) with open registration`);

        // 3. Fetch all users (ONCE)
        const allUsers = await tournamentService.fetchAllUsers();
        
        // 4. Process users and extract language preference from about field
        const processedUsers = allUsers
            .filter(user => user.emailAddress && user.isActive)
            .map(user => ({
                email: user.emailAddress,
                name: user.name || user.fullName || 'Gamer',
                language: user.about === 'ar' ? 'arabic' : user.about === 'en' ? 'english' : 'arabic' // Default to Arabic if not specified
            }));

        // Remove duplicates based on email
        const uniqueUsers = [...new Map(
            processedUsers.map(user => [user.email, user])
        ).values()];

        if (uniqueUsers.length === 0) {
            return { success: true, message: 'No active users to notify.' };
        }

        console.log(`👥 Found ${uniqueUsers.length} unique active users to notify`);

        let totalEmailsSent = 0;
        let emailsSkipped = 0;

        // 5. Send emails to all users for each tournament
        for (const tournament of openRegistrationTournaments) {
            try {
                // Check if new tournament notification already sent for this tournament today
                if (emailTrackingService.hasEmailBeenSent(tournament.tournament_ID, 'new_tournament')) {
                    emailsSkipped++;
                    continue;
                }

                console.log(`📧 Sending notifications for tournament: ${tournament.name}`);
                
                let tournamentEmailsSent = 0;
                for (const user of uniqueUsers) {
                    try {
                        // Generate personalized email using bilingual template
                        const emailHtml = generateNewTournamentEmail(tournament, user, user.language);
                        const emailSubject = getNewTournamentEmailSubject(user.language, tournament);

                        await emailService.sendEmail(
                            user.email,
                            emailSubject,
                            emailHtml
                        );

                        tournamentEmailsSent++;

                    } catch (error) {
                        // Continue to next user even if one fails
                    }
                }

                // Mark email as sent to prevent duplicates
                emailTrackingService.markEmailAsSent(tournament.tournament_ID, 'new_tournament', {
                    tournamentName: tournament.name,
                    userCount: uniqueUsers.length,
                    emailsSent: tournamentEmailsSent
                });

                totalEmailsSent += tournamentEmailsSent;
                console.log(`✅ Sent ${tournamentEmailsSent} notifications for: ${tournament.name}`);

            } catch (error) {
                // Continue to next tournament even if one fails
            }
        }

        const summary = `Notification process complete. Total emails sent: ${totalEmailsSent}. Emails skipped: ${emailsSkipped}.`;
        console.log(summary);
        return { success: true, message: summary, emailsSent: totalEmailsSent, emailsSkipped };

    } catch (error) {
        throw new Error('Failed to send new tournament notifications.');
    }
};

module.exports = { sendNewTournamentNotifications };
