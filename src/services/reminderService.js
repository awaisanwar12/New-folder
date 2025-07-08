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
        let participantsFiltered = 0;

        // 2. For each tournament, get participants and send emails
        for (const tournament of startingToday) {
            try {
                const participants = await tournamentService.fetchParticipantsByTournamentId(tournament.tournament_ID);
                if (!participants || participants.length === 0) {
                    console.log(`No participants found for tournament: ${tournament.name}`);
                    continue;
                }

                // Filter participants to only those with mailinator email addresses
                const mailinatorParticipants = participants.filter(participant => 
                    participant.email && participant.email.toLowerCase().includes('mailinator')
                );

                participantsFiltered += participants.length - mailinatorParticipants.length;

                if (mailinatorParticipants.length === 0) {
                    console.log(`No mailinator participants found for tournament: ${tournament.name}`);
                    continue;
                }

                console.log(`Found ${mailinatorParticipants.length} mailinator participants for tournament: ${tournament.name} (filtered ${participants.length - mailinatorParticipants.length} non-mailinator emails)`);

                // 3. Send consolidated email to verified address with all participant info
                const participantList = mailinatorParticipants.map(p => `${p.name || 'N/A'} (${p.email})`).join('<br>');
                const emailHtml = `
                    <h2>Tournament Reminder - ${tournament.name}</h2>
                    <p><strong>Tournament starts soon!</strong></p>
                    <p><strong>Tournament Details:</strong></p>
                    <ul>
                        <li>Name: ${tournament.name}</li>
                        <li>ID: ${tournament.tournament_ID}</li>
                    </ul>
                    <p><strong>Mailinator Participants (${mailinatorParticipants.length}):</strong></p>
                    <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
                        ${participantList}
                    </div>
                    <p><em>This email was sent to the verified address instead of individual mailinator addresses due to AWS SES sandbox limitations.</em></p>
                `;

                await emailService.sendEmail(
                    'noreply@tgcesports.gg',
                    `Tournament Reminder: ${tournament.name} (${mailinatorParticipants.length} participants)`,
                    emailHtml
                );
                emailsSent++;
                console.log(`Sent consolidated reminder to: noreply@tgcesports.gg for ${mailinatorParticipants.length} participants`);

            } catch (error) {
                console.error(`Failed to process reminders for tournament ${tournament.name}:`, error.message);
                // Continue to the next tournament even if one fails
            }
        }

        const summary = `Reminder process complete. Total emails sent: ${emailsSent}. Non-mailinator emails filtered: ${participantsFiltered}.`;
        console.log(summary);
        return { success: true, message: summary, emailsSent, participantsFiltered };

    } catch (error) {
        console.error('An unexpected error occurred during the reminder process:', error);
        throw new Error('Failed to send tournament reminders.');
    }
};

module.exports = { sendTournamentReminders };
