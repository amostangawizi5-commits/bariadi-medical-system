const nodemailer = require('nodemailer');

const getGmailConfig = () => ({
    enabled: process.env.GMAIL_ENABLED === 'true' || process.env.GMAIL_ENABLED === '1',
    email: process.env.GMAIL_EMAIL,
    appPassword: process.env.GMAIL_APP_PASSWORD,
    senderName: process.env.GMAIL_SENDER_NAME || 'AFYA - Bariadi District'
});

const createTransporter = async () => {
    const config = getGmailConfig();

    if (!config.enabled || !config.email || !config.appPassword) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.email,
            pass: config.appPassword
        }
    });
};

const sendEmail = async ({ to, subject, html, text }) => {
    const config = getGmailConfig();

    if (!config.enabled) {
        return {
            success: false,
            provider: 'gmail',
            skipped: true,
            reason: 'disabled'
        };
    }

    if (!config.email || !config.appPassword) {
        return {
            success: false,
            provider: 'gmail',
            skipped: true,
            reason: 'missing_credentials'
        };
    }

    if (!to) {
        return {
            success: false,
            provider: 'gmail',
            skipped: true,
            reason: 'invalid_recipient'
        };
    }

    try {
        const transporter = await createTransporter();

        if (!transporter) {
            return {
                success: false,
                provider: 'gmail',
                skipped: true,
                reason: 'transporter_error'
            };
        }

        const info = await transporter.sendMail({
            from: `"${config.senderName}" <${config.email}>`,
            to,
            subject,
            text,
            html
        });

        return {
            success: true,
            provider: 'gmail',
            recipient: to,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('Gmail sending failed:', error.message);
        return {
            success: false,
            provider: 'gmail',
            recipient: to,
            error: error.message
        };
    }
};

const sendCertificateExpiryEmail = async ({ to, employeeName, expiryDate }) => {
    const subject = 'Certificate Expiry Notice';

    const text = `Hello ${employeeName},\n\nYour medical certificate will expire on ${new Date(expiryDate).toLocaleDateString('en-GB')}.\n\nPlease visit the health office to renew your certificate.\n\nThank you,\nAFYA - Bariadi District`;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Certificate Expiry Notice</h2>
            <p>Hello ${employeeName},</p>
            <p>Your medical certificate will expire on <strong>${new Date(expiryDate).toLocaleDateString('en-GB')}</strong>.</p>
            <p>Please visit the health office to renew your certificate.</p>
            <hr />
            <p><small>AFYA - Bariadi District</small></p>
        </div>
    `;

    return sendEmail({ to, subject, html, text });
};

const sendPaymentConfirmationEmail = async ({ to, employeeName, amount, newExpiryDate }) => {
    const subject = 'Payment Confirmed - Your Certificate Has Been Renewed';

    const text = `Hello ${employeeName},\n\nWe have received your payment of TZS ${amount} for the medical check. Your certificate has been renewed until ${new Date(newExpiryDate).toLocaleDateString('en-GB')}.\n\nThank you,\nAFYA - Bariadi District`;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Payment Received</h2>
            <p>Hello ${employeeName},</p>
            <p>We have received your payment of <strong>TZS ${amount}</strong> for the medical check.</p>
            <p>Your certificate has been renewed until <strong>${new Date(newExpiryDate).toLocaleDateString('en-GB')}</strong>.</p>
            <p>Thank you!</p>
            <hr />
            <p><small>AFYA - Bariadi District</small></p>
        </div>
    `;

    return sendEmail({ to, subject, html, text });
};

module.exports = {
    sendEmail,
    sendCertificateExpiryEmail,
    sendPaymentConfirmationEmail
};
