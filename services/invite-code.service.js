const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 10;

function createInviteCode() {
    let code = '';

    for (let index = 0; index < CODE_LENGTH; index += 1) {
        code += ALPHABET[crypto.randomInt(ALPHABET.length)];
    }

    return `RU-${code}`;
}

async function generateUniqueInviteCode(
    WorkplaceModel,
    codeFactory = createInviteCode,
) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const inviteCode = codeFactory();
        const existingWorkplace = await WorkplaceModel.exists({
            invite_code: inviteCode,
        });

        if (!existingWorkplace) {
            return inviteCode;
        }
    }

    throw new Error('Unable to generate a unique workplace invite code');
}

module.exports = {
    createInviteCode,
    generateUniqueInviteCode,
};
