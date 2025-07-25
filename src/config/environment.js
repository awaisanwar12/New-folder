require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    apiBaseUrl: process.env.API_BASE_URL || 'https://backend.thegamecompany.ai',
    userApiBaseUrl: process.env.USER_API_BASE_URL || 'https://endpoint.thegamecompany.ai',
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM,
    },
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        sesEmail: process.env.AWS_SES_EMAIL_FROM || 'noreply@tgcesports.gg',
    },
};

module.exports = config;
