const AuditLog = require('../models/AuditLog');

// ==========================================
// AUDIT HELPER
// ==========================================
// Fire-and-forget by design: an audit write must never break a request or
// leak its failure to the caller. Errors are logged server-side only.
//
// Usage:
//   audit(req, 'booking.created', { targetId: booking._id, targetType: 'Booking' });
// ==========================================

const clientIp = (req) => {
    if (!req) return '';
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim().slice(0, 64);
    }
    return (req.ip || req.socket?.remoteAddress || '').slice(0, 64);
};

const audit = (req, event, options = {}) => {
    const {
        actor = req?.user?._id || null,
        actorRole = req?.user?.role || 'anonymous',
        targetId = null,
        targetType = '',
        meta = {},
        success = true
    } = options;

    // Never let audit metadata carry secrets.
    const safeMeta = { ...meta };
    ['password', 'newPassword', 'currentPassword', 'token', 'authorization'].forEach((key) => {
        delete safeMeta[key];
    });

    AuditLog.create({
        event,
        actor,
        actorRole,
        targetId,
        targetType,
        ip: clientIp(req),
        userAgent: (req?.headers?.['user-agent'] || '').slice(0, 256),
        meta: safeMeta,
        success
    }).catch((err) => {
        console.error(`[ AUDIT ] Failed to write "${event}": ${err.message}`);
    });
};

module.exports = { audit, clientIp };
