const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const emailTrackingService = require('./emailTrackingService');
const { generateNewTournamentEmail, getNewTournamentEmailSubject } = require('../templates/newTournamentTemplate');

const sendNewTournamentNotifications = async () => {
    try {
        // Clean up old tracking entries first
        emailTrackingService.cleanupOldEntries();

        console.log('🏆 Starting tournament notification process...');

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

        // 3. Fetch all users (ONCE) using the optimized method
        const allUsers = await tournamentService.fetchAllUsers();
        
        // 4. Process users and extract language preference from about field
        const processedUsers = allUsers
            .filter(user => user.emailAddress && user.isActive)
            .map(user => {
                // Language processing: 'ar' -> 'arabic', 'en' -> 'english', default to 'arabic'
                let language = 'arabic'; // Default
                if (user.about === 'en') {
                    language = 'english';
                } else if (user.about === 'ar') {
                    language = 'arabic';
                }
                
                return {
                    email: user.emailAddress,
                    name: user.name || user.fullName || 'Gamer',
                    language: language
                };
            });

        // Remove duplicates based on email
        const uniqueUsers = [...new Map(
            processedUsers.map(user => [user.email, user])
        ).values()];

        if (uniqueUsers.length === 0) {
            return { success: true, message: 'No active users to notify.' };
        }

        console.log(`👥 Processing ${uniqueUsers.length} unique active users`);

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

                console.log(`📧 Sending notifications for: ${tournament.name}`);
                
                let tournamentEmailsSent = 0;
                const emailBatch = [];

                // Prepare all emails for this tournament
                for (const user of uniqueUsers) {
                    try {
                        // Generate personalized email using bilingual template
                        const emailHtml = generateNewTournamentEmail(tournament, user, user.language);
                        const emailSubject = getNewTournamentEmailSubject(user.language, tournament);

                        emailBatch.push({
                            to: user.email,
                            subject: emailSubject,
                            html: emailHtml
                        });

                    } catch (error) {
                        console.error(`Failed to prepare email for ${user.email}:`, error.message);
                    }
                }

                // Send emails in batches
                for (const email of emailBatch) {
                    try {
                        await emailService.sendEmail(email.to, email.subject, email.html);
                        tournamentEmailsSent++;
                        
                        // Small delay between emails to avoid overwhelming the email service
                        if (tournamentEmailsSent % 10 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s pause every 10 emails
                        }
                        
                    } catch (error) {
                        console.error(`Failed to send email to ${email.to}:`, error.message);
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
                console.error(`Failed processing tournament ${tournament.name}:`, error.message);
            }
        }

        const summary = `✨ Notification process complete. Total emails sent: ${totalEmailsSent}. Emails skipped: ${emailsSkipped}.`;
        console.log(summary);
        
        return { 
            success: true, 
            message: summary, 
            emailsSent: totalEmailsSent, 
            emailsSkipped: emailsSkipped,
            tournamentsProcessed: openRegistrationTournaments.length,
            usersProcessed: uniqueUsers.length
        };

    } catch (error) {
        console.error('🚨 Tournament notification process failed:', error.message);
        throw new Error(`Failed to send new tournament notifications: ${error.message}`);
    }
};

module.exports = { sendNewTournamentNotifications };
