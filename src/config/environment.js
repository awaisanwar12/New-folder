require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    apiBaseUrl: process.env.API_BASE_URL,
    email: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        from: process.env.EMAIL_FROM,
    },
};

module.exports = config;
