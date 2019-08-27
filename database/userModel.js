var mongoose = require('./db.js').mongoose;

// schema for master data objects
var userSchema = mongoose.Schema({
	username: { type: String, required: true, index: true, unique: true },
	email: { type: String, required: true, index: true, unique: true },
	active: { type: Boolean, default: false },
	password: { type: String, required: true },
	salt: { type: String, required: true },
	attempts: Number,
	description: String,
	activation: {
		key: String,
		vaildUntil: Date
	}
});

// compile & export the master data model
module.exports = mongoose.model('users', userSchema, 'users'); 