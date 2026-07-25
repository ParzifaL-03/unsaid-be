# UNSAID API

NestJS + MongoDB backend for the
[UNSAID web app](https://github.com/ParzifaL-03/unsaid-apps).

## Stack

- NestJS 11 and TypeScript
- MongoDB with Mongoose
- Zod 4 validation for request and response payloads
- Google OAuth with revocable, database-backed sessions
- HTTP-only credential cookies and explicit CORS origin

## Architecture

The code stays deliberately small:

```text
Controller → Zod → Auth guard → Service → Mongoose model
```

```text
src/
├── auth/         # Google OAuth, sessions, current-user guard
├── capsules/     # Time capsules
├── common/       # Error filter and Zod pipe
├── config/       # Validated environment
├── contracts/    # Request and response schemas
├── database/     # Schemas, models, persistent Mongo connection
├── health/       # Database readiness endpoint
├── letters/      # Public and recipient-only letters
├── moderation/   # Reports and blocks
└── posts/        # Posts, replies, and reactions
```

`DatabaseService` opens one Mongoose connection when Nest starts and keeps its
pool alive until shutdown. Runtime requests never connect or disconnect.
Indexes are intentionally synchronized only by the explicit `db:indexes`
command.

## Collections

| Collection  | Purpose                                                 |
| ----------- | ------------------------------------------------------- |
| `users`     | Private Google identity, public alias, role, and status |
| `sessions`  | Hashed session tokens with TTL expiration               |
| `posts`     | Anonymous expressions and denormalized counters         |
| `replies`   | Public and private post replies                         |
| `reactions` | Unique user echoes for posts and replies                |
| `letters`   | Public or recipient-only open letters                   |
| `capsules`  | Sealed content with unlock time and visibility          |
| `reports`   | Moderation reports and review status                    |
| `blocks`    | Unique blocker/blocked-user relationships               |

Recipient emails are never exposed in public payloads. Letter lookup stores an
HMAC hash. Content stores an alias snapshot, so rotating an alias does not
rewrite historical content.

## Setup

```bash
cp .env.example .env
npm install
npm run db:indexes
npm run dev
```

The API starts at `http://localhost:4000/api`.

For Google OAuth, configure this redirect URI:

```text
http://localhost:4000/api/auth/google/callback
```

For a cross-origin production frontend, use HTTPS and set:

```env
NODE_ENV=production
API_URL=https://api.example.com
FRONTEND_URL=https://unsaid.example.com
COOKIE_SAME_SITE=none
```

## API

```text
GET|POST    /api/posts
GET         /api/posts/:id
GET|POST    /api/posts/:id/replies
POST|DELETE /api/posts/:id/reactions
GET|POST    /api/open-letters
GET|POST    /api/capsules
POST        /api/reports
POST|DELETE /api/blocks/:userId
GET         /api/auth/google
GET         /api/auth/google/callback
GET         /api/auth/session
POST        /api/auth/sign-out
POST        /api/me/alias
GET         /api/health/database
```

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
