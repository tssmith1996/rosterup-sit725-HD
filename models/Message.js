const mongoose = require('mongoose');

// Chat message persistence. Originally out of scope for the "Build
// real-time chat (Socket.io)" Trello card (group + DM messaging were
// meant to be live-only, no history) — added afterwards once real usage
// showed messages disappearing on every page reload/navigation was
// confusing rather than a deliberate feature. `room` is the exact
// socket.io room name (see services/chat-room.service.js) so history for
// a given conversation is a single indexed query.
const MessageSchema = new mongoose.Schema({
    scope: { type: String, required: true, enum: ['workplace', 'dm'] },
    room: { type: String, required: true, index: true },
    workplace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workplace', default: null },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // dm scope only
    text: { type: String, required: true, trim: true, maxlength: 2000 },
}, {
    timestamps: true,
    toJSON: { getters: true, virtuals: false },
    toObject: { getters: true, virtuals: false },
});

module.exports = mongoose.model('Message', MessageSchema);
