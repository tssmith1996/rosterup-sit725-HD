const User = require('../models/User');
const Workplace = require('../models/Workplace');
const { resolveUserWorkplaceId } = require('./chat-room.service');

// Powers the chat "who can I message?" contact list. Deliberately scoped to
// "my own workplace" only — the same isolation boundary group chat already
// uses (see chat-room.service.js's resolveUserWorkplaceId): people from
// different workplaces/companies never see each other here, and a
// still-pending employee doesn't show up (or see anyone) until a manager
// approves them, same as group chat.
async function getWorkplaceContacts(currentUser, dependencies = {}) {
    const WorkplaceModel = dependencies.WorkplaceModel || Workplace;
    const UserModel = dependencies.UserModel || User;

    const workplaceId = await resolveUserWorkplaceId(currentUser, dependencies);
    if (!workplaceId) return [];

    const workplace = await WorkplaceModel.findById(workplaceId);
    if (!workplace) return [];

    const currentUserId = String(currentUser._id || currentUser.id);
    const contacts = [];

    // The manager never has their own User.workplace field set (only
    // employees get that, via invite-code registration), so unlike
    // employees they can't be picked up by the User.find() below — they're
    // looked up separately via Workplace.manager_id instead.
    if (String(workplace.manager_id) !== currentUserId) {
        const manager = await UserModel.findById(workplace.manager_id)
            .select('first_name last_name role active');
        if (manager && manager.active) {
            contacts.push(toContact(manager));
        }
    }

    // role: 'employee' and excluding manager_id are both explicit here on
    // purpose, not just belt-and-suspenders: real test/dev data has shown a
    // manager's own account can end up with workplace/workplace_status
    // fields set (e.g. from an old flow or manual DB edit) even though the
    // app never sets them on a manager today. Without these two guards a
    // manager like that would be pulled in twice — once from the lookup
    // above, once here — and show up as two identical contacts.
    const employees = await UserModel.find({
        workplace: workplaceId,
        workplace_status: 'approved',
        active: true,
        role: 'employee',
        _id: { $nin: [currentUserId, String(workplace.manager_id)] },
    }).select('first_name last_name role');

    employees.forEach((employee) => contacts.push(toContact(employee)));

    // Final safety net: de-dupe by id regardless of how a repeat got in.
    // Cheap, and means a messy real-world record can never surface as two
    // identical entries in the picker even if some other edge case we
    // haven't thought of slips past the guards above.
    const seenIds = new Set();
    return contacts.filter((contact) => {
        const id = String(contact.id);
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    });
}

function toContact(user) {
    return {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
    };
}

module.exports = { getWorkplaceContacts };
