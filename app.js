const express = require('express');
const app = express();
const createToken = require('./security/tokenhandler').createToken;
const verifyToken = require('./security/tokenhandler').verifyToken;

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
    // TODO authenticate user against DB
    const user = {
        id: 1234,
        username: 'sest'
    };
    createToken(user,
        (err) => {
            res.sendStatus(403);
        },
        (token) => {
            res.json({ token: token });
        });
});

app.listen(5000, () => { console.log('SecureAPI server running on port 5000') });