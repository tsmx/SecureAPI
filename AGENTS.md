# AGENTS.md — SecureAPI

Guidelines for agentic coding assistants working in this repository.

---

## Project Overview

SecureAPI is a Node.js/Express REST API providing user registration, login, and
account activation with JWT-based authentication and MongoDB persistence.
Plain JavaScript (CommonJS), no build step, no TypeScript.

**Stack:** Node.js · Express 5 · Mongoose 9 · jsonwebtoken 9 · MongoDB

**Routes:** `GET /` · `POST /api/login` · `POST /api/register` ·
`GET /api/activate` · `POST /api/secure` (JWT-protected)

---

## Commands

```bash
npm start                                       # node app.js — listens on port 5000
npm test                                        # run all tests (Jest + supertest)
npm test -- --coverage                          # run all tests with coverage report
npx jest tests/login.test.js                   # run a single test file
npx jest --testNamePattern "returns 200"       # run tests matching a name
```

No linter or formatter is configured. If introducing one, prefer ESLint
(`eslint:recommended`) + Prettier. Do not commit a config unless explicitly asked.

---

## Repository Structure

```
SecureAPI/
├── app.js                  # Express app entry point (port 5000)
├── package.json
├── tests/                  # Jest + supertest test suite (no live DB needed)
├── database/
│   ├── db.js               # Mongoose connection setup
│   └── userSchema.js       # User Mongoose model
└── security/
    ├── cryptohandler.js    # SHA-256 hashing and random-string utilities
    ├── tokenhandler.js     # JWT creation (createToken) + verifyToken middleware
    └── userhandler.js      # Route handlers: loginUser, registerUser, activateUser
```

---

## Code Style

### Language & Modules
- **CommonJS only.** Use `require`/`module.exports`. No `import`/`export`.
- Use `const` for all `require()` calls. The `database/` files use `var`
  historically — use `const` in any new code.
- Destructure named exports at the import site:
  ```js
  const createToken = require('./tokenhandler').createToken;
  ```
- Import order: Node built-ins → third-party packages → local modules.

### Exports
Named assignments only — never the object-literal shorthand:
```js
module.exports.functionName = function (...) { ... };  // correct
module.exports = { functionName: function () {} };      // wrong
```

### Formatting
- **4 spaces** indentation (no tabs).
- **Semicolons** always required.
- **Single quotes** for all string literals.
- **K&R braces** — opening brace on the same line.
- Lines under ~100 characters where practical.

```js
// correct
if (!req.body.username) {
    res.sendStatus(403);
    return;
}
```

### Naming
| Construct | Style | Example |
|---|---|---|
| Files | `camelCase` | `userhandler.js` |
| Functions / variables | `camelCase` | `loginUser`, `validDate` |
| Mongoose model string | lowercase | `'users'` |
| Env / secret values | `camelCase` | `const secret = ...` |

`PascalCase` only for constructor functions and Mongoose Schema constructors.

### Async Patterns
Use **Promise `.then()/.catch()` chains** for Mongoose queries — not `async/await`:
```js
userSchema.findOne({ username: req.body.username })
    .then((user) => { /* ... */ })
    .catch((error) => {
        console.log('loginUser: error while querying user: ' + error);
        res.sendStatus(403);
    });
```
Use the **callback form** of `jwt.sign` / `jwt.verify` (not the sync versions).

### Error Handling
- **Early-return guard clauses** for missing input before any async work:
  ```js
  if (!req.body.username || !req.body.password) {
      res.sendStatus(403);
      return;
  }
  ```
- All error responses use **`res.sendStatus(403)`** — do not introduce 500 or
  401 responses without discussion.
- Log with `console.log()` and string concatenation:
  ```js
  console.log('handlerName: description: ' + error);
  ```
  No template literals for log messages. No structured logger without discussion.
- Never expose internal error details in HTTP responses.

### HTTP Responses
```js
res.sendStatus(403);                          // all error / validation-fail cases
res.json({ message: '...', data: { ... } }); // success with body
res.status(200).json({ ... });                // explicit 200 also acceptable
```

---

## Testing

Tests live in `tests/` and use **Jest** + **supertest**. No live database is
required — MongoDB is fully mocked in every test file.

### Required mock boilerplate (every test file)
```js
jest.mock('../database/db', () => ({
    connect: jest.fn(),
    mongoose: { Schema: jest.fn(), model: jest.fn() }
}));

const mockFindOne = jest.fn();
const MockUserSchema = jest.fn();          // constructor mock
MockUserSchema.findOne = mockFindOne;
jest.mock('../database/userSchema', () => MockUserSchema);

const app = require('../app');             // import AFTER mocks are registered
```

`userSchema` must be mocked as a named constructor function (`jest.fn()`), not
auto-mocked, because `userhandler.js` calls it with `new userSchema()`.

### Mocking jwt.sign for error-path tests
`login.test.js` mocks `jsonwebtoken` at the module level so the `createToken`
error callback can be triggered:
```js
jest.mock('jsonwebtoken', () => ({
    ...jest.requireActual('jsonwebtoken'),
    sign: jest.fn()
}));
// in the test:
jwt.sign.mockImplementation((payload, secret, options, cb) => {
    cb(new Error('sign error'), null);
});
```

### app.js boot guard
`app.js` wraps `connectDB` / `app.listen` in `require.main === module` so tests
can `require('../app')` without triggering a real database connection.
The app is exported via `module.exports = app`.

### Coverage
CI reports coverage to [Coveralls](https://coveralls.io/) via a parallel matrix
build (Node 20.x, 22.x, 24.x). Two lines are intentionally not covered:
- `app.js:30-31` — the boot guard (unreachable via `require` in Jest).
- `userhandler.js:7-8` — dead branch in `verifyUser` (the `null` user case is
  already short-circuited in `loginUser` before `verifyUser` is called).

---

## Environment & Configuration

- MongoDB URI hardcoded in `database/db.js` as
  `mongodb://mongoservice:27017/secureapi` — use `--name mongoservice` with
  `docker run` to match without any code change.
- JWT secret hardcoded in `security/tokenhandler.js` — must be replaced with
  `process.env.JWT_SECRET` before any production use.
- Do **not** commit real secrets.

---

## Known Issues / Tech Debt

- `database/db.js` uses `var` — use `const`/`let` in new code.
- `security/cryptohandler.js` has a double semicolon `;;` on the
  `createRandomString` return statement.
- JWT expiry is `'30s'` — intentionally short for learning; too short for
  production.
- No input sanitisation beyond null checks.
- Failed login attempts are tracked but there is no reset mechanism.
