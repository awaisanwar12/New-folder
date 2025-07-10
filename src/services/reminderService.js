const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const emailTrackingService = require('./emailTrackingService');
const { generateReminderEmail, getReminderEmailSubject } = require('../templates/reminderTemplate');

const sendTournamentReminders = async () => {
    console.log('Starting process to send tournament reminders...');
    try {
        // Clean up old tracking entries first
        emailTrackingService.cleanupOldEntries();

        // 1. Fetch all tournaments and filter for those starting in ~8 hours (UTC)
        const allTournaments = await tournamentService.fetchAllTournaments();
        
        // Debug: Check if our specific tournament is in the list
        const targetTournament = allTournaments.find(t => t.name === 'PUBG FFA League Test');
        if (targetTournament) {
            console.log(`🔍 Found "PUBG FFA League Test" in all tournaments list`);
        } else {
            console.log(`❌ "PUBG FFA League Test" NOT found in tournaments list`);
            // Log first few tournament names to see what we have
            console.log(`📋 First 5 tournaments found:`, allTournaments.slice(0, 5).map(t => t.name));
        }
        
        const tournamentsStartingIn8Hours = filterTournamentsStartingIn8Hours(allTournaments);

        if (tournamentsStartingIn8Hours.length === 0) {
            console.log('No tournaments starting in ~8 hours. No reminders to send.');
            return { success: true, message: 'No tournaments starting in ~8 hours.' };
        }

        console.log(`Found ${tournamentsStartingIn8Hours.length} tournament(s) starting in ~8 hours.`);
        let emailsSent = 0;
        let emailsSkipped = 0;
        let participantsFiltered = 0;

        // 2. For each tournament, get participants and send emails
        for (const tournament of tournamentsStartingIn8Hours) {
            try {
                // Debug timing information (UTC only)
                if (!tournament.full_name) {
                    console.error(`Tournament "${tournament.name}" has no full_name field, skipping...`);
                    continue;
                }
                const startDateString = tournament.full_name.split(',')[0];
                const startDate = new Date(startDateString);
                const now = new Date();
                const hoursRemaining = Math.round((startDate - now) / (1000 * 60 * 60) * 10) / 10;
                
                console.log(`\n=== Processing Tournament: ${tournament.name} ===`);
                console.log(`Tournament ID: ${tournament.tournament_ID}`);
                console.log(`Start time (UTC): ${startDate.toISOString()}`);
                console.log(`Current time (UTC): ${now.toISOString()}`);
                console.log(`Hours remaining: ${hoursRemaining}`);

                // Check if reminder already sent for this tournament today
                if (emailTrackingService.hasEmailBeenSent(tournament.tournament_ID, 'reminder')) {
                    console.log(`Reminder already sent today for tournament: ${tournament.name} (ID: ${tournament.tournament_ID})`);
                    emailsSkipped++;
                    continue;
                }

                const participants = await tournamentService.fetchParticipantsByTournamentId(tournament.tournament_ID);
                if (!participants || participants.length === 0) {
                    console.log(`No participants found for tournament: ${tournament.name}`);
                    continue;
                }

                // Map custom_user_identifier to language for email templates
                participants.forEach(participant => {
                    // Map custom_user_identifier ("en"/"ar") to language ("english"/"arabic")
                    if (participant.custom_user_identifier) {
                        switch (participant.custom_user_identifier.toLowerCase()) {
                            case 'ar':
                                participant.language = 'arabic';
                                break;
                            case 'en':
                            default:
                                participant.language = 'english';
                                break;
                        }
                    } else {
                        // Default to English if custom_user_identifier is not set
                        participant.language = 'english';
                    }
                });

                // Filter participants to only those with @mailinator.com email addresses
                const mailinatorParticipants = participants.filter(participant => 
                    participant.email && participant.email.toLowerCase().endsWith('@mailinator.com')
                );

                participantsFiltered += participants.length - mailinatorParticipants.length;

                if (mailinatorParticipants.length === 0) {
                    console.log(`No @mailinator.com participants found for tournament: ${tournament.name}`);
                    continue;
                }

                // Count participants by language for logging
                const languageCount = mailinatorParticipants.reduce((acc, participant) => {
                    acc[participant.language] = (acc[participant.language] || 0) + 1;
                    return acc;
                }, {});

                console.log(`Found ${mailinatorParticipants.length} @mailinator.com participants for tournament: ${tournament.name} (filtered ${participants.length - mailinatorParticipants.length} non-mailinator emails)`);
                console.log(`Language distribution: ${Object.entries(languageCount).map(([lang, count]) => `${lang}: ${count}`).join(', ')}`);

                // 3. Send individual emails to each participant
                let tournamentEmailsSent = 0;
                for (const participant of mailinatorParticipants) {
                    try {
                        // Generate personalized email using English template
                        const emailHtml = generateReminderEmail(participant, tournament);
                        const emailSubject = getReminderEmailSubject(participant.language, tournament);

                        await emailService.sendEmail(
                            participant.email,
                            emailSubject,
                            emailHtml
                        );

                        tournamentEmailsSent++;
                        console.log(`Sent reminder email to: ${participant.email} (${participant.language}) for tournament: ${tournament.name}`);

                    } catch (error) {
                        console.error(`Failed to send email to ${participant.email}:`, error.message);
                        // Continue to next participant even if one fails
                    }
                }

                // Mark email as sent to prevent duplicates
                emailTrackingService.markEmailAsSent(tournament.tournament_ID, 'reminder', {
                    tournamentName: tournament.name,
                    participantCount: mailinatorParticipants.length,
                    emailsSent: tournamentEmailsSent
                });

                emailsSent += tournamentEmailsSent;
                console.log(`Sent ${tournamentEmailsSent} individual reminder emails for tournament: ${tournament.name}`);

            } catch (error) {
                console.error(`Failed to process reminders for tournament ${tournament.name}:`, error.message);
                // Continue to the next tournament even if one fails
            }
        }

        const summary = `Reminder process complete. Total emails sent: ${emailsSent}. Emails skipped (already sent): ${emailsSkipped}. Non-mailinator emails filtered: ${participantsFiltered}.`;
        console.log(summary);
        return { success: true, message: summary, emailsSent, emailsSkipped, participantsFiltered };

    } catch (error) {
        console.error('An unexpected error occurred during the reminder process:', error);
        throw new Error('Failed to send tournament reminders.');
    }
};

