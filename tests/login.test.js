'use strict';

const request = require('supertest');

jest.mock('../database/db', () => ({
    connect: jest.fn(),
    mongoose: { Schema: jest.fn(), model: jest.fn() }
}));

// Mock userSchema as a constructor function with static methods
const mockFindOne = jest.fn();
const MockUserSchema = jest.fn();
MockUserSchema.findOne = mockFindOne;
jest.mock('../database/userSchema', () => MockUserSchema);

jest.mock('jsonwebtoken', () => ({
    ...jest.requireActual('jsonwebtoken'),
    sign: jest.fn()
}));

const app = require('../app');
const cryptoHandler = require('../security/cryptohandler');
const jwt = require('jsonwebtoken');

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/login', () => {
    test('returns 403 when username is missing', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ password: 'secret' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when password is missing', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when user is not found', async () => {
        mockFindOne.mockResolvedValue(null);
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: 'secret' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when user is inactive', async () => {
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: false,
            attempts: 0,
            password: 'hash',
            salt: 'salt'
        });
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: 'secret' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when user has 10 or more failed attempts', async () => {
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: true,
            attempts: 10,
            password: 'hash',
            salt: 'salt'
        });
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: 'secret' });
        expect(res.status).toBe(403);
    });

    test('returns 403 and increments attempts when password is wrong', async () => {
        const saveMock = jest.fn().mockResolvedValue({});
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: true,
            attempts: 0,
            password: 'correcthash',
            salt: 'salt',
            save: saveMock
        });
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: 'wrongpassword' });
        expect(res.status).toBe(403);
        expect(saveMock).toHaveBeenCalledTimes(1);
    });

    test('returns 200 with a token on valid credentials', async () => {
        jwt.sign.mockImplementation((payload, secret, options, cb) => {
            jest.requireActual('jsonwebtoken').sign(payload, secret, options, cb);
        });
        const salt = cryptoHandler.createRandomString(32);
        const password = 'correctpassword';
        const hash = cryptoHandler.createHash(password, salt);
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: true,
            attempts: 0,
            password: hash,
            salt: salt
        });
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: password });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    test('returns 403 when token creation fails', async () => {
        jwt.sign.mockImplementation((payload, secret, options, cb) => {
            cb(new Error('sign error'), null);
        });
        const salt = cryptoHandler.createRandomString(32);
        const password = 'correctpassword';
        const hash = cryptoHandler.createHash(password, salt);
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: true,
            attempts: 0,
            password: hash,
            salt: salt
        });
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: password });
        expect(res.status).toBe(403);
    });

    test('returns 403 when database query fails', async () => {
        mockFindOne.mockRejectedValue(new Error('db error'));
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'alice', password: 'secret' });
        expect(res.status).toBe(403);
    });
});
