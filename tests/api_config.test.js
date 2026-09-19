// tests/api_config.test.js
// Empirical test for src/config/api.js deterministic URL resolution

import assert from 'node:assert';

function computeApiBaseUrl(rawEnvUrl, isDev) {
    const isValidUrl = Boolean(
        rawEnvUrl &&
        rawEnvUrl !== 'undefined' &&
        rawEnvUrl !== 'null' &&
        typeof rawEnvUrl === 'string' &&
        rawEnvUrl.trim() !== ''
    );

    return (isValidUrl ? rawEnvUrl.trim().replace(/\/+$/, '') : '') ||
        (isDev ? 'http://localhost:5000' : 'https://pawna-camping.onrender.com');
}

function computeApiUrl(baseUrl, endpoint = '') {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
}

const testCases = [
    {
        name: 'VITE_API_URL is undefined (DEV mode)',
        raw: undefined,
        isDev: true,
        expectedBase: 'http://localhost:5000'
    },
    {
        name: 'VITE_API_URL is undefined (PROD mode)',
        raw: undefined,
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL is empty string "" (DEV mode)',
        raw: '',
        isDev: true,
        expectedBase: 'http://localhost:5000'
    },
    {
        name: 'VITE_API_URL is empty string "" (PROD mode)',
        raw: '',
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL is whitespace "   " (PROD mode)',
        raw: '   ',
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL is literal string "undefined" (PROD mode)',
        raw: 'undefined',
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL is literal string "null" (PROD mode)',
        raw: 'null',
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL has single trailing slash',
        raw: 'https://pawna-camping.onrender.com/',
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL has multiple trailing slashes',
        raw: 'https://pawna-camping.onrender.com///',
        isDev: false,
        expectedBase: 'https://pawna-camping.onrender.com'
    },
    {
        name: 'VITE_API_URL has leading/trailing spaces and trailing slash',
        raw: '  https://custom-api.example.com/  ',
        isDev: false,
        expectedBase: 'https://custom-api.example.com'
    },
    {
        name: 'VITE_API_URL custom production URL',
        raw: 'https://api.pawnacamping.com',
        isDev: false,
        expectedBase: 'https://api.pawnacamping.com'
    }
];

console.log('=== RUNNING API CONFIG TESTS ===');
let passed = 0;
let failed = 0;

for (const tc of testCases) {
    const actualBase = computeApiBaseUrl(tc.raw, tc.isDev);
    try {
        assert.strictEqual(actualBase, tc.expectedBase);
        console.log(`[PASS] ${tc.name} -> ${actualBase}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${tc.name}: expected "${tc.expectedBase}", got "${actualBase}"`);
        failed++;
    }
}

// Test endpoint construction
console.log('\n=== RUNNING getApiUrl TESTS ===');
const base = 'https://pawna-camping.onrender.com';
const endpointCases = [
    { endpoint: '/api/bookings', expected: 'https://pawna-camping.onrender.com/api/bookings' },
    { endpoint: 'api/bookings', expected: 'https://pawna-camping.onrender.com/api/bookings' },
    { endpoint: '/api/packages/123', expected: 'https://pawna-camping.onrender.com/api/packages/123' },
    { endpoint: '', expected: 'https://pawna-camping.onrender.com/' },
    { endpoint: undefined, expected: 'https://pawna-camping.onrender.com/' }
];

for (const ep of endpointCases) {
    const actual = computeApiUrl(base, ep.endpoint);
    try {
        assert.strictEqual(actual, ep.expected);
        console.log(`[PASS] getApiUrl("${ep.endpoint}") -> ${actual}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] getApiUrl("${ep.endpoint}"): expected "${ep.expected}", got "${actual}"`);
        failed++;
    }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
