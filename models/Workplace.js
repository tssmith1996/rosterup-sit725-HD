const mongoose = require('mongoose');

const WorkplaceSchema = new mongoose.Schema({ 
    workplace_name: {type: String, required: true, trim: true, maxlength: 100},
    workplace_type: {type: String, required: true, trim: true},
    workplace_address: {type: String, required: true, trim: true},
    workplace_town: {type: String, required: true, trim: true},
    workplace_postcode: {type: String, required: true, trim: true},
    invite_code: {type: String, required: true, unique: true, index: true},
    manager_id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    active: {type: Boolean, default: true}
}, {
    timestamps: true,
    toJSON: {getters: true, virtuals: false},
    toObject: {getters: true, virtuals: false},
}); 

module.exports = mongoose.model('Workplace', WorkplaceSchema);