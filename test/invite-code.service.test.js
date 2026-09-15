const test = require('node:test');
const assert = require('node:assert/strict');

const {
    createInviteCode,
    generateUniqueInviteCode,
} = require('../services/invite-code.service');

test('createInviteCode returns a readable RosterUp code', () => {
    const inviteCode = createInviteCode();

    assert.match(inviteCode, /^RU-[A-HJ-NP-Z2-9]{6}$/);
});

test('generateUniqueInviteCode retries when a code already exists', async () => {
    const generatedCodes = ['RU-ABC234', 'RU-XYZ789'];
    const checkedCodes = [];
    const WorkplaceModel = {
        async exists(query) {
            checkedCodes.push(query.invite_code);
            return query.invite_code === 'RU-ABC234';
        },
    };

    const result = await generateUniqueInviteCode(
        WorkplaceModel,
        () => generatedCodes.shift(),
    );

    assert.equal(result, 'RU-XYZ789');
    assert.deepEqual(checkedCodes, ['RU-ABC234', 'RU-XYZ789']);
});
