const { format } = require('date-fns');

/**
 * Generates the HTML content for a tournament reminder email.
 * @param {object} participant - The participant object.
 * @param {object} tournament - The tournament object.
 * @returns {string} - The HTML content of the email.
 */
const generateReminderEmail = (participant, tournament) => {
    const startDateString = tournament.full_name.split(',')[0];
    const startDate = new Date(startDateString);

    // Format the date and time in a user-friendly way
    const formattedDate = format(startDate, 'eeee, MMMM do, yyyy');
    const formattedTime = format(startDate, 'h:mm a');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tournament Reminder</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                .header { font-size: 24px; font-weight: bold; color: #007bff; text-align: center; }
                .content { margin-top: 20px; }
                .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #777; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">Tournament Reminder: ${tournament.name}</div>
                <div class="content">
                    <p>Hello ${participant.name},</p>
                    <p>This is a friendly reminder that the tournament <strong>${tournament.name}</strong> is scheduled to start soon!</p>
                    <p><strong>Start Date:</strong> ${formattedDate}</p>
                    <p><strong>Start Time:</strong> ${formattedTime} (${tournament.timezone})</p>
                    <p>Please be prepared and ready for your match. Good luck!</p>
                </div>
                <div class="footer">
                    <p>This is an automated reminder from The Game Company.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

module.exports = { generateReminderEmail };
