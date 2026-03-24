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

const app = require('../app');

afterEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/register', () => {
    test('returns 403 when username is missing', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ password: 'secret', email: 'a@b.com' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when password is missing', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'alice', email: 'a@b.com' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when email is missing', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'alice', password: 'secret' });
        expect(res.status).toBe(403);
    });

    test('returns 200 with message, userName and validationCode on valid input', async () => {
        const savedUser = {
            username: 'alice',
            activation: { key: 'abc123' }
        };
        MockUserSchema.mockImplementation(() => ({
            username: '',
            email: '',
            active: false,
            salt: '',
            password: '',
            activation: { key: '', validUntil: null },
            save: jest.fn().mockResolvedValue(savedUser)
        }));
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'alice', password: 'secret', email: 'a@b.com' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'user created');
        expect(res.body).toHaveProperty('userName', 'alice');
        expect(res.body).toHaveProperty('validationCode', 'abc123');
    });

    test('returns 403 when save rejects (e.g. duplicate username)', async () => {
        MockUserSchema.mockImplementation(() => ({
            username: '',
            email: '',
            active: false,
            salt: '',
            password: '',
            activation: { key: '', validUntil: null },
            save: jest.fn().mockRejectedValue(new Error('duplicate key'))
        }));
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'alice', password: 'secret', email: 'a@b.com' });
        expect(res.status).toBe(403);
    });
});
