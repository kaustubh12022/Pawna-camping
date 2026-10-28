const mongoose = require('mongoose');

// ==========================================
// INPUT VALIDATION HELPERS
// ==========================================
// Small, dependency-free helpers used by controllers that accept untrusted
// input. The goal is explicit allow-listing: a value is rejected unless it is
// provably the type and shape we expect. This is what stops objects such as
// { "$ne": null } from reaching a Mongoose query.
// ==========================================

const isPlainString = (value) => typeof value === 'string';

// Returns a trimmed string, or null when the input is not a string.
const optionalString = (value, maxLength = 500) => {
    if (!isPlainString(value)) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return '';
    if (trimmed.length > maxLength) return null;
    return trimmed;
};

// Returns a finite integer within [min, max], or null.
const optionalInt = (value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'object' || typeof value === 'boolean') return null;
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
    if (num < min || num > max) return null;
    return num;
};

// Returns a finite number within [min, max], or null.
const optionalNumber = (value, { min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'object' || typeof value === 'boolean') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    if (num < min || num > max) return null;
    return num;
};

// Returns a valid ObjectId string, or null. Rejects any non-string input,
// which is what blocks operator objects in URL/query parameters.
const optionalObjectId = (value) => {
    if (!isPlainString(value)) return null;
    if (!mongoose.Types.ObjectId.isValid(value)) return null;
    return value;
};

const isPlainObject = (value) => (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
);

// Returns a trimmed absolute http(s) URL, or null when the value is missing,
// malformed, too long, or uses any other scheme. This is what prevents a
// stored `javascript:` link from executing when rendered as an href.
const optionalHttpUrl = (value, maxLength = 500) => {
    const str = optionalString(value, maxLength);
    if (!str) return str; // '' (explicitly cleared) or null (not a string)
    let parsed;
    try {
        parsed = new URL(str);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return str;
};

// Guards a query string before it is handed to a regex. Escapes every
// regex metacharacter so user input cannot alter the expression.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Parses pagination query params with hard caps.
const parsePagination = (query, { defaultLimit = 50, maxLimit = 200 } = {}) => {
    const page = optionalInt(query?.page, { min: 1, max: 100000 }) || 1;
    const requested = optionalInt(query?.limit, { min: 1, max: maxLimit });
    const limit = requested || defaultLimit;
    return { page, limit, skip: (page - 1) * limit };
};

// Maximum accepted length for a free-text password.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// Returns { ok: true } or { ok: false, message }.
// Deliberately permissive: length + character-class variety, no symbol
// requirement (long passphrases are stronger than forced punctuation).
const validatePassword = (password, { email = '' } = {}) => {
    if (!isPlainString(password)) {
        return { ok: false, message: 'Password must be a string' };
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return { ok: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` };
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
        return { ok: false, message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long` };
    }
    if (email && password.toLowerCase() === String(email).toLowerCase()) {
        return { ok: false, message: 'Password cannot be the same as your email address' };
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return { ok: false, message: 'Password must contain at least one letter and one number' };
    }
    return { ok: true };
};

module.exports = {
    isPlainString,
    isPlainObject,
    optionalString,
    optionalInt,
    optionalNumber,
    optionalObjectId,
    optionalHttpUrl,
    escapeRegex,
    parsePagination,
    validatePassword,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH
};
