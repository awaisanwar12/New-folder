const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');

// Language-specific templates
const emailTexts = {
    english: {
        subject: 'Tournament Starting Today',
        greeting: 'Hello',
        reminderText: 'This is a notification that the tournament',
        startingSoon: 'will start today!',
        tournamentNameLabel: 'Tournament:',
        startDateLabel: 'Start Date:',
        startTimeLabel: 'Start Time:',
        goodLuck: 'Please be prepared and ready for your match. Good luck!',
        footer: 'This is an automated notification from The Game Company.',
        direction: 'ltr'
    },
    arabic: {
        subject: 'البطولة تبدأ اليوم',
        greeting: 'مرحبا',
        reminderText: 'هذا إشعار بأن البطولة',
        startingSoon: 'ستبدأ اليوم!',
        tournamentNameLabel: 'البطولة:',
        startDateLabel: 'تاريخ البداية:',
        startTimeLabel: 'وقت البداية:',
        goodLuck: 'يرجى الاستعداد والتأهب للمباراة. حظاً موفقاً!',
        footer: 'هذا إشعار تلقائي من شركة الألعاب.',
        direction: 'rtl'
    }
    // Add more languages here as needed
};

/**
 * Generates the HTML content for a tournament reminder email.
 * @param {object} participant - The participant object.
 * @param {object} tournament - The tournament object.
 * @returns {string} - The HTML content of the email.
 */
const generateReminderEmail = (participant, tournament) => {
    // Get language (default to English if not set)
    const language = participant.language?.toLowerCase() || 'english';
    const texts = emailTexts[language] || emailTexts.english;
    
    // Check if full_name exists and is not null
    if (!tournament.full_name || typeof tournament.full_name !== 'string') {
        throw new Error(`Tournament "${tournament.name}" has no valid full_name field`);
    }
    
    const startDateString = tournament.full_name.split(',')[0];
    const startDate = new Date(startDateString);

    // Format the date and time in a user-friendly way
    const formattedDate = format(startDate, 'eeee, MMMM do, yyyy');
    const formattedTime = format(startDate, 'h:mm a');

    // Read the HTML template
    const templatePath = path.join(__dirname, 'reminderEmailTemplate.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders with actual values
    const replacements = {
        '{{language}}': language,
        '{{direction}}': texts.direction,
        '{{subject}}': texts.subject,
        '{{greeting}}': texts.greeting,
        '{{participantName}}': participant.name,
        '{{reminderText}}': texts.reminderText,
        '{{tournamentName}}': tournament.name,
        '{{startingSoon}}': texts.startingSoon,
        '{{tournamentNameLabel}}': texts.tournamentNameLabel,
        '{{startDateLabel}}': texts.startDateLabel,
        '{{startTimeLabel}}': texts.startTimeLabel,
        '{{formattedDate}}': formattedDate,
        '{{formattedTime}}': formattedTime,
        '{{timezone}}': tournament.timezone,
        '{{goodLuck}}': texts.goodLuck,
        '{{footer}}': texts.footer
    };

    // Replace all placeholders in the template
    Object.keys(replacements).forEach(placeholder => {
        htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
    });

    return htmlTemplate;
};

/**
 * Gets the email subject for a tournament reminder based on language
 * @param {string} language - The participant's language
 * @param {object} tournament - The tournament object
 * @returns {string} - The email subject
 */
const getReminderEmailSubject = (language, tournament) => {
    const lang = language?.toLowerCase() || 'english';
    const texts = emailTexts[lang] || emailTexts.english;
    return `${texts.subject}: ${tournament.name}`;
};

module.exports = { generateReminderEmail, getReminderEmailSubject };
