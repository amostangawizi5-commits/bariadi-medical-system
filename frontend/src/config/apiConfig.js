// API configuration - centralized for local and production deployments.
const configuredApiUrl = import.meta.env.VITE_API_URL;
const sameOriginApiUrl = typeof window !== 'undefined' ? window.location.origin : '';

export const API_BASE_URL = configuredApiUrl || sameOriginApiUrl || 'http://localhost:5000';

export const apiClient = {
    endpoints: {
        auth: {
            login: `${API_BASE_URL}/api/auth/login`,
            register: `${API_BASE_URL}/api/auth/register`,
            me: `${API_BASE_URL}/api/auth/me`,
            profile: `${API_BASE_URL}/api/auth/profile`
        },
        employees: {
            list: `${API_BASE_URL}/api/employees`,
            get: (id) => `${API_BASE_URL}/api/employees/${id}`,
            create: `${API_BASE_URL}/api/employees`,
            update: (id) => `${API_BASE_URL}/api/employees/${id}`,
            reset: (id) => `${API_BASE_URL}/api/employees/${id}/reset`,
            sendExpirySms: `${API_BASE_URL}/api/employees/send-expiry-sms`,
            sendExpirySmsOne: (id) => `${API_BASE_URL}/api/employees/${id}/send-expiry-sms`,
            testSms: `${API_BASE_URL}/api/employees/test-sms`
        },
        employers: {
            list: `${API_BASE_URL}/api/employers`,
            get: (id) => `${API_BASE_URL}/api/employers/${id}`,
            create: `${API_BASE_URL}/api/employers`
        },
        payments: {
            pending: `${API_BASE_URL}/api/payments/pending`,
            history: `${API_BASE_URL}/api/payments/history`
        },
        reports: {
            summary: `${API_BASE_URL}/api/reports/summary`,
            employers: `${API_BASE_URL}/api/reports/employers`
        },
        settings: {
            list: `${API_BASE_URL}/api/settings`,
            update: `${API_BASE_URL}/api/settings`
        }
    }
};

export default API_BASE_URL;
