# SecureAPI

[![CI](https://github.com/tsmx/SecureAPI/actions/workflows/git-build.yml/badge.svg)](https://github.com/tsmx/SecureAPI/actions/workflows/git-build.yml)
[![Coverage Status](https://coveralls.io/repos/github/tsmx/SecureAPI/badge.svg?branch=master)](https://coveralls.io/github/tsmx/SecureAPI?branch=master)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A hands-on learning project that demonstrates how to secure a REST API using **JSON Web Tokens (JWT)**. It covers the full user lifecycle: registration, account activation, login, and accessing a protected route — all built with Node.js, Express, and MongoDB.

---

## How it works

This project walks through the three core concepts behind JWT-based API security:

**1. Identity — who are you?**
A user registers with a username, password, and email. The password is never stored in plain text — it is hashed using SHA-256 with a unique random salt.

**2. Verification — are you really who you say you are?**
Before a user can log in, their account must be activated using a one-time activation code (simulating an email confirmation step). This prevents bots from creating and immediately using accounts.

**3. Access — what are you allowed to do?**
After a successful login the server issues a signed JWT. The client must include this token in every subsequent request to a protected route. The server verifies the token's signature and expiry on each request — no session state is stored on the server.

### The full flow

```
Client                          Server
  |                               |
  |-- POST /api/register -------->|  Creates user, returns activation code
  |                               |
  |-- GET  /api/activate -------->|  Activates account (simulates email link)
  |                               |
  |-- POST /api/login ----------->|  Verifies credentials, returns JWT
  |                               |
  |-- POST /api/secure           |
  |   Authorization: Bearer <JWT>|  Verifies token, returns protected data
  |<------------------------------|
```

---

## Project structure

```
SecureAPI/
├── app.js                  # Express app, route definitions, server entry point
├── package.json
├── database/
│   ├── db.js               # Mongoose connection setup
│   └── userSchema.js       # User model (username, password, salt, activation, ...)
└── security/
    ├── cryptohandler.js    # SHA-256 hashing and random-string utilities
    ├── tokenhandler.js     # JWT creation (createToken) and Express middleware (verifyToken)
    └── userhandler.js      # Route handlers: loginUser, registerUser, activateUser
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [Docker](https://www.docker.com/) (to run MongoDB locally)

---

## MongoDB setup with Docker

The app connects to MongoDB at `mongodb://mongoservice:27017/secureapi`. Run the following command to start a matching container — the `--name` flag sets the hostname to exactly what the app expects:

```bash
docker run -d \
  --name mongoservice \
  -p 27017:27017 \
  mongo:latest
```

That's it. The `secureapi` database and `users` collection are created automatically on first use.

> To stop and remove the container when you're done:
> ```bash
> docker stop mongoservice && docker rm mongoservice
> ```

---

## Getting started

```bash
git clone https://github.com/tsmx/SecureAPI.git
cd SecureAPI
npm install
npm start
```

The server listens on **port 5000**. You should see:

```
Mongoose default connection open to mongodb://mongoservice:27017/secureapi
SecureAPI server running on port 5000
```

---

## API reference

### `GET /`

Health check — confirms the service is running.

| | |
|---|---|
| Auth required | No |
| Request body | None |

**Response 200**
```json
{ "message": "SecureAPI service is running..." }
```

```bash
curl http://localhost:5000/
```

---

### `POST /api/register`

Creates a new (inactive) user account and returns the activation code.

| | |
|---|---|
| Auth required | No |
| Content-Type | `application/json` |

**Request body**
| Field | Type | Required |
|---|---|---|
| `username` | string | yes |
| `password` | string | yes |
| `email` | string | yes |

**Response 200**
```json
{
  "message": "user created",
  "userName": "alice",
  "validationCode": "<64-char activation key>"
}
```

**Response 403** — missing fields, or username/email already taken.

```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "s3cr3t!", "email": "alice@example.com"}'
```

---

### `GET /api/activate`

Activates an account using the code returned by `/api/register`. In a real application this link would be sent by email.

| | |
|---|---|
| Auth required | No |

**Query parameters**
| Parameter | Required |
|---|---|
| `username` | yes |
| `activation` | yes |

**Response 200**
```json
{
  "message": "user activated",
  "userName": "alice"
}
```

**Response 403** — unknown user, wrong code, or code has expired (valid for 7 days).

```bash
curl "http://localhost:5000/api/activate?username=alice&activation=<validationCode>"
```

---

### `POST /api/login`

Authenticates a user and returns a signed JWT.

| | |
|---|---|
| Auth required | No |
| Content-Type | `application/json` |

**Request body**
| Field | Type | Required |
|---|---|---|
| `username` | string | yes |
| `password` | string | yes |

**Response 200**
```json
{ "token": "<JWT>" }
```

**Response 403** — wrong credentials, inactive account, or account locked (10+ failed attempts).

```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "s3cr3t!"}'
```

---

### `POST /api/secure`

A protected endpoint. Only accessible with a valid JWT in the `Authorization` header. Demonstrates how `verifyToken` middleware works.

| | |
|---|---|
| Auth required | Yes — `Authorization: Bearer <token>` |

**Response 200**
```json
{
  "message": "secured area",
  "authData": { "user": "alice", "iat": 1234567890, "exp": 1234567920 }
}
```

**Response 403** — missing, malformed, expired, or invalid token.

```bash
# Successful request
curl -X POST http://localhost:5000/api/secure \
  -H "Authorization: Bearer <token>"

# No token — returns 403
curl -X POST http://localhost:5000/api/secure
```

---

## Running the tests

Tests use [Jest](https://jestjs.io/) and [supertest](https://github.com/ladjs/supertest). No live database is required — MongoDB is fully mocked.

```bash
npm test                   # run all tests
npm test -- --coverage     # run with coverage report
npx jest tests/login.test.js              # single file
npx jest --testNamePattern "returns 200"  # by test name
```

---

## Security notes for learners

> **JWT payloads are signed, not encrypted.**
> A JWT consists of three Base64-encoded parts separated by dots: `header.payload.signature`. The header and payload are only *encoded* — not *encrypted* — which means anyone who gets hold of a token can decode and read its contents without knowing the secret. The signature ensures the token has not been *tampered with*, but it provides no confidentiality. Never put sensitive data (passwords, personal details, internal IDs) inside a JWT payload.

This project is intentionally simple to keep the focus on learning. Before using any of these patterns in production, be aware of the following:

- **JWT secret is hardcoded** in `security/tokenhandler.js`. In production, load it from an environment variable (e.g. `process.env.JWT_SECRET`) and use a cryptographically random value of at least 256 bits.
- **Token expiry is 30 seconds** — deliberately short so you can observe expiry behaviour quickly. A real application would use 15–60 minutes for access tokens, with a separate refresh token mechanism.
- **Password hashing uses SHA-256 + random salt.** This is adequate for learning but bcrypt, scrypt, or Argon2 are the recommended choices for production because they are computationally expensive by design, making brute-force attacks much slower.
- **No input validation** beyond null checks. A production API should validate and sanitise all input (e.g. with [express-validator](https://express-validator.github.io/)).
- **MongoDB URI is hardcoded** in `database/db.js`. Move this to an environment variable before deploying.
- **Failed login attempts are tracked** (`attempts` field on the user document) and login is blocked after 10 failures — but there is no reset mechanism yet.

---

## License

[MIT](https://opensource.org/licenses/MIT)
