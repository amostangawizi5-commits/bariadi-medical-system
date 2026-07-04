const axios = require('axios');

const PROVIDER_DISPLAY_NAMES = {
    mojawave: 'MojaWave',
    beem: 'Beem'
};

const getSmsProvider = () => {
    if (process.env.SMS_PROVIDER) {
        return process.env.SMS_PROVIDER.toLowerCase();
    }

    return process.env.MOJAWAVE_API_KEY ? 'mojawave' : 'beem';
};

const getMojaWaveConfig = () => ({
    enabled: process.env.MOJAWAVE_ENABLED === 'true' || process.env.MOJAWAVE_ENABLED === '1',
    baseUrl: process.env.MOJAWAVE_BASE_URL || 'https://api.mojawave.com/v1',
    endpoint: process.env.MOJAWAVE_ENDPOINT,
    apiKey: process.env.MOJAWAVE_API_KEY,
    senderId: process.env.MOJAWAVE_SENDER_ID || '',
    phoneFormat: process.env.MOJAWAVE_PHONE_FORMAT || 'international_with_plus'
});

const getBeemConfig = () => ({
    enabled: process.env.BEEM_ENABLED === 'true' || process.env.BEEM_ENABLED === '1',
    baseUrl: process.env.BEEM_BASE_URL || 'https://apisms.beem.africa/v1',
    apiKey: process.env.BEEM_API_KEY,
    secretKey: process.env.BEEM_SECRET_KEY,
    senderId: process.env.BEEM_SENDER_ID || 'AFISA AFYA'
});

const normalizePhone = (phone) => {
    if (!phone) return null;

    const cleaned = String(phone).replace(/[^0-9+]/g, '');

    if (!cleaned) return null;
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('0')) return `+255${cleaned.slice(1)}`;

    return cleaned;
};

const toBeemDestination = (phone) => phone.replace(/^\+/, '');

const toMojaWaveDestination = (phone, phoneFormat) => {
    if (phoneFormat === 'international_with_plus') {
        return phone;
    }

    if (phoneFormat === 'local') {
        return phone.replace(/^\+255/, '0');
    }

    return phone.replace(/^\+/, '');
};

const sendMojaWaveSms = async ({ to, message }) => {
    const config = getMojaWaveConfig();

    if (!config.enabled) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.mojawave,
            skipped: true,
            reason: 'disabled'
        };
    }

    if (!config.apiKey) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.mojawave,
            skipped: true,
            reason: 'missing_api_key'
        };
    }

    if (!config.senderId) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.mojawave,
            skipped: true,
            reason: 'missing_sender_id'
        };
    }

    const recipient = normalizePhone(to);

    if (!recipient) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.mojawave,
            skipped: true,
            reason: 'invalid_phone'
        };
    }

    try {
        const endpoint = config.endpoint || `${config.baseUrl.replace(/\/$/, '')}/sms/send`;

        const payload = {
            to: toMojaWaveDestination(recipient, config.phoneFormat),
            recipient: toMojaWaveDestination(recipient, config.phoneFormat),
            phone: toMojaWaveDestination(recipient, config.phoneFormat),
            message
        };

        if (config.senderId) {
            payload.sender_id = config.senderId;
        }

        const response = await axios.post(
            endpoint,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                timeout: 10000
            }
        );

        const providerData = response?.data?.data || response?.data || {};
        const providerStatus = providerData?.status || response?.data?.status || null;
        const success = response?.data?.success !== false && providerStatus !== 'failed';

        return {
            success,
            provider: PROVIDER_DISPLAY_NAMES.mojawave,
            recipient,
            messageId: response?.data?.message_id || response?.data?.id || providerData?.id || null,
            providerStatus,
            failureReason: providerData?.failure_reason || null,
            raw: response?.data || null
        };
    } catch (error) {
        const smsError = error.response?.data || error.message;
        console.error('MojaWave SMS sending failed:', {
            status: error.response?.status,
            data: smsError
        });

        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.mojawave,
            recipient,
            statusCode: error.response?.status || null,
            error: smsError
        };
    }
};

const sendBeemSms = async ({ to, message }) => {
    const config = getBeemConfig();

    if (!config.enabled) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.beem,
            skipped: true,
            reason: 'disabled'
        };
    }

    if (!config.apiKey) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.beem,
            skipped: true,
            reason: 'missing_api_key'
        };
    }

    if (!config.secretKey) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.beem,
            skipped: true,
            reason: 'missing_secret_key'
        };
    }

    const recipient = normalizePhone(to);

    if (!recipient) {
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.beem,
            skipped: true,
            reason: 'invalid_phone'
        };
    }

    try {
        const endpoint = process.env.BEEM_ENDPOINT || `${config.baseUrl.replace(/\/$/, '')}/send`;
        const authorization = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString('base64');

        const response = await axios.post(
            endpoint,
            {
                source_addr: config.senderId,
                schedule_time: '',
                encoding: '0',
                message,
                recipients: [
                    {
                        recipient_id: 1,
                        dest_addr: toBeemDestination(recipient)
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Basic ${authorization}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        return {
            success: true,
            provider: PROVIDER_DISPLAY_NAMES.beem,
            recipient,
            messageId: response?.data?.request_id || response?.data?.data?.id || response?.data?.id || null,
            raw: response?.data || null
        };
    } catch (error) {
        console.error('Beem SMS sending failed:', error.response?.data || error.message);
        return {
            success: false,
            provider: PROVIDER_DISPLAY_NAMES.beem,
            recipient,
            error: error.response?.data || error.message
        };
    }
};

const sendSms = async ({ to, message }) => {
    const provider = getSmsProvider();

    if (provider === 'mojawave' || provider === 'onewave') {
        return sendMojaWaveSms({ to, message });
    }

    return sendBeemSms({ to, message });
};

module.exports = {
    sendSms
};
