const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getWorkplaceRoomName,
    getUserRoomName,
    getDirectMessageRoomName,
    resolveUserWorkplaceId,
} = require('../services/chat-room.service');

test('getWorkplaceRoomName namespaces by workplace id', () => {
    assert.equal(getWorkplaceRoomName('workplace-1'), 'workplace:workplace-1');
});

test('getUserRoomName namespaces by user id', () => {
    assert.equal(getUserRoomName('user-1'), 'user:user-1');
});

test('getDirectMessageRoomName is the same regardless of argument order', () => {
    const roomAB = getDirectMessageRoomName('user-a', 'user-b');
    const roomBA = getDirectMessageRoomName('user-b', 'user-a');

    assert.equal(roomAB, roomBA);
    assert.equal(roomAB, 'dm:user-a_user-b');
});

test('resolveUserWorkplaceId looks up a manager\'s workplace by manager_id', async () => {
    const WorkplaceModel = {
        async findOne(query) {
            assert.deepEqual(query, { manager_id: 'manager-1', active: true });
            return { _id: 'workplace-1' };
        },
    };

    const workplaceId = await resolveUserWorkplaceId(
        { _id: 'manager-1', role: 'manager' },
        { WorkplaceModel },
    );

    assert.equal(workplaceId, 'workplace-1');
});

test('resolveUserWorkplaceId returns null for a manager with no workplace yet', async () => {
    const WorkplaceModel = { async findOne() { return null; } };

    const workplaceId = await resolveUserWorkplaceId(
        { _id: 'manager-1', role: 'manager' },
        { WorkplaceModel },
    );

    assert.equal(workplaceId, null);
});

test('resolveUserWorkplaceId returns an approved employee\'s workplace', async () => {
    const workplaceId = await resolveUserWorkplaceId({
        _id: 'employee-1',
        role: 'employee',
        workplace: 'workplace-1',
        workplace_status: 'approved',
    });

    assert.equal(workplaceId, 'workplace-1');
});

test('resolveUserWorkplaceId returns null for a still-pending employee', async () => {
    const workplaceId = await resolveUserWorkplaceId({
        _id: 'employee-1',
        role: 'employee',
        workplace: 'workplace-1',
        workplace_status: 'pending',
    });

    assert.equal(workplaceId, null);
});

test('resolveUserWorkplaceId returns null for a missing user', async () => {
    const workplaceId = await resolveUserWorkplaceId(null);

    assert.equal(workplaceId, null);
});
