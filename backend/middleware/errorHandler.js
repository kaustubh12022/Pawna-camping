// ==========================================
// CENTRAL ERROR HANDLER
// ==========================================
// Rules:
//   1. Client errors (4xx) may expose a short, validated message.
//   2. Server errors (5xx) NEVER expose err.message, err.stack, file paths,
//      library names, or database details — regardless of NODE_ENV.
//   3. Stack traces are only emitted when NODE_ENV is exactly "development"
//      AND DEBUG_STACKS=true. This is an explicit opt-in so that a missing
//      NODE_ENV on a host like Render can never leak source paths.
// ==========================================

const wantsStacks = () => (
    process.env.NODE_ENV === 'development'
    && process.env.DEBUG_STACKS === 'true'
);

const errorHandler = (err, req, res, next) => {
    // Express requires a 4-argument function; next is unused but must exist.

    // ---- BODY PARSER: malformed JSON ----
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Malformed JSON in request body' });
    }

    // ---- BODY PARSER: payload too large ----
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request body is too large' });
    }

    // ---- MONGOOSE: invalid ObjectId / cast failure ----
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid identifier format' });
    }

    // ---- MONGOOSE: schema validation ----
    if (err.name === 'ValidationError' && err.errors) {
        const details = Object.values(err.errors)
            .map((item) => item.message)
            .filter((message) => typeof message === 'string')
            .slice(0, 5);
        return res.status(400).json({
            message: details.length > 0 ? details.join('; ') : 'Invalid request data'
        });
    }

    // ---- MONGOOSE: duplicate key ----
    if (err.code === 11000) {
        return res.status(409).json({ message: 'A record with those details already exists' });
    }

    // ---- MULTER: upload rejected ----
    if (err.name === 'MulterError') {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large'
            : 'Upload rejected';
        return res.status(400).json({ message });
    }

    // ---- JWT ----
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorised' });
    }

    // ---- EXPLICIT CLIENT ERROR ----
    const status = Number(err.statusCode || err.status);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
        return res.status(status).json({
            message: typeof err.message === 'string' && err.message.length <= 300
                ? err.message
                : 'Request rejected'
        });
    }

    // ---- EVERYTHING ELSE: opaque 500 ----
    // Log the full detail server-side only.
    console.error('[ SERVER ERROR ]', {
        name: err.name,
        message: err.message,
        path: req.originalUrl,
        method: req.method,
        stack: err.stack
    });

    const body = { message: 'Internal Server Error' };
    if (wantsStacks()) {
        body.stack = err.stack;
    }
    return res.status(500).json(body);
};

// 404 handler for unmatched routes.
const notFoundHandler = (req, res) => {
    res.status(404).json({ message: 'Not found' });
};

module.exports = { errorHandler, notFoundHandler };
