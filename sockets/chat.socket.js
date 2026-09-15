const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
    getWorkplaceRoomName,
    getUserRoomName,
    getDirectMessageRoomName,
    resolveUserWorkplaceId,
} = require('../services/chat-room.service');
const { saveMessage, getRecentMessages, deleteRoomHistory } = require('../services/chat-message.service');
const { getWorkplaceContacts } = require('../services/chat-contacts.service');

const MAX_MESSAGE_LENGTH = 2000;

// Real-time chat (Trello: "Build real-time chat (Socket.io)"). Scope, per
// that card: Socket.io on the Express backend, 1:1 direct messages, a
// shared group chat per workplace, room handling for both, and
// broadcasting to connected clients in the relevant room.
//
// Message history (models/Message.js, services/chat-message.service.js)
// was added after the fact — the original card explicitly excluded
// "storing/loading chat history", but without it every page reload wiped
// the conversation, which read as broken rather than intentional once
// people actually tried it. Persisting never blocks or delays live
// delivery: a message is broadcast first, saved second, and a save
// failure is only logged, never surfaced as a send failure (the person
// already saw their message land for everyone connected).

// Mirrors middleware/auth.middleware.js's requireAuth, but for the
// Socket.io handshake instead of an Express request — the two can't share
// code directly since sockets authenticate once at connection time rather
// than per-request, but the token and JWT_SECRET are the same ones the
// REST API already uses.
function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('Authentication required.'));
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = payload.id;
        socket.data.role = payload.role;
        return next();
    } catch (error) {
        return next(new Error('Invalid or expired session.'));
    }
}

function buildAck(callback) {
    // chat:send accepts an optional ack callback so the sender's own UI
    // can report a failure inline (e.g. "message too long") instead of
    // silently dropping it. Not every client passes one, so guard it.
    return (response) => {
        if (typeof callback === 'function') callback(response);
    };
}

// Shared between the workplace-history push on connect and the on-demand
// chat:dmHistory handler below, so both sides of history loading format a
// stored Message the same way the live chat:message broadcast does.
function mapMessageForClient(entry) {
    return {
        scope: entry.scope,
        room: entry.room,
        from: {
            id: entry.sender?._id,
            first_name: entry.sender?.first_name,
            last_name: entry.sender?.last_name,
        },
        text: entry.text,
        at: entry.createdAt,
    };
}

function initChatSocket(io, dependencies = {}) {
    const UserModel = dependencies.UserModel || User;

    io.use(authenticateSocket);

    io.on('connection', async (socket) => {
        try {
            const user = await UserModel.findById(socket.data.userId);

            if (!user || !user.active) {
                socket.emit('chat:error', { message: 'Invalid or expired session.' });
                socket.disconnect(true);
                return;
            }

            const workplaceId = await resolveUserWorkplaceId(user, dependencies);

            socket.data.profile = {
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
            };
            socket.data.workplaceId = workplaceId ? String(workplaceId) : null;

            // Always join a personal room — this is how a direct message
            // reaches every tab/device a user currently has open, without
            // the sender needing to know which socket ids are theirs.
            socket.join(getUserRoomName(socket.data.userId));

            if (workplaceId) {
                socket.join(getWorkplaceRoomName(workplaceId));
            }

            socket.emit('chat:ready', {
                userId: socket.data.userId,
                workplaceId: socket.data.workplaceId,
                // Lets the UI explain *why* group chat is unavailable
                // (no workplace yet / still pending) instead of just
                // showing an empty, unexplained message list.
                workplaceChatAvailable: Boolean(workplaceId),
            });

            if (workplaceId) {
                try {
                    const room = getWorkplaceRoomName(workplaceId);
                    const history = await getRecentMessages(room, dependencies);
                    socket.emit('chat:history', history.map(mapMessageForClient));
                } catch (historyError) {
                    // History is a convenience, not a requirement for chat
                    // to function — don't disconnect the socket over it.
                    console.error('Failed to load chat history:', historyError);
                }

                // The contact list (who this user can start a DM with) is
                // likewise best-effort: an empty/missing list just means
                // the frontend shows "no colleagues yet" instead of a
                // broken chat.
                try {
                    const contacts = await getWorkplaceContacts(user, dependencies);
                    socket.emit('chat:contacts', contacts);
                } catch (contactsError) {
                    console.error('Failed to load chat contacts:', contactsError);
                }
            }
        } catch (error) {
            console.error('Chat socket connection error:', error);
            socket.emit('chat:error', { message: 'Unable to set up chat for this session.' });
            socket.disconnect(true);
            return;
        }

        socket.on('chat:send', async (payload, callback) => {
            const ack = buildAck(callback);

            try {
                const text = typeof payload?.text === 'string' ? payload.text.trim() : '';

                if (!text) {
                    return ack({ success: false, error: 'Message cannot be empty.' });
                }
                if (text.length > MAX_MESSAGE_LENGTH) {
                    return ack({ success: false, error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` });
                }

                const message = {
                    from: { id: socket.data.userId, ...socket.data.profile },
                    text,
                    at: new Date().toISOString(),
                };

                if (payload?.scope === 'workplace') {
                    if (!socket.data.workplaceId) {
                        return ack({ success: false, error: 'You need an approved workplace to use group chat.' });
                    }

                    const room = getWorkplaceRoomName(socket.data.workplaceId);
                    io.to(room).emit('chat:message', { ...message, scope: 'workplace', room });

                    try {
                        await saveMessage({
                            scope: 'workplace',
                            room,
                            workplaceId: socket.data.workplaceId,
                            senderId: socket.data.userId,
                            text,
                        }, dependencies);
                    } catch (saveError) {
                        console.error('Failed to save chat message:', saveError);
                    }

                    return ack({ success: true });
                }

                if (payload?.scope === 'dm') {
                    const targetUserId = payload?.targetUserId ? String(payload.targetUserId) : null;
                    if (!targetUserId) {
                        return ack({ success: false, error: 'No recipient specified.' });
                    }
                    if (targetUserId === String(socket.data.userId)) {
                        return ack({ success: false, error: "You can't message yourself." });
                    }
                    if (!socket.data.workplaceId) {
                        return ack({ success: false, error: 'You need an approved workplace to send direct messages.' });
                    }

                    const target = await UserModel.findById(targetUserId);
                    const targetWorkplaceId = await resolveUserWorkplaceId(target, dependencies);

                    if (!target || String(targetWorkplaceId) !== String(socket.data.workplaceId)) {
                        return ack({ success: false, error: 'That person is not in your workplace.' });
                    }

                    const room = getDirectMessageRoomName(socket.data.userId, targetUserId);

                    // Join both the sender and every currently-connected
                    // socket of the recipient to the pair room before
                    // emitting, so a first message reaches them live even
                    // if neither side had opened this conversation before.
                    socket.join(room);
                    const recipientSockets = await io.in(getUserRoomName(targetUserId)).fetchSockets();
                    recipientSockets.forEach((recipientSocket) => recipientSocket.join(room));

                    io.to(room).emit('chat:message', { ...message, scope: 'dm', room, targetUserId });

                    try {
                        await saveMessage({
                            scope: 'dm',
                            room,
                            workplaceId: socket.data.workplaceId,
                            senderId: socket.data.userId,
                            recipientId: targetUserId,
                            text,
                        }, dependencies);
                    } catch (saveError) {
                        console.error('Failed to save chat message:', saveError);
                    }

                    return ack({ success: true });
                }

                return ack({ success: false, error: 'Unknown message scope.' });
            } catch (error) {
                console.error('chat:send error:', error);
                return ack({ success: false, error: 'Unable to send message.' });
            }
        });

        // Requested on demand the first time someone opens a DM thread from
        // the contact list (unlike workplace history, which is pushed
        // automatically on connect) — an ack response rather than a
        // broadcast, since only the requester needs the result.
        socket.on('chat:dmHistory', async (payload, callback) => {
            const ack = buildAck(callback);

            try {
                const targetUserId = payload?.targetUserId ? String(payload.targetUserId) : null;
                if (!targetUserId) {
                    return ack({ success: false, error: 'No recipient specified.' });
                }
                if (!socket.data.workplaceId) {
                    return ack({ success: false, error: 'You need an approved workplace to use chat.' });
                }

                const target = await UserModel.findById(targetUserId);
                const targetWorkplaceId = await resolveUserWorkplaceId(target, dependencies);

                if (!target || String(targetWorkplaceId) !== String(socket.data.workplaceId)) {
                    return ack({ success: false, error: 'That person is not in your workplace.' });
                }

                const room = getDirectMessageRoomName(socket.data.userId, targetUserId);
                const history = await getRecentMessages(room, dependencies);

                return ack({ success: true, messages: history.map(mapMessageForClient) });
            } catch (error) {
                console.error('chat:dmHistory error:', error);
                return ack({ success: false, error: 'Unable to load conversation history.' });
            }
        });

        // "Clear Chat" — wipes the workplace room's history for everyone,
        // not just the person who clicked it. Deliberately open to anyone
        // currently able to use the group chat (manager or employee), per
        // product decision — this isn't a permissions gap, it's the ask.
        socket.on('chat:clear', async (payload, callback) => {
            const ack = buildAck(callback);

            try {
                if (!socket.data.workplaceId) {
                    return ack({ success: false, error: 'You need an approved workplace to use group chat.' });
                }

                const room = getWorkplaceRoomName(socket.data.workplaceId);
                await deleteRoomHistory(room, dependencies);

                io.to(room).emit('chat:cleared', {
                    room,
                    by: { id: socket.data.userId, ...socket.data.profile },
                    at: new Date().toISOString(),
                });

                return ack({ success: true });
            } catch (error) {
                console.error('chat:clear error:', error);
                return ack({ success: false, error: 'Unable to clear chat.' });
            }
        });
    });
}

module.exports = {
    initChatSocket,
    authenticateSocket,
    MAX_MESSAGE_LENGTH,
};
