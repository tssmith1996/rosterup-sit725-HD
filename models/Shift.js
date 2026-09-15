const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
    workplace: {type: mongoose.Schema.Types.ObjectId, ref: 'Workplace', required: true},
    posted_by: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    claimed_by: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    shift_date: {type: Date, required: true},
    start_time: {type: String, required: true},
    end_time: {type: String, required: true},
    shift_role: {type: String, required: true, trim: true, maxlength: 100},
    note: {type: String, trim: true, maxlength: 500},
    status: {type: String, enum: ['open', 'pending', 'covered', 'cancelled'], default: 'open'}
}, {
    timestamps: true,
    toJSON: {getters: true, virtuals: false},
    toObject: {getters: true, virtuals: false}
});

module.exports = mongoose.model('Shift', ShiftSchema);