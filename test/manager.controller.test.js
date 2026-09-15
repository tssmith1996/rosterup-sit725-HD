const test = require('node:test');
const assert = require('node:assert/strict');

const managerController = require('../controllers/manager.controller');

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

// Only the validation that runs before any database call is unit-tested
// here, matching this codebase's existing convention (see
// auth.controller.test.js) — the DB-touching paths aren't mocked in this
// project, so they're exercised manually against a running Mongo instance
// instead.

test('processEmployeeRequest rejects a missing action', async () => {
    const response = createResponseRecorder();

    await managerController.processEmployeeRequest({
        params: { id: 'employee-1' },
        body: {},
        user: { id: 'manager-1' },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
});

test('processEmployeeRequest rejects an invalid action', async () => {
    const response = createResponseRecorder();

    await managerController.processEmployeeRequest({
        params: { id: 'employee-1' },
        body: { action: 'delete' },
        user: { id: 'manager-1' },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
});
