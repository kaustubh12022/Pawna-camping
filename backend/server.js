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

// CONNECT TO DATABASE
connectDB();

// INITIALIZE EXPRESS APP
const app = express();

// MIDDLEWARE FOR JSON, URLENCODED DATA, AND CORS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(helmet()); // Add Helmet for security headers
app.use(mongoSanitize()); // Prevent NoSQL Injection
app.use(compression()); // Compress responses
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // HTTP Logging

// PRODUCTION & LOCALHOST CORS CONFIGURATION
// Only allow requests from known frontend origins
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        "https://pawna-camping.vercel.app",
        "https://lonavala-stays.vercel.app",
        process.env.FRONTEND_URL,
    ].filter(Boolean)
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://192.168.1.8:5173",
        "http://192.168.1.8:5174",
        "http://192.168.1.10:5173",
        "http://192.168.1.10:5174",
        "http://192.168.1.11:5173",
        "http://192.168.1.11:5174",
        "http://192.168.1.12:5173",
        "https://pawna-camping.vercel.app",
        "https://lonavala-stays.vercel.app",
        process.env.FRONTEND_URL,
    ].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin ONLY in development
        if (!origin) {
            if (process.env.NODE_ENV !== 'production') return callback(null, true);
            return callback(new Error(`CORS: Missing Origin header not allowed in production`));
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true
}));

// ==========================================
// RATE LIMITING — Public booking endpoint
// ==========================================
const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // Max 5 booking attempts per IP per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many booking requests from this IP. Please try again in 15 minutes.'
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // Max 10 login attempts per IP per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many login attempts from this IP. Please try again in 15 minutes.'
    }
});

// DEFINE ROUTES
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/authRoutes'));

// Apply rate limit ONLY to the public POST booking creation
const bookingRoutes = require('./routes/bookingRoutes');
app.post('/api/bookings', bookingLimiter); // Rate-limit public creation
app.use('/api/bookings', bookingRoutes);

app.use('/api/packages', require('./routes/packageRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes')); // Multi-property support
app.use('/api/owners', require('./routes/ownerRoutes'));         // Owner management
app.use('/api/revenue', require('./routes/revenueRoutes'));      // Revenue tracking & analytics
app.use('/api/dashboard', require('./routes/dashboardRoutes')); // Server-side dashboard stats
app.use('/api/reviews', require('./routes/reviewRoutes'));       // Public reviews
app.use('/api/upload', require('./routes/uploadRoutes'));        // Cloudinary image upload
app.use('/api/notifications', require('./routes/notificationRoutes')); // Web-push notifications
app.use('/api/blocked-dates', require('./routes/blockedDateRoutes')); // Owner blocked dates
app.use('/api/promotions', require('./routes/promotionRoutes'));      // Dynamic promotional engine

// HEALTH CHECK & ROOT ROUTE
app.get('/', (req, res) => {
    res.status(200).json({ message: 'LONAVALA MULTI-PROPERTY API IS RUNNING...', status: 'ok' });
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// START SERVER
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ SUCCESS ] SERVER RUNNING IN ${process.env.NODE_ENV} MODE ON PORT ${PORT}`);
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
