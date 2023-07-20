const createToken = require('./tokenhandler').createToken;
const cryptoHandler = require('./cryptohandler');
const userSchema = require('../database/userSchema');

function verifyUser(user) {
    if (!user) {
        console.log('Error while querying user: user not found!');
        return false;
    }
    if (!user.active) {
        console.log('User ' + user.username + ' tries to login but is inactive - denying login!');
        return false;
    }
    if (user.attempts >= 10) {
        console.log('User ' + user.username + ' tries to login but has 10 or more failed login attempts - denying login!');
        return false;
    }
    return true;
};

module.exports.loginUser = function (req, res) {
    if (!req.body.username || !req.body.password) {
        console.log('Username and/or password not sent!');
        res.sendStatus(403);
        return;
    }
    userSchema.findOne({ username: req.body.username })
        .then((user) => {
            if (!user) {
                console.log('loginUser: user not found: ' + req.query.username);
                res.sendStatus(403);
                return;
            }
            if (!verifyUser(user)) {
                res.sendStatus(403);
                return;
            }
            console.log('loginUser: user found: ' + user.username);
            // for some hints about salting etc. see: https://crackstation.net/hashing-security.htm
            const hash = cryptoHandler.createHash(req.body.password, user.salt);
            if (hash !== user.password) {
                console.log('loginUser: password for user ' + user.username + ' is wrong!');
                // increase failed login attempts
                user.attempts += 1;
                user.save()
                    .then(() => {
                        res.sendStatus(403);
                    });
                return;
            }
            createToken(user.username,
                (err) => {
                    console.log('loginUser: error while creating token: ' + err.message);
                    res.sendStatus(403);
                },
                (token) => {
                    console.log('loginUser: login for user ' + user.username + ' successful - sending token');
                    res.json({ token: token });
                });
        })
        .catch((error) => {
            console.log('loginUser: error while querying user: ' + error);
            res.sendStatus(403);
            return;
        });
};

module.exports.registerUser = function (req, res) {
    if (!req.body.username || !req.body.password || !req.body.email) {
        console.log('registerUser: cannot create user! Please provide email, username and password');
        res.sendStatus(403);
        return;
    }
    var newUser = new userSchema();
    newUser.username = req.body.username;
    newUser.email = req.body.email;
    newUser.active = false;
    newUser.salt = cryptoHandler.createRandomString(32);
    newUser.password = cryptoHandler.createHash(req.body.password, newUser.salt);
    newUser.activation.key = cryptoHandler.createRandomString(64);
    var validDate = new Date();
    validDate.setDate(validDate.getDate() + 7);
    newUser.activation.validUntil = validDate;
    newUser.save()
        .then((saveUser) => {
            console.log('registerUser: new user created: ' + saveUser.username);
            res.status(200).json({
                message: 'user created',
                userName: saveUser.username,
                validationCode: saveUser.activation.key
            });
        })
        .catch((saveError) => {
            console.log('registerUser: error while creating new user: ' + saveError.message);
            res.status(403).json({ error: 'cannot create user' });
        });
};

module.exports.activateUser = function (req, res) {
    if (!req.query.username || !req.query.activation) {
        console.log('Username and/or activation code not sent!');
        res.sendStatus(403);
        return;
    }
    userSchema.findOne({ username: req.query.username })
        .then((user) => {
            if (!user) {
                console.log('activateUser: user not found: ' + req.query.username);
                res.sendStatus(403);
                return;
            }
            if (req.query.activation !== user.activation.key) {
                console.log('activateUser: activation code wrong for user: ' + user.username);
                res.sendStatus(403);
                return;
            }
            if (Date.now() > user.activation.validUntil) {
                console.log('activateUser: activation code too old for user: ' + user.username);
                res.sendStatus(403);
                return;
            }
            user.active = true;
            user.save()
                .then((saveUser) => {
                    console.log('activateUser: activation successful for user: ' + error);
                    res.status(200).json({
                        message: 'user activated',
                        userName: saveUser.username,
                    });
                    return;
                })
                .catch((saveError) => {
                    console.log('activateUser: activation could not be saved in db: ' + saveError.message);
                    res.sendStatus(403);
                    return;
                });
        })
        .catch((error) => {
            console.log('activateUser: error while querying user: ' + error.message);
            res.sendStatus(403);
            return;
        });
};