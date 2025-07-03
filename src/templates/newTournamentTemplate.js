const { format } = require('date-fns');

const generateNewTournamentEmail = (tournament) => {
    let formattedDateTime = 'Date not available';
    try {
        console.log('--- Debugging Date in newTournamentTemplate ---');
        console.log('1. Raw full_name:', tournament.full_name);
        
        const startDateString = tournament.full_name.split(',')[0];
        console.log('2. Extracted Start Date String:', startDateString);

        const startDate = new Date(startDateString);
        console.log('3. Parsed Date Object:', startDate.toString());
        console.log('4. Tournament Timezone:', tournament.timezone);

        const formattedDate = format(startDate, 'eeee, MMMM do, yyyy');
        const formattedTime = format(startDate, 'h:mm a');
        formattedDateTime = `${formattedDate} at ${formattedTime} (${tournament.timezone || 'Timezone not specified'})`;
        console.log('5. Final Formatted String:', formattedDateTime);
        console.log('--- End Debugging ---');

    } catch (error) {
        console.error(`Could not format date for tournament ${tournament.name}:`, error);
    }

    return `
        <h1>A New Tournament Has Been Created!</h1>
        <p>Hi there,</p>
        <p>A new tournament, <strong>${tournament.name}</strong>, has just been created and is now open for registration!</p>
        <h2>Tournament Details:</h2>
        <ul>
            <li><strong>Name:</strong> ${tournament.name}</li>
            <li><strong>Discipline:</strong> ${tournament.disciplineName}</li>
            <li><strong>Starts:</strong> ${formattedDateTime}</li>
        </ul>
        <p>Visit our website to learn more and register today!</p>
        <p>Thanks,</p>
        <p>The Tournament Team</p>
    `;
};

module.exports = { generateNewTournamentEmail };
