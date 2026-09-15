const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildListPendingClaimsController,
    buildProcessShiftClaimController,
    buildClaimShiftController,
} = require('../controllers/shifts.controller');

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test('returns pending claims to an authenticated manager', async () => {
    const expectedClaims = [{ _id: 'shift-1' }];
    const controller = buildListPendingClaimsController({
        listPendingClaims: async (managerId) => {
            assert.equal(managerId, 'manager-1');
            return expectedClaims;
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'manager-1', role: 'manager' },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { claims: expectedClaims });
});

test('rejects a request without an authenticated user', async () => {
    const controller = buildListPendingClaimsController({
        listPendingClaims: async () => {
            throw new Error('Service should not run');
        },
    });
    const res = createResponse();

    await controller({}, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        error: 'An authenticated manager is required',
    });
});

test('rejects an employee request', async () => {
    const controller = buildListPendingClaimsController({
        listPendingClaims: async () => {
            throw new Error('Service should not run');
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'employee-1', role: 'employee' },
    }, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'Manager access is required' });
});

test('does not expose unexpected errors', async () => {
    const controller = buildListPendingClaimsController({
        listPendingClaims: async () => {
            throw new Error('database details');
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'manager-1', role: 'manager' },
    }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
        error: 'Unable to load pending claims',
    });
});

test('processShiftClaim approves a claim for an authenticated manager', async () => {
    const updatedShift = { _id: 'shift-1', status: 'covered' };
    const controller = buildProcessShiftClaimController({
        processShiftClaim: async (shiftId, managerId, action) => {
            assert.equal(shiftId, 'shift-1');
            assert.equal(managerId, 'manager-1');
            assert.equal(action, 'approve');
            return updatedShift;
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'manager-1', role: 'manager' },
        params: { id: 'shift-1' },
        body: { action: 'approve' },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { shift: updatedShift });
});

test('processShiftClaim surfaces a validation error from the service with its own status code', async () => {
    const controller = buildProcessShiftClaimController({
        processShiftClaim: async () => {
            const error = new Error("Invalid action. Must be 'approve' or 'reject'.");
            error.statusCode = 400;
            throw error;
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'manager-1', role: 'manager' },
        params: { id: 'shift-1' },
        body: { action: 'delete' },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        error: "Invalid action. Must be 'approve' or 'reject'.",
    });
});

test('claimShift lets an authenticated employee claim an open shift', async () => {
    const updatedShift = { _id: 'shift-1', status: 'pending', claimed_by: 'employee-1' };
    const controller = buildClaimShiftController({
        claimShift: async (shiftId, employeeId) => {
            assert.equal(shiftId, 'shift-1');
            assert.equal(employeeId, 'employee-1');
            return updatedShift;
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'employee-1', role: 'employee' },
        params: { id: 'shift-1' },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { shift: updatedShift });
});

test('claimShift rejects a request without an authenticated user', async () => {
    const controller = buildClaimShiftController({
        claimShift: async () => {
            throw new Error('Service should not run');
        },
    });
    const res = createResponse();

    await controller({ params: { id: 'shift-1' } }, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
        error: 'An authenticated employee is required',
    });
});

test('claimShift surfaces a not-found error from the service with its own status code', async () => {
    const controller = buildClaimShiftController({
        claimShift: async () => {
            const error = new Error('Open shift not found.');
            error.statusCode = 404;
            throw error;
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'employee-1', role: 'employee' },
        params: { id: 'shift-1' },
    }, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: 'Open shift not found.' });
});

test('claimShift does not expose unexpected errors', async () => {
    const controller = buildClaimShiftController({
        claimShift: async () => {
            throw new Error('database details');
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'employee-1', role: 'employee' },
        params: { id: 'shift-1' },
    }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
        error: 'Unable to claim shift',
    });
});

test('processShiftClaim does not expose unexpected errors', async () => {
    const controller = buildProcessShiftClaimController({
        processShiftClaim: async () => {
            throw new Error('database details');
        },
    });
    const res = createResponse();

    await controller({
        user: { id: 'manager-1', role: 'manager' },
        params: { id: 'shift-1' },
        body: { action: 'approve' },
    }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
        error: 'Unable to process shift claim',
    });
});
