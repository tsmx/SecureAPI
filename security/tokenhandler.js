const jwt = require('jsonwebtoken');
// TODO create cryptographic secure secret
const secret = 'ThiSISAsecrET';

module.exports.createAndSendToken = function(res, user) {
    jwt.sign({ user: user }, secret, { expiresIn: '30s' }, (err, token) => {
        res.json({
            token: token
        });
    });
};

module.exports.verifyToken = function(req, res, next) {
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
};
