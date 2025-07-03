const tournamentService = require('./tournamentService');
const emailService = require('./emailService');
const { generateReminderEmail } = require('../templates/reminderTemplate');

const sendTournamentReminders = async () => {
    console.log('Starting process to send tournament reminders...');
    try {
        // 1. Fetch all tournaments and filter for those starting soon
        const allTournaments = await tournamentService.fetchAllTournaments();
        const { startingToday } = tournamentService.filterTournaments(allTournaments);

        if (startingToday.length === 0) {
            console.log('No tournaments starting soon. No reminders to send.');
            return { success: true, message: 'No tournaments starting soon.' };
        }

        console.log(`Found ${startingToday.length} tournament(s) starting soon.`);
        let emailsSent = 0;

        // 2. For each tournament, get participants and send emails
        for (const tournament of startingToday) {
            try {
                const participants = await tournamentService.fetchParticipantsByTournamentId(tournament.tournament_ID);
                if (!participants || participants.length === 0) {
                    console.log(`No participants found for tournament: ${tournament.name}`);
                    continue;
                }

                console.log(`Sending ${participants.length} reminders for tournament: ${tournament.name}`);

                // 3. Send email to each participant
                for (const participant of participants) {
                    if (participant.email) {
                        const emailHtml = generateReminderEmail(participant, tournament);
                        await emailService.sendEmail(
                            participant.email,
                            `Reminder: Tournament ${tournament.name} is starting soon!`,
                            emailHtml
                        );
                        emailsSent++;
                    }
                }
            } catch (error) {
                console.error(`Failed to process reminders for tournament ${tournament.name}:`, error.message);
                // Continue to the next tournament even if one fails
            }
        }

        const summary = `Reminder process complete. Total emails sent: ${emailsSent}.`;
        console.log(summary);
        return { success: true, message: summary, emailsSent };

    } catch (error) {
        console.error('An unexpected error occurred during the reminder process:', error);
        throw new Error('Failed to send tournament reminders.');
    }
};

module.exports = { sendTournamentReminders };
