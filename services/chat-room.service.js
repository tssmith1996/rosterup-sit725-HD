const Workplace = require('../models/Workplace');

// Pure room-naming helpers — kept dependency-free so they're trivial to
// unit test, and so sockets/chat.socket.js and any future REST endpoint
// that needs to agree on a room name can both import from here instead of
// re-deriving the string format independently.

function getWorkplaceRoomName(workplaceId) {
    return `workplace:${workplaceId}`;
}

function getUserRoomName(userId) {
    return `user:${userId}`;
}

// A direct-message room is shared by exactly one pair of users. Sorting
// the two ids first means both participants compute the same room name
// regardless of who opens the conversation or sends first.
function getDirectMessageRoomName(userIdA, userIdB) {
    const [first, second] = [String(userIdA), String(userIdB)].sort();
    return `dm:${first}_${second}`;
}

// A manager's "workplace" isn't stored on their own User document (only
// employees get User.workplace set, via the invite-code registration
// flow) — it has to be looked up via Workplace.manager_id instead. An
// employee only counts as "in" their workplace for chat purposes once a
// manager has approved them; a still-pending employee shouldn't be able
// to see or post in a workplace chat they haven't actually joined yet.
async function resolveUserWorkplaceId(user, dependencies = {}) {
    const WorkplaceModel = dependencies.WorkplaceModel || Workplace;

    if (!user) return null;

    if (user.role === 'manager') {
        const workplace = await WorkplaceModel.findOne({
            manager_id: user._id || user.id,
            active: true,
        });
        return workplace ? workplace._id : null;
    }

    if (user.role === 'employee' && user.workplace_status === 'approved' && user.workplace) {
        return user.workplace;
    }

    return null;
}

module.exports = {
    getWorkplaceRoomName,
    getUserRoomName,
    getDirectMessageRoomName,
    resolveUserWorkplaceId,
};
