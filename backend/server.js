// LOAD ENVIRONMENT VARIABLES — must be first before any other require
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ==========================================
// STARTUP CONFIGURATION CHECKS
// ==========================================
// Fail fast on a missing/weak signing key. A short or absent JWT_SECRET is
// the single worst misconfiguration for this app: it lets anyone mint an
// admin token.
const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
    console.error('[ FATAL ] JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}
if (jwtSecret.length < 32) {
    console.warn('[ WARNING ] JWT_SECRET is shorter than 32 characters. Rotate it to a 64-character random value.');
}

if (process.env.NODE_ENV !== 'production') {
    console.warn('[ WARNING ] NODE_ENV is not "production". Error responses stay opaque, but set NODE_ENV=production on your host.');
}

// CONNECT TO DATABASE
connectDB();

// INITIALIZE EXPRESS APP
const app = express();

// Render/Vercel terminate TLS in front of the app. Trust exactly one proxy so
// req.ip (and therefore every rate limiter) sees the real client address.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ==========================================
// BODY PARSING
// ==========================================
// JSON bodies are small by design (images upload as multipart). A 256kb cap
// removes a trivial memory-exhaustion vector.
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

// ==========================================
// SECURITY HEADERS
// ==========================================
app.use(helmet({
    // The API returns JSON only; a document CSP here adds no value and can
    // interfere with error pages.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' }
}));

// ==========================================
// NOSQL OPERATOR SANITISATION
// ==========================================
// Express 5 makes req.query a read-only getter, while
// express-mongo-sanitize expects to overwrite it. Clone it into a writable
// own property first. Controllers additionally type-check every query param,
// so this is defence in depth rather than the only line of defence.
app.use((req, res, next) => {
    Object.defineProperty(req, 'query', {
        value: { ...req.query },
        writable: true,
        configurable: true,
        enumerable: true
    });
    next();
});
app.use(mongoSanitize({ replaceWith: '_' }));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ==========================================
// CORS
// ==========================================
// A rejected origin must be a clean "no CORS header" response, never a
// thrown Error. Throwing here produced a 500 whose stack disclosed absolute
// server paths (/opt/render/project/src/...).
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://pawna-camping.vercel.app',
        'https://lonavala-stays.vercel.app',
        process.env.FRONTEND_URL
    ].filter(Boolean)
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'https://pawna-camping.vercel.app',
        'https://lonavala-stays.vercel.app',
        process.env.FRONTEND_URL
    ].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // No Origin header: same-origin requests, curl, and mobile clients.
        // Such requests are still subject to authentication.
        if (!origin) return callback(null, false);

        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Deny quietly. Never throw: that turns a CORS policy decision into
        // a 500 with a stack trace.
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
}));

// ==========================================
// RATE LIMITING
// ==========================================
const limiterDefaults = {
    standardHeaders: true,
    legacyHeaders: false
};

// Global ceiling for the whole API surface.
const globalLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: 15 * 60 * 1000,
    max: 600,
    skip: (req) => req.path === '/api/health',
    message: { message: 'Too many requests. Please slow down and try again shortly.' }
});

// Credential endpoints get a much tighter budget.
const loginLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many sign-in attempts from this IP. Please try again in 15 minutes.' }
});

const passwordLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many password attempts. Please try again in 15 minutes.' }
});

const bookingLimiter = rateLimit({
    ...limiterDefaults,
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Too many booking requests from this IP. Please try again in 15 minutes.' }
});

// ==========================================
// ROUTES
// ==========================================
app.use('/api', globalLimiter);

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/change-password', passwordLimiter);
app.use('/api/auth/update-password', passwordLimiter);
app.use('/api/auth', require('./routes/authRoutes'));

// Apply the booking limiter ONLY to public booking creation.
const bookingRoutes = require('./routes/bookingRoutes');
app.post('/api/bookings', bookingLimiter);
app.use('/api/bookings', bookingRoutes);

app.use('/api/packages', require('./routes/packageRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/owners', require('./routes/ownerRoutes'));
app.use('/api/revenue', require('./routes/revenueRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/blocked-dates', require('./routes/blockedDateRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));

// HEALTH CHECK & ROOT ROUTE
app.get('/', (req, res) => {
    res.status(200).json({ message: 'LONAVALA MULTI-PROPERTY API IS RUNNING...', status: 'ok' });
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// ERROR HANDLING
// ==========================================
app.use(notFoundHandler);
app.use(errorHandler);

// START SERVER
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ SUCCESS ] SERVER RUNNING IN ${process.env.NODE_ENV || 'development'} MODE ON PORT ${PORT}`);
});

// UNHANDLED REJECTION AND EXCEPTION HANDLERS
process.on('unhandledRejection', (err) => {
    console.error(`[ FATAL ERROR ] Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error(`[ FATAL ERROR ] Uncaught Exception: ${err.message}`);
    process.exit(1);
});

module.exports = app;
