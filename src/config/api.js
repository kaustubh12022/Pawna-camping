/**
 * Centralized API Configuration
 * Single source of truth for the backend API base URL across the application.
 *
 * Fallback Hierarchy:
 * 1. import.meta.env.VITE_API_URL (if defined, non-empty, and not literal string "undefined")
 * 2. Development mode (import.meta.env.DEV): http://localhost:5000
 * 3. Production mode: https://pawna-camping.onrender.com
 */

const rawEnvUrl = import.meta.env.VITE_API_URL;
const isValidUrl = Boolean(
    rawEnvUrl &&
    rawEnvUrl !== 'undefined' &&
    rawEnvUrl !== 'null' &&
    typeof rawEnvUrl === 'string' &&
    rawEnvUrl.trim() !== ''
);

export const API_BASE_URL = 
    (isValidUrl ? rawEnvUrl.trim().replace(/\/+$/, '') : '') ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://pawna-camping.onrender.com');

/**
 * Constructs a fully qualified API endpoint URL.
 * Strips duplicate leading slashes.
 * @param {string} endpoint - API route path (e.g., '/api/properties' or 'api/properties')
 * @returns {string} Fully qualified URL (e.g., 'https://pawna-camping.onrender.com/api/properties')
 */
export const getApiUrl = (endpoint = '') => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
};

export default API_BASE_URL;
