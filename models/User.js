const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    first_name: {type: String, required: true, trim: true, maxlength: 50},
    last_name: {type: String, required: true, trim: true, maxlength: 50},
    email: {type: String, required: true, unique: true, index: true, trim: true, lowercase: true},
    password_hashed: {type: String, required: true},
    role: {type: String, required: true, enum: ['manager', 'employee']},
    workplace: {type: mongoose.Schema.Types.ObjectId, ref: 'Workplace', default: null},
    workplace_status: {type: String, enum: ['pending', 'approved', 'rejected'], default: null},
    active: {type: Boolean, default: true}
}, {
    timestamps: true,
    toJSON: {getters: true, virtuals: false},
    toObject: {getters: true, virtuals: false}
});

module.exports = mongoose.model('User', UserSchema);