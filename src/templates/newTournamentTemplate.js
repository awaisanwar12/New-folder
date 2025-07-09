const { formatInTimeZone } = require('date-fns-tz');
const fs = require('fs');
const path = require('path');

// Language-specific content for new tournament notifications
const emailTexts = {
    english: {
        subject: '{{gameName}} Tournament: Registration is NOW OPEN!',
        greeting: 'Hi {{username}},',
        intro: 'A brand new tournament has just been created on TGC Esports, and registration is now officially open! Get ready to test your skills and compete against the best.',
        tournamentName: 'Tournament Name:',
        game: 'Game:',
        platform: 'Platform:',
        startDate: 'Tournament Start Date:',
        region: 'Region:',
        prizePool: 'Prize Pool:',
        callToAction: 'This is your chance to showcase your talent, connect with other players, and win amazing prizes. Don\'t miss out on the action!',
        registerButton: 'Register for Tournament',
        spacesLimited: 'Spaces are limited, so make sure to register early to secure your spot.',
        closing: 'We can\'t wait to see you in the arena!',
        signature: 'Good luck,',
        team: 'TGC Team',
        unsubscribe: 'To Unsubscribe from future communication click here',
        joinDiscord: 'Join the Discord Server',
        discordUpdate: 'Join our Discord for real-time updates, rules, and announcements.'
    },
    arabic: {
        subject: 'بطولة جديدة ل{{gameName}} سجل الآن!',
        greeting: 'مرحباً {{username}},',
        intro: 'لقد تم إنشاء بطولة جديدة تماماً على TGC Esports، والتسجيل مفتوح رسمياً الآن! استعد لاختبار مهاراتك والتنافس ضد الأفضل.',
        tournamentName: 'اسم البطولة:',
        game: 'اللعبة:',
        platform: 'المنصة:',
        startDate: 'تاريخ بدء البطولة:',
        region: 'المنطقة:',
        prizePool: 'مجموع الجوائز:',
        callToAction: 'هذه فرصتك لإظهار مواهبك، والتواصل مع لاعبين آخرين، والفوز بجوائز مذهلة. لا تفوت الإثارة!',
        registerButton: 'سجل في البطولة',
        spacesLimited: 'الأماكن محدودة، لذا تأكد من التسجيل مبكراً لتأمين مكانك.',
        closing: 'لا يسعنا الانتظار لرؤيتك في الساحة!',
        signature: 'حظاً موفقاً،',
        team: 'فريق TGC',
        unsubscribe: 'لإلغاء الاشتراك من المراسلات المستقبلية، انقر هنا',
        joinDiscord: 'انضم إلى خادم Discord',
        discordUpdate: 'انضم إلى Discord للحصول على التحديثات الفورية والقوانين والإعلانات.'
    }
};

// Read the HTML template file
let htmlTemplate;
try {
    const templatePath = path.join(__dirname, 'newTournamentEmailTemplate.html');
    htmlTemplate = fs.readFileSync(templatePath, 'utf8');
} catch (error) {
    console.error('Error reading new tournament HTML template:', error);
    // Fallback to basic template if file not found
    htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head><title>{{subject}}</title></head>
        <body>
            <h1>{{title}}</h1>
            <p>{{greeting}}</p>
            <p>{{intro}}</p>
            <p><strong>{{tournamentName}}</strong> {{gameName}}</p>
            <p><strong>{{startDate}}</strong> {{tournamentStart}}</p>
            <p>{{callToAction}}</p>
            <p>{{signature}}</p>
            <p>{{team}}</p>
        </body>
        </html>
    `;
}

const generateNewTournamentEmail = (tournament, user = {}, language = 'english') => {
    // Get language (default to English if not set)
    const lang = language?.toLowerCase() || 'english';
    const texts = emailTexts[lang] || emailTexts.english;
    
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

    // Replace placeholders in the HTML template
    return htmlTemplate
        .replace(/{{lang}}/g, lang)
        .replace(/{{direction}}/g, lang === 'arabic' ? 'rtl' : 'ltr')
        .replace(/{{title}}/g, lang === 'arabic' ? 'تنبيه بطولة جديدة!' : 'New Tournament Alert!')
        .replace(/{{greeting}}/g, texts.greeting.replace('{{username}}', user.name || user.username || 'Gamer'))
        .replace(/{{intro}}/g, texts.intro)
        .replace(/{{tournamentNameLabel}}/g, texts.tournamentName)
        .replace(/{{gameLabel}}/g, texts.game)
        .replace(/{{platformLabel}}/g, texts.platform)
        .replace(/{{startDateLabel}}/g, texts.startDate)
        .replace(/{{regionLabel}}/g, texts.region)
        .replace(/{{prizePoolLabel}}/g, texts.prizePool)
        .replace(/{{gameName}}/g, tournament.name || tournament.disciplineName || 'Tournament')
        .replace(/{{tournamentName}}/g, tournament.name || 'N/A')
        .replace(/{{disciplineName}}/g, tournament.disciplineName || 'N/A')
        .replace(/{{platform}}/g, tournament.platform || 'PC')
        .replace(/{{tournamentStart}}/g, formattedDateTime)
        .replace(/{{region}}/g, tournament.region || 'MENA')
        .replace(/{{prizePool}}/g, tournament.prizePool || 'TBA')
        .replace(/{{callToAction}}/g, texts.callToAction)
        .replace(/{{registerButton}}/g, texts.registerButton)
        .replace(/{{spacesLimited}}/g, texts.spacesLimited)
        .replace(/{{closing}}/g, texts.closing)
        .replace(/{{signature}}/g, texts.signature)
        .replace(/{{team}}/g, texts.team)
        .replace(/{{joinDiscord}}/g, texts.joinDiscord)
        .replace(/{{discordUpdate}}/g, texts.discordUpdate)
        .replace(/{{unsubscribe}}/g, texts.unsubscribe)
        .replace(/{{discordlink}}/g, 'https://discord.com/invite/7KqWgkTQ9t');
};

/**
 * Gets the email subject for a new tournament notification based on language
 * @param {string} language - The user's language
 * @param {object} tournament - The tournament object
 * @returns {string} - The email subject
 */
const getNewTournamentEmailSubject = (language, tournament) => {
    const lang = language?.toLowerCase() || 'english';
    const texts = emailTexts[lang] || emailTexts.english;
    return texts.subject.replace('{{gameName}}', tournament.name || tournament.disciplineName || 'Tournament');
};

module.exports = { generateNewTournamentEmail, getNewTournamentEmailSubject };
