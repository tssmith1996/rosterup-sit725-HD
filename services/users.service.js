const userModel = require('../models/User');

async function getUsersService(filter) {

    const users = await userModel.find(filter);
    return users;
};

module.exports = {
    getUsersService
};