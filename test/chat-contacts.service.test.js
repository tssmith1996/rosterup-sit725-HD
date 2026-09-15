const test = require('node:test');
const assert = require('node:assert/strict');

const { getWorkplaceContacts } = require('../services/chat-contacts.service');

function buildFakeUserModel({ managerById = null, employees = [] } = {}) {
    return {
        findById(id) {
            return {
                select() {
                    return Promise.resolve(String(id) === String(managerById?._id) ? managerById : null);
                },
            };
        },
        find(query) {
            return {
                select() {
                    // Mirror the real query well enough for the test to
                    // assert on it without re-implementing Mongoose.
                    const excluded = new Set((query._id?.$nin || []).map(String));
                    return Promise.resolve(employees.filter((employee) => (
                        String(employee.workplace) === String(query.workplace)
                        && employee.role === query.role
                        && !excluded.has(String(employee._id))
                    )));
                },
            };
        },
    };
}

test('getWorkplaceContacts returns an empty list when the user has no workplace', async () => {
    const contacts = await getWorkplaceContacts(
        { _id: 'employee-1', role: 'employee', workplace_status: 'pending' },
        {},
    );

    assert.deepEqual(contacts, []);
});

test('getWorkplaceContacts includes the manager for an employee, but not the employee themselves', async () => {
    const manager = { _id: 'manager-1', first_name: 'Mia', last_name: 'Manager', role: 'manager', active: true };
    const employees = [
        { _id: 'employee-1', first_name: 'Eve', last_name: 'One', role: 'employee', workplace: 'workplace-1' },
        { _id: 'employee-2', first_name: 'Evan', last_name: 'Two', role: 'employee', workplace: 'workplace-1' },
    ];

    const WorkplaceModel = {
        async findById(id) {
            assert.equal(id, 'workplace-1');
            return { _id: 'workplace-1', manager_id: 'manager-1' };
        },
    };
    const UserModel = buildFakeUserModel({ managerById: manager, employees });

    const contacts = await getWorkplaceContacts(
        { _id: 'employee-1', role: 'employee', workplace: 'workplace-1', workplace_status: 'approved' },
        { WorkplaceModel, UserModel },
    );

    assert.deepEqual(contacts.map((c) => c.id), ['manager-1', 'employee-2']);
});

test('getWorkplaceContacts excludes the manager from their own contact list', async () => {
    const employees = [
        { _id: 'employee-1', first_name: 'Eve', last_name: 'One', role: 'employee', workplace: 'workplace-1' },
    ];

    const WorkplaceModel = {
        // resolveUserWorkplaceId (manager path) uses findOne; the rest of
        // this service uses findById — the fake needs both.
        async findOne() {
            return { _id: 'workplace-1' };
        },
        async findById() {
            return { _id: 'workplace-1', manager_id: 'manager-1' };
        },
    };
    const UserModel = buildFakeUserModel({ employees });

    const contacts = await getWorkplaceContacts(
        { _id: 'manager-1', role: 'manager' },
        { WorkplaceModel, UserModel },
    );

    assert.deepEqual(contacts.map((c) => c.id), ['employee-1']);
});

test('getWorkplaceContacts returns an empty list if the workplace record has vanished', async () => {
    const WorkplaceModel = { async findById() { return null; } };

    const contacts = await getWorkplaceContacts(
        { _id: 'employee-1', role: 'employee', workplace: 'workplace-1', workplace_status: 'approved' },
        { WorkplaceModel, UserModel: buildFakeUserModel() },
    );

    assert.deepEqual(contacts, []);
});

// Regression test: real dev/test data showed a manager's own User document
// can end up with workplace/workplace_status fields set too (e.g. leftover
// from an old flow), which used to satisfy both the manager lookup AND the
// (previously role-blind) employees query — the same person showing up
// twice in the contact list, as two identical "John Smith" entries.
test('getWorkplaceContacts does not duplicate the manager when their own record also matches the employees query', async () => {
    const manager = { _id: 'manager-1', first_name: 'John', last_name: 'Smith', role: 'manager', active: true };
    const employees = [
        { _id: 'manager-1', first_name: 'John', last_name: 'Smith', role: 'manager', workplace: 'workplace-1' },
        { _id: 'employee-1', first_name: 'Eve', last_name: 'One', role: 'employee', workplace: 'workplace-1' },
    ];

    const WorkplaceModel = { async findById() { return { _id: 'workplace-1', manager_id: 'manager-1' }; } };
    const UserModel = buildFakeUserModel({ managerById: manager, employees });

    const contacts = await getWorkplaceContacts(
        { _id: 'employee-2', role: 'employee', workplace: 'workplace-1', workplace_status: 'approved' },
        { WorkplaceModel, UserModel },
    );

    assert.deepEqual(contacts.map((c) => c.id), ['manager-1', 'employee-1']);
});

// Same scenario, but the stray record is mislabeled role 'employee' too —
// the role filter alone wouldn't catch that, so the explicit exclusion of
// workplace.manager_id from the employees query has to.
test('getWorkplaceContacts still excludes the manager\'s id from the employees list even if it were mislabeled', async () => {
    const manager = { _id: 'manager-1', first_name: 'John', last_name: 'Smith', role: 'manager', active: true };
    const employees = [
        { _id: 'manager-1', first_name: 'John', last_name: 'Smith', role: 'employee', workplace: 'workplace-1' },
        { _id: 'employee-1', first_name: 'Eve', last_name: 'One', role: 'employee', workplace: 'workplace-1' },
    ];

    const WorkplaceModel = { async findById() { return { _id: 'workplace-1', manager_id: 'manager-1' }; } };
    const UserModel = buildFakeUserModel({ managerById: manager, employees });

    const contacts = await getWorkplaceContacts(
        { _id: 'employee-2', role: 'employee', workplace: 'workplace-1', workplace_status: 'approved' },
        { WorkplaceModel, UserModel },
    );

    assert.deepEqual(contacts.map((c) => c.id), ['manager-1', 'employee-1']);
});
