const { formatInTimeZone } = require('date-fns-tz');

const generateNewTournamentEmail = (tournament) => {
    let formattedDateTime = 'Date not available';
    try {
        const startDateString = tournament.full_name.split(',')[0];
        const timeZone = tournament.timezone || 'UTC'; // Default to UTC if not provided

        // Format the date and time correctly using the specified timezone
        const formattedTime = formatInTimeZone(startDateString, timeZone, 'eeee, MMMM do, yyyy h:mm a');
        
        // Append the explicit timezone name from the data for absolute clarity
        formattedDateTime = `${formattedTime} (${timeZone})`;

    } catch (error) {
        console.error(`Could not format date for tournament ${tournament.name}:`, error);
        formattedDateTime = 'Date could not be determined. Please check the website.';
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
