const express = require('express');
const createToken = require('./security/tokenhandler').createToken;
const verifyToken = require('./security/tokenhandler').verifyToken;
const verifyUser = require('./security/userhandler').verifyUser;
const users = require('./database/userModel');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.json({
        message: 'SecureAPI service is running...'
    });
});

app.post('/api/secure', verifyToken, (req, res) => {
    res.json({
        message: 'secured area',
        authData: req.authData
    });
});

app.post('/api/login', (req, res) => {
    if (!req.body.username || !req.body.password) {
        console.log('Username and/or password not sent!');
        res.sendStatus(403);
        return;
    }
    users.findOne({ username: req.body.username }, (error, user) => {
        if (error) {
            console.log('Error while querying user: ' + error);
            res.sendStatus(403);
            return;
        }
        if (!verifyUser(user)) {
            res.sendStatus(403);
            return;
        }
        console.log('User found: ' + user.username);
        // for some hints about salting etc. see: https://crackstation.net/hashing-security.htm
        const hash = crypto.createHash('sha256').update(req.body.password + user.salt).digest('hex');
        if (hash !== user.password) {
            console.log('Password for user ' + user.username + ' is wrong!');
            // increase failed login attempts
            user.attempts += 1;
            user.save((s_err, s_res) => {
                res.sendStatus(403);
            });
            return;
        }
        createToken(user.username,
            (err) => {
                res.sendStatus(403);
            },
            (token) => {
                console.log('Login for user ' + user.username + ' successful - sending token');
                res.json({ token: token });
            });
    });
});

app.listen(5000, () => { console.log('SecureAPI server running on port 5000') });