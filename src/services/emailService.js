const formData = require('form-data');
const Mailgun = require('mailgun.js');
const config = require('../config/environment');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: config.email.apiKey });

/**
 * Sends an email using the Mailgun API.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML body of the email.
 */
const sendEmail = async (to, subject, html) => {
    const messageData = {
        from: config.email.from,
        to: to,
        subject: subject,
        html: html,
    };

    try {
        console.log(`Sending email to: ${to} via Mailgun`);
        const response = await mg.messages.create(config.email.domain, messageData);
        console.log('Email sent successfully via Mailgun!', response);
        return response;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw new Error('Failed to send email.');
    }
};

module.exports = { sendEmail };
