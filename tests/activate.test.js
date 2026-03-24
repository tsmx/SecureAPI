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

describe('GET /api/activate', () => {
    test('returns 403 when username is missing', async () => {
        const res = await request(app)
            .get('/api/activate')
            .query({ activation: 'code123' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when activation code is missing', async () => {
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when user is not found', async () => {
        mockFindOne.mockResolvedValue(null);
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice', activation: 'code123' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when activation key does not match', async () => {
        mockFindOne.mockResolvedValue({
            username: 'alice',
            activation: { key: 'correctcode', validUntil: new Date(Date.now() + 100000) }
        });
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice', activation: 'wrongcode' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when activation code is expired', async () => {
        mockFindOne.mockResolvedValue({
            username: 'alice',
            activation: { key: 'code123', validUntil: new Date(Date.now() - 1000) }
        });
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice', activation: 'code123' });
        expect(res.status).toBe(403);
    });

    test('returns 200 with message and userName on successful activation', async () => {
        const savedUser = { username: 'alice' };
        const saveMock = jest.fn().mockResolvedValue(savedUser);
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: false,
            activation: { key: 'code123', validUntil: new Date(Date.now() + 100000) },
            save: saveMock
        });
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice', activation: 'code123' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'user activated');
        expect(res.body).toHaveProperty('userName', 'alice');
    });

    test('returns 403 when save fails during activation', async () => {
        const saveMock = jest.fn().mockRejectedValue(new Error('db write error'));
        mockFindOne.mockResolvedValue({
            username: 'alice',
            active: false,
            activation: { key: 'code123', validUntil: new Date(Date.now() + 100000) },
            save: saveMock
        });
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice', activation: 'code123' });
        expect(res.status).toBe(403);
    });

    test('returns 403 when database query fails', async () => {
        mockFindOne.mockRejectedValue(new Error('db error'));
        const res = await request(app)
            .get('/api/activate')
            .query({ username: 'alice', activation: 'code123' });
        expect(res.status).toBe(403);
    });
});
