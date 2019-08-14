var mongoose = require('./db.js');

// schema for master data objects
var userSchema = mongoose.Schema({
	username: String,
	email: String,
	active: Boolean,
    password: String,
    salt: String
});

// compile & export the master data model
module.exports = mongoose.model('users', userSchema, 'users');