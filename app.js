const express = require('express');
const connectDB = require('./database/db').connect;
const verifyToken = require('./security/tokenhandler').verifyToken;
const userHandler = require('./security/userhandler');

const app = express();

app.use(express.json());

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

app.post('/api/login', userHandler.loginUser);

app.post('/api/register', userHandler.registerUser);

app.get('/api/activate', userHandler.activateUser);

connectDB(() => {
    app.listen(5000, () => { console.log('SecureAPI server running on port 5000') });
});