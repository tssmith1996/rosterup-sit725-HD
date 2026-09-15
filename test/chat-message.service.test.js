const test = require('node:test');
const assert = require('node:assert/strict');

const { saveMessage, getRecentMessages, deleteRoomHistory } = require('../services/chat-message.service');

test('saveMessage stores the message with the given scope and room', async () => {
    let saved;
    const MessageModel = {
        async create(doc) {
            saved = doc;
            return { _id: 'message-1', ...doc };
        },
    };

    await saveMessage({
        scope: 'workplace',
        room: 'workplace:workplace-1',
        workplaceId: 'workplace-1',
        senderId: 'user-1',
        text: 'Hello team',
    }, { MessageModel });

    assert.deepEqual(saved, {
        scope: 'workplace',
        room: 'workplace:workplace-1',
        workplace: 'workplace-1',
        sender: 'user-1',
        recipient: null,
        text: 'Hello team',
    });
});

test('saveMessage stores a dm message with its recipient', async () => {
    let saved;
    const MessageModel = {
        async create(doc) {
            saved = doc;
            return { _id: 'message-1', ...doc };
        },
    };

    await saveMessage({
        scope: 'dm',
        room: 'dm:user-1_user-2',
        workplaceId: 'workplace-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        text: 'Hey',
    }, { MessageModel });

    assert.equal(saved.recipient, 'user-2');
});

function buildFakeQuery(docs) {
    return {
        sort() { return this; },
        limit() { return this; },
        populate() { return this; },
        lean() { return Promise.resolve(docs); },
    };
}

test('getRecentMessages returns messages oldest-first', async () => {
    // The model returns newest-first (as the real sort({createdAt:-1})
    // query would) — the service must reverse it for display order.
    const docs = [
        { _id: 'm3', text: 'third', createdAt: 3 },
        { _id: 'm2', text: 'second', createdAt: 2 },
        { _id: 'm1', text: 'first', createdAt: 1 },
    ];
    const MessageModel = { find() { return buildFakeQuery(docs); } };

    const messages = await getRecentMessages('workplace:workplace-1', { MessageModel });

    assert.deepEqual(messages.map((m) => m.text), ['first', 'second', 'third']);
});

test('getRecentMessages returns an empty array when there is no history', async () => {
    const MessageModel = { find() { return buildFakeQuery([]); } };

    const messages = await getRecentMessages('workplace:workplace-1', { MessageModel });

    assert.deepEqual(messages, []);
});

test('deleteRoomHistory removes every message in the room, regardless of sender', async () => {
    let filterUsed;
    const MessageModel = {
        async deleteMany(filter) {
            filterUsed = filter;
            return { deletedCount: 7 };
        },
    };

    const deletedCount = await deleteRoomHistory('workplace:workplace-1', { MessageModel });

    assert.deepEqual(filterUsed, { room: 'workplace:workplace-1' });
    assert.equal(deletedCount, 7);
});

test('deleteRoomHistory returns 0 when there was nothing to delete', async () => {
    const MessageModel = { async deleteMany() { return { deletedCount: 0 }; } };

    const deletedCount = await deleteRoomHistory('workplace:workplace-1', { MessageModel });

    assert.equal(deletedCount, 0);
});
