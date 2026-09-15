const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildCreateWorkplaceController,
    buildGetMyWorkplaceController,
} = require('../controllers/workplaces.controller');

function createResponseRecorder() {
    return {
        statusCode: null,
        body: null,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test('create workplace controller returns the new workplace', async () => {
    const service = {
        async createWorkplace(body, managerId) {
            assert.equal(managerId, 'manager-1');
            assert.equal(body.workplace_name, 'Corner Cafe');
            return {
                _id: 'workplace-1',
                workplace_name: body.workplace_name,
                invite_code: 'RU-ABC234',
            };
        },
    };
    const controller = buildCreateWorkplaceController(service);
    const response = createResponseRecorder();

    await controller({
        body: { workplace_name: 'Corner Cafe' },
        user: { id: 'manager-1' },
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.workplace.invite_code, 'RU-ABC234');
});

test('create workplace controller returns expected validation errors', async () => {
    const service = {
        async createWorkplace() {
            const error = new Error('Missing required workplace fields');
            error.statusCode = 400;
            throw error;
        },
    };
    const controller = buildCreateWorkplaceController(service);
    const response = createResponseRecorder();

    await controller({ body: {}, user: { id: 'manager-1' } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error, 'Missing required workplace fields');
});

test('get my workplace controller returns the manager\'s workplace', async () => {
    const service = {
        async getWorkplaceByManagerId(managerId) {
            assert.equal(managerId, 'manager-1');
            return { _id: 'workplace-1', invite_code: 'RU-ABC234' };
        },
    };
    const controller = buildGetMyWorkplaceController(service);
    const response = createResponseRecorder();

    await controller({ user: { id: 'manager-1' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.workplace.invite_code, 'RU-ABC234');
});

test('get my workplace controller returns null when the manager has no workplace yet', async () => {
    const service = {
        async getWorkplaceByManagerId() {
            return null;
        },
    };
    const controller = buildGetMyWorkplaceController(service);
    const response = createResponseRecorder();

    await controller({ user: { id: 'manager-1' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.workplace, null);
});
