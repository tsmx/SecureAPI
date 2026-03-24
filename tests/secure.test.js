'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../database/db', () => ({
    connect: jest.fn(),
    mongoose: { Schema: jest.fn(), model: jest.fn() }
}));

const MockUserSchema = jest.fn();
MockUserSchema.findOne = jest.fn();
jest.mock('../database/userSchema', () => MockUserSchema);

const app = require('../app');

// The secret must match the one hardcoded in tokenhandler.js
const secret = 'ThiSISAsecrET';

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/secure', () => {
    test('returns 403 with no Authorization header', async () => {
        const res = await request(app).post('/api/secure');
        expect(res.status).toBe(403);
    });

    test('returns 403 with a malformed Authorization header', async () => {
        const res = await request(app)
            .post('/api/secure')
            .set('Authorization', 'notavalidtoken');
        expect(res.status).toBe(403);
    });

    test('returns 403 with an expired token', async () => {
        const expiredToken = jwt.sign({ user: 'alice' }, secret, { expiresIn: '0s' });
        // small delay to ensure the token has expired
        await new Promise((resolve) => setTimeout(resolve, 100));
        const res = await request(app)
            .post('/api/secure')
            .set('Authorization', 'Bearer ' + expiredToken);
        expect(res.status).toBe(403);
    });

    test('returns 200 with authData on a valid token', async () => {
        const token = jwt.sign({ user: 'alice' }, secret, { expiresIn: '60s' });
        const res = await request(app)
            .post('/api/secure')
            .set('Authorization', 'Bearer ' + token);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'secured area');
        expect(res.body).toHaveProperty('authData');
        expect(res.body.authData).toHaveProperty('user', 'alice');
    });
});
