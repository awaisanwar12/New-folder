require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    apiBaseUrl: process.env.API_BASE_URL,
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM,
    },
};

module.exports = config;
