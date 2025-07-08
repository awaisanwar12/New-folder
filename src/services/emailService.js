const AWS = require('aws-sdk');
const config = require('../config/environment');

// Configure AWS SES
AWS.config.update({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

/**
 * Sends an email using Amazon SES.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML body of the email.
 */
const sendEmail = async (to, subject, html) => {
    const params = {
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: html,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject,
            },
        },
        Source: config.aws.sesEmail,
    };

    try {
        console.log(`Sending email via Amazon SES to: ${to}`);
        const result = await ses.sendEmail(params).promise();
        console.log('Email sent successfully! Message ID:', result.MessageId);
        return result;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw new Error('Failed to send email via Amazon SES.');
    }
};

module.exports = { sendEmail };
