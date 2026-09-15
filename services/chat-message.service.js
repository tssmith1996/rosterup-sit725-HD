const Message = require('../models/Message');

const DEFAULT_HISTORY_LIMIT = 50;

// Persists one chat message. Called from sockets/chat.socket.js right
// after a message is broadcast live — persistence never blocks or gates
// delivery, it just means the conversation survives a page reload.
async function saveMessage(
    { scope, room, workplaceId = null, senderId, recipientId = null, text },
    dependencies = {},
) {
    const MessageModel = dependencies.MessageModel || Message;

    return MessageModel.create({
        scope,
        room,
        workplace: workplaceId,
        sender: senderId,
        recipient: recipientId,
        text,
    });
}

// Returns the most recent messages for a room, oldest first (ready to
// render top-to-bottom), with the sender's name populated so the frontend
// doesn't need a separate lookup per message.
async function getRecentMessages(room, dependencies = {}) {
    const MessageModel = dependencies.MessageModel || Message;
    const limit = dependencies.limit || DEFAULT_HISTORY_LIMIT;

    const messages = await MessageModel.find({ room })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'first_name last_name')
        .lean();

    return messages.reverse();
}

// Wipes a room's history for everyone — used by the "Clear Chat" button.
// Deliberately unscoped by sender: anyone in the room can clear it (a
// product decision, not an oversight), so this doesn't filter by who's
// asking — the socket handler decides who's allowed to call it at all.
async function deleteRoomHistory(room, dependencies = {}) {
    const MessageModel = dependencies.MessageModel || Message;

    const result = await MessageModel.deleteMany({ room });
    return result.deletedCount || 0;
}

module.exports = {
    saveMessage,
    getRecentMessages,
    deleteRoomHistory,
    DEFAULT_HISTORY_LIMIT,
};