// Helper function to filter tournaments starting in approximately 8 hours (UTC)
const filterTournamentsStartingIn8Hours = (tournaments) => {
    const now = new Date();
    const eightHoursFromNow = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 8 hours in milliseconds
    const tolerance = 30 * 60 * 1000; // 30 minutes tolerance in milliseconds

    return tournaments.filter(tournament => {
        try {
            // Debug logging for specific tournament
            if (tournament.name === 'PUBG FFA League Test') {
                console.log(`🔍 DEBUG - Tournament: ${tournament.name}`);
                console.log(`🔍 DEBUG - full_name: "${tournament.full_name}"`);
                console.log(`🔍 DEBUG - full_name type: ${typeof tournament.full_name}`);
                console.log(`🔍 DEBUG - tournament_ID: ${tournament.tournament_ID}`);
            }
            
            // Check if full_name exists and is not null
            if (!tournament.full_name || typeof tournament.full_name !== 'string') {
                if (tournament.name === 'PUBG FFA League Test') {
                    console.log(`🔍 DEBUG - Skipping "${tournament.name}" - invalid full_name`);
                }
                return false;
            }
            
            const startDateString = tournament.full_name.split(',')[0];
            const startDate = new Date(startDateString);
            
            // Check if tournament starts within 30 minutes of 8 hours from now
            const timeDifference = Math.abs(startDate.getTime() - eightHoursFromNow.getTime());
            const isWithinTimeWindow = timeDifference <= tolerance;
            
            // Debug logging for specific tournament
            if (tournament.name === 'PUBG FFA League Test') {
                const hoursFromNow = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                console.log(`🔍 DEBUG - Parsed start date: ${startDate.toISOString()}`);
                console.log(`🔍 DEBUG - Current time: ${now.toISOString()}`);
                console.log(`🔍 DEBUG - Target time (8h from now): ${eightHoursFromNow.toISOString()}`);
                console.log(`🔍 DEBUG - Hours from now: ${hoursFromNow.toFixed(2)}`);
                console.log(`🔍 DEBUG - Time difference from 8h mark: ${(timeDifference / (1000 * 60 * 60)).toFixed(2)} hours`);
                console.log(`🔍 DEBUG - Tolerance: ${(tolerance / (1000 * 60 * 60)).toFixed(2)} hours`);
                console.log(`🔍 DEBUG - Is within time window: ${isWithinTimeWindow}`);
            }
            
            if (isWithinTimeWindow) {
                console.log(`Tournament "${tournament.name}" starts at ${startDate.toISOString()}, which is ~8 hours from now (${eightHoursFromNow.toISOString()})`);
            }
            
            return isWithinTimeWindow;
        } catch (error) {
            console.error(`Error parsing start date for tournament ${tournament.name}:`, error.message);
            return false;
        }
    });
};

module.exports = { sendTournamentReminders };
