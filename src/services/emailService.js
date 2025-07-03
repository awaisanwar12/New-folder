const nodemailer = require('nodemailer');
const config = require('../config/environment');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port == 465, // true for 465, false for other ports
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

/**
 * Sends an email.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML body of the email.
 */
const sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from: config.email.from,
        to: to,
        subject: subject,
        html: html,
    };

    try {
        console.log(`Sending email to: ${to}`);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully! Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw new Error('Failed to send email.');
    }
};

module.exports = { sendEmail };
