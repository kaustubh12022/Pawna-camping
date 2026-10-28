const mongoose = require('mongoose');

// ==========================================
// AUDIT LOG
// ==========================================
// Append-only record of security-relevant events. Deliberately stores no
// passwords, tokens, or full request bodies.
//
// Events written today:
//   login.success | login.failure | login.locked
//   password.changed | password.reset | password.reset.failed
//   user.created | user.deleted
//   property.created | property.updated | property.deleted
//   booking.created | booking.status_changed | booking.deleted
//   owner.properties_assigned
//   auth.token_revoked
// ==========================================

const auditLogSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        index: true
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    actorRole: {
        type: String,
        enum: ['manager', 'owner', 'anonymous', 'system'],
        default: 'anonymous'
    },
    // The user/record the action was performed on, when different from actor.
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    targetType: {
        type: String,
        default: ''
    },
    ip: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    // Small, non-sensitive structured detail (e.g. { status: 'confirmed' }).
    meta: {
        type: Object,
        default: {}
    },
    success: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Keep the collection bounded: TTL index removes entries after 180 days.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
