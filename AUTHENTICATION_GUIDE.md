# Authentication and Session Security

## Overview

The application uses bcrypt password hashes, signed JWTs in HTTP-only cookies, database-backed account status checks, and role-based API authorization.

## Required environment

Copy `.env.example` to `.env.local` for local development. Never commit real secrets.

- `DATABASE_URL`: Prisma database connection.
- `JWT_SECRET`: required, at least 32 characters; use a cryptographically random value (for example, `openssl rand -base64 48`). There is no fallback secret. Login fails closed if it is missing or too short.
- `ADMIN_RESET_KEY`: legacy tooling key. Do not expose it to client code or use a `NEXT_PUBLIC_` prefix.
- `DEMO_SETUP_ENABLED`: demo setup is disabled by default and must not be enabled in production.

## Database update

The `User.tokenVersion` field supports server-side session revocation. After pulling these changes, update the Prisma client and local database:

```bash
npm install
npx prisma generate
npx prisma db push
```

For production, apply the equivalent schema change through your normal reviewed migration/deployment process before deploying application code. Back up the database first.

## Session and token behavior

- Tokens use HS256, an explicit issuer and audience, and a seven-day expiry.
- The cookie is HTTP-only, SameSite=Lax, Secure in production, and scoped to `/`.
- Cookie `maxAge` is expressed in seconds.
- Each token includes the user's `tokenVersion`. Protected requests verify the signature and expiry, then check the current user status and token version in the database.
- Logout increments `tokenVersion`, invalidating the current token server-side, and clears the browser cookie.
- Current role and email are loaded from the database; stale role claims in an old JWT are not trusted.
- Public registration creates only `STUDENT` accounts. Privileged roles must be granted by an authorized administrator through a trusted process.

## Authentication API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register` | Creates a student account; rejects attempts to request privileged roles |
| `POST /api/auth/login` | Verifies credentials and issues a session cookie |
| `POST /api/auth/logout` | Invalidates the session and clears the cookie |
| `GET /api/auth/me` | Returns the current active user when the session is valid |

The shared helpers in `src/lib/auth.ts` provide `getJwtSecret`, `createAuthToken`, `verifyToken`, `requireAuth`, and `requireRole`. Use these in API handlers rather than trusting user IDs or roles from request bodies.

## Authorization guidance

Administrative/destructive endpoints should use `requireRole(request, ['ADMIN'])`. Never authorize an operation based on a caller-supplied `adminId`, role field, or an admin key sent from a browser. API endpoints that read or mutate personal, kitchen, roster, leave, food-menu, or student data must enforce authentication and the appropriate role at the server, even if the frontend redirects unauthenticated users.

The dashboard's client-side route checks are a usability layer, not an authorization boundary.

## Frontend session flow

1. `AuthProvider` calls `GET /api/auth/me` during initial load.
2. Login sends credentials to `POST /api/auth/login`; the browser stores the HTTP-only cookie automatically.
3. Protected pages wait for the initial auth check before deciding whether to redirect.
4. Logout calls `POST /api/auth/logout`, clears client state, and navigates to the login page.

Never store JWTs in localStorage or expose them to client JavaScript.

## Tests

Run focused authentication tests with:

```bash
npm test
```

These cover missing/short secrets and token claims. Integration tests should also cover registration role escalation, expired/tampered tokens, inactive users, logout revocation, and authorization failures against a test database.

## Operational notes

- Rotate `JWT_SECRET` if it may have been exposed; this invalidates all sessions signed with the old secret.
- Set `JWT_SECRET` consistently across all app instances.
- Do not log passwords, JWTs, cookie values, or secrets.
- A logout request clears the browser cookie even when there is no valid session token.
