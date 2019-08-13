const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();

// TODO create cryptographic secure secret
const secret = 'ThiSISAsecrET';

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
    jwt.sign({ user: user }, secret, (err, token) => {
        res.json({
            token: token
        });
    });
});

function verifyToken(req, res, next) {
    const authorizationHeader = req.headers['authorization'];
    if (typeof authorizationHeader !== 'undefined') {
        const bearer = authorizationHeader.split(' ');
        if(bearer.length < 2) {
            res.sendStatus(403);
        }
        const bearerToken = bearer[1];
        jwt.verify(bearerToken, secret, (err, authData) => {
            if(err) {
                res.sendStatus(403);
            } else {
                req.authData = authData;
                next();
            }
        })
    } else {
        res.sendStatus(403);
    }
}

app.listen(5000, () => { console.log('SecureAPI server running on port 5000') });