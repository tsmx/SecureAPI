# AGENTS.md — SecureAPI

Guidelines for agentic coding assistants working in this repository.

---

## Project Overview

SecureAPI is a Node.js/Express REST API providing user registration, login, and account activation with JWT-based authentication and MongoDB persistence. The codebase is plain JavaScript (CommonJS), with no build step or TypeScript compilation.

**Stack:** Node.js · Express 5 · Mongoose 9 · jsonwebtoken 9 · MongoDB

---

## Repository Structure

```
SecureAPI/
├── app.js                  # Express app entry point (port 5000)
├── package.json
├── database/
│   ├── db.js               # Mongoose connection setup
│   └── userSchema.js       # User Mongoose model
└── security/
    ├── cryptohandler.js    # SHA-256 hashing and random-string utilities
    ├── tokenhandler.js     # JWT creation and Express middleware (verifyToken)
    └── userhandler.js      # Route handlers: loginUser, registerUser, activateUser
```

---

## Commands

### Start the server
```bash
npm start          # runs: node app.js  (listens on port 5000)
```

### Run tests
```bash
npm test                                        # run all tests
npm test -- --coverage                          # run all tests with coverage report
npx jest tests/login.test.js                   # run a single test file
npx jest --testNamePattern "returns 200"       # run tests matching a name
```

Tests live in `tests/` and use **Jest** + **supertest**. MongoDB is mocked via
`jest.mock('../database/userSchema')` — no live database is required.

Coverage is reported to [Coveralls](https://coveralls.io/) via the CI workflow.
The workflow runs a parallel build across Node.js 20.x, 22.x, and 24.x and
uses `coverallsapp/github-action@v2` with `parallel: true` per matrix job and
a dedicated `finish` job (`parallel-finished: true`) to close the build.

### Linting / Formatting
No linter or formatter is configured. If you introduce one, prefer ESLint with
`eslint:recommended` and Prettier for formatting. Do not commit a linter config
unless explicitly asked to.

---

## Code Style

### Language
- **Plain JavaScript (CommonJS)**. No TypeScript, no JSX, no transpilation.
- Node.js built-in modules and CommonJS `require`/`module.exports` only.
- No `import`/`export` (ES Modules) — do not introduce them.

### Module Imports
Use `const` for all `require()` calls in `security/` files. The `database/`
files historically use `var`, but prefer `const` in any new code.

Destructure named exports at the import site:
```js
const createToken = require('./tokenhandler').createToken;
const verifyToken = require('./security/tokenhandler').verifyToken;
```

Group imports in this order (no blank line required between groups, but keep
stdlib before third-party before local):
1. Node.js built-in modules (`crypto`, `path`, …)
2. Third-party packages (`express`, `jsonwebtoken`, `mongoose`, …)
3. Local project modules (`./database/db`, `./security/userhandler`, …)

### Exports
Use named `module.exports` assignments, not a single object literal:
```js
module.exports.functionName = function (...) { ... };
```
Do not use `module.exports = { ... }` object shorthand.

### Formatting
- **Indentation:** 4 spaces (no tabs).
- **Semicolons:** always required at end of statements.
- **Quotes:** single quotes for all string literals.
- **Braces:** opening brace on the same line as the statement (`K&R` style).
- **Line length:** keep lines under ~100 characters where practical.

```js
// Correct
if (!req.body.username) {
    res.sendStatus(403);
    return;
}

// Wrong — no brace on new line, double quotes, missing semi
if (!req.body.username)
{
    res.sendStatus(403)
}
```

### Naming Conventions
| Construct | Convention | Example |
|---|---|---|
| Files | `camelCase` | `userhandler.js`, `tokenhandler.js` |
| Functions | `camelCase` | `loginUser`, `createHash`, `verifyToken` |
| Variables / constants | `camelCase` | `authorizationHeader`, `validDate` |
| Mongoose model name (string) | lowercase | `'users'` |
| HTTP secret / env values | camelCase (not SCREAMING_SNAKE) | `const secret = ...` |

Do **not** use `PascalCase` for regular functions or variables. Reserve
`PascalCase` only for constructor functions / Mongoose schema constructors.

### Async Patterns
The project uses **Promise `.then()/.catch()` chains** and **callbacks** — not
`async/await`. Prefer `.then()/.catch()` for Mongoose queries and other
Promise-returning calls to stay consistent with the existing code:

```js
userSchema.findOne({ username: req.body.username })
    .then((user) => {
        // handle result
    })
    .catch((error) => {
        console.log('loginUser: error while querying user: ' + error);
        res.sendStatus(403);
    });
```

Use the callback form for `jwt.sign` / `jwt.verify` (as already done in
`tokenhandler.js`), not the synchronous throwing versions.

### Error Handling
- Use **early-return guard clauses** for missing/invalid input at the top of
  each handler before any async work:
  ```js
  if (!req.body.username || !req.body.password) {
      res.sendStatus(403);
      return;
  }
  ```
- All error responses use `res.sendStatus(403)` — do not introduce 500 or 401
  responses without a discussion; the convention is to always return 403.
- Log errors with `console.log()` using string concatenation:
  ```js
  console.log('handlerName: description: ' + error);
  ```
  Do not use template literals for log messages and do not introduce a
  structured logger without discussion.
- Do **not** expose internal error details in HTTP responses (e.g., no
  `res.json({ error: err.message })`).

### HTTP Responses
```js
res.sendStatus(403);              // all error/forbidden/validation-fail cases
res.json({ message: '...', data: { ... } });  // success with body
res.status(200).json({ ... });    // explicit 200 is acceptable but optional
```

---

## Environment & Configuration

- MongoDB connection string is hardcoded in `database/db.js` as
  `mongodb://mongoservice:27017/secureapi`. In a real environment this should
  be an environment variable.
- The JWT secret is hardcoded in `security/tokenhandler.js`. There is a TODO
  comment noting it must be replaced with a cryptographically secure value
  loaded from the environment before any production use.
- Do **not** commit real secrets. Use `process.env.SECRET` or similar and
  document the variable name here when you add it.

---

## Known Issues / Tech Debt

- `database/db.js` uses `var` declarations — inconsistent with the rest of the
  codebase; use `const`/`let` in new code.
- `security/cryptohandler.js` has a double semicolon `;;` on the
  `createRandomString` return statement.
- JWT expiry is set to `'30s'` — likely too short for production.
- No input sanitisation beyond null checks; consider adding validation
  (e.g., express-validator) before expanding the API surface.

---

## Adding New Features

1. **New route handler:** add it to `security/userhandler.js` and export with
   `module.exports.handlerName = function (req, res) { ... };`.
2. **Register the route** in `app.js` following the existing pattern:
   ```js
   app.post('/route', verifyToken, userhandler.newHandler);
   ```
3. **New schema fields:** add to `database/userSchema.js` using the existing
   Mongoose `Schema` style.
4. **New utility/crypto helper:** add to `security/cryptohandler.js` and
   export with `module.exports.helperName = function (...) { ... };`.
5. Write a test for any new logic (even if the test suite is currently empty).
