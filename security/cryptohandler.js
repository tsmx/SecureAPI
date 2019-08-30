const crypto = require('crypto');

module.exports.createHash = function (password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
};

module.exports.createRandomString = function (len) {
    return crypto.randomBytes(len).toString('hex');;
};