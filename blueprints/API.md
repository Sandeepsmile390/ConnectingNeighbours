# API.md — Connecting Neighbors API Blueprint

## Base

- **Base path:** `/api`
- **Auth mechanism:** Cookie-based session (`sid` HttpOnly cookie)
- **Content-Type:** `application/json`
- **CORS:** `credentials: true, origin: true` (allows all origins with credentials)

All authenticated endpoints check `req.isAuthenticated()` and return `401 { error: "Unauthorized" }` if not logged in.

---

## Auth Endpoints

### `GET /api/healthz`
Health check. No auth required.

**Response 200:**
```json
{ "status": "ok" }
```

---

### `GET /api/auth/user`
Get current session user (Replit auth identity — from `users` table, not `neighborhood_users`).

**Response 200:**
```json
{
  "user": {
    "id": "replit-uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "profileImageUrl": "https://..."
  }
}
```
Returns `{ "user": null }` if not authenticated (200, not 401).

---

### `GET /api/auth/me`
Get current user's neighborhood profile (app-level `neighborhood_users` record).

**Auth:** Required

**Response 200:**
```json
{
  "id": 1,
  "replitId": "replit-uuid",
  "name": "Jane Doe",
  "username": "janedoe",
  "bio": "Love gardening and baking.",
  "apartment": "4B",
  "avatarUrl": "https://...",
  "phone": null,
  "isVerified": true,
  "joinedAt": "2024-01-15T10:00:00Z"
}
```

---

### `GET /api/login`
Start OIDC login flow (PKCE). Redirects to Replit OIDC provider.

**Query params:** `returnTo` (optional, must start with `/`)

**Response:** 302 redirect to `https://replit.com/oidc/auth?...`

Sets cookies: `code_verifier`, `nonce`, `state`, `return_to` (all HttpOnly, Secure, SameSite=Lax, 10 min TTL)

---

### `GET /api/callback`
OIDC callback. Exchanges auth code for tokens, creates session.

**Response:** 302 redirect to `returnTo` (default `/`)

Sets cookie: `sid` (session ID, 7-day TTL). Clears OIDC temporary cookies.

---

### `GET /api/logout`
Clears session cookie + DB session, redirects to Replit end-session URL.

**Response:** 302 redirect

---

### `POST /api/mobile-auth/token-exchange`
Mobile PKCE token exchange (Expo apps).

**Body:**
```json
{
  "code": "string",
  "code_verifier": "string",
  "redirect_uri": "string",
  "state": "string",
  "nonce": "string | null"
}
```

**Response 200:**
```json
{ "token": "session-id-string" }
```

---

### `POST /api/mobile-auth/logout`
Delete mobile session by Bearer token.

**Response 200:**
```json
{ "success": true }
```

---

## Users Endpoints

### `GET /api/users`
List all neighborhood members. No auth required.

**Response 200:** Array of User objects

```json
[
  {
    "id": 1,
    "replitId": "...",
    "name": "Jane Doe",
    "username": "janedoe",
    "bio": "...",
    "apartment": "4B",
    "avatarUrl": "https://...",
    "phone": null,
    "isVerified": true,
    "joinedAt": "2024-01-15T10:00:00Z"
  }
]
```

Sorted by `joined_at` ascending.

---

### `GET /api/users/:id`
Get single user by neighborhood user ID.

**Response 200:** User object
**Response 404:** `{ "error": "User not found" }`

---

### `PUT /api/users/:id`
Update user profile. **Auth required.**

**Body:**
```json
{
  "name": "string",
  "bio": "string",
  "apartment": "string",
  "phone": "string",
  "avatarUrl": "string"
}
```
All fields optional.

**Response 200:** Updated User object

---

## Posts Endpoints

### `GET /api/posts`
List community feed posts. No auth required.

**Query params:**
- `category`: `general|announcement|helpNeeded|lostFound|recommendation|safety`
- `limit`: integer (default 50)
- `offset`: integer (default 0)

**Response 200:** Array of Post objects

```json
[
  {
    "id": 1,
    "authorId": 1,
    "author": { ...User },
    "title": "Weekend BBQ",
    "content": "Everyone welcome!",
    "category": "general",
    "imageUrl": null,
    "likesCount": 5,
    "commentsCount": 0,
    "isLikedByMe": false,
    "createdAt": "2024-05-01T10:00:00Z"
  }
]
```

Note: `isLikedByMe` is always `false` for unauthenticated requests.

---

### `POST /api/posts`
Create a post. **Auth required.**

**Body:**
```json
{
  "content": "string (required)",
  "title": "string (optional)",
  "category": "general|announcement|helpNeeded|lostFound|recommendation|safety",
  "imageUrl": "string (optional)"
}
```

**Response 201:** Post object

---

### `GET /api/posts/:id`
Get single post.

**Response 200:** Post object
**Response 404:** `{ "error": "Post not found" }`

---

### `DELETE /api/posts/:id`
Delete a post. **Auth required.**

**Response 204:** No content

---

### `POST /api/posts/:id/like`
Toggle like on a post. **Auth required.**

**Response 200:**
```json
{ "liked": true, "likesCount": 6 }
```

---

## Marketplace Endpoints

### `GET /api/marketplace`
List listings. No auth required.

**Query params:**
- `type`: `sell|free|rent`
- `category`: `electronics|furniture|clothing|books|groceries|appliances|other`

**Response 200:** Array of Listing objects

```json
[
  {
    "id": 1,
    "sellerId": 1,
    "seller": { ...User },
    "title": "Standing Desk",
    "description": "Good condition...",
    "price": 150,
    "type": "sell",
    "category": "furniture",
    "imageUrl": null,
    "isAvailable": true,
    "createdAt": "2024-05-01T10:00:00Z"
  }
]
```

---

### `POST /api/marketplace`
Create a listing. **Auth required.**

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "type": "sell|free|rent (required)",
  "category": "electronics|... (required)",
  "price": 150,
  "imageUrl": "string"
}
```

**Response 201:** Listing object

---

### `GET /api/marketplace/:id`
Get single listing.

**Response 200:** Listing object

---

### `PUT /api/marketplace/:id`
Update a listing. **Auth required.**

**Body:**
```json
{
  "title": "string",
  "description": "string",
  "price": 100,
  "isAvailable": false
}
```

**Response 200:** Updated Listing object

---

### `DELETE /api/marketplace/:id`
Delete listing. **Auth required.**

**Response 204:** No content

---

## Events Endpoints

### `GET /api/events`
List community events. No auth required.

**Response 200:** Array of Event objects

```json
[
  {
    "id": 1,
    "organizerId": 1,
    "organizer": { ...User },
    "title": "Block Party",
    "description": "Annual summer party",
    "location": "Community Garden",
    "startsAt": "2024-06-15T18:00:00Z",
    "endsAt": "2024-06-15T22:00:00Z",
    "rsvpCount": 12,
    "isRsvpedByMe": false,
    "createdAt": "2024-05-01T10:00:00Z"
  }
]
```

---

### `POST /api/events`
Create an event. **Auth required.**

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "location": "string (required)",
  "startsAt": "ISO datetime string (required)",
  "endsAt": "ISO datetime string (optional)"
}
```

**Response 201:** Event object

---

### `GET /api/events/:id`
Get single event.

**Response 200:** Event object

---

### `POST /api/events/:id/rsvp`
Toggle RSVP. **Auth required.**

**Response 200:**
```json
{ "rsvped": true, "rsvpCount": 13 }
```

---

## Alerts Endpoints

### `GET /api/alerts`
List safety alerts. No auth required.

**Response 200:** Array of Alert objects

```json
[
  {
    "id": 1,
    "reporterId": 1,
    "reporter": { ...User },
    "title": "Suspicious vehicle",
    "description": "...",
    "severity": "medium",
    "isResolved": false,
    "createdAt": "2024-05-01T10:00:00Z"
  }
]
```

---

### `POST /api/alerts`
Create a safety alert. **Auth required.**

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "severity": "low|medium|high|emergency (required)"
}
```

**Response 201:** Alert object

---

## Resources Endpoints

### `GET /api/resources`
List shared resources. No auth required.

**Query params:**
- `type`: `ride|item|service|childcare`

**Response 200:** Array of Resource objects

```json
[
  {
    "id": 1,
    "offererId": 1,
    "offerer": { ...User },
    "title": "Power Drill",
    "description": "Borrow anytime",
    "type": "item",
    "isAvailable": true,
    "createdAt": "2024-05-01T10:00:00Z"
  }
]
```

---

### `POST /api/resources`
Offer a resource. **Auth required.**

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "type": "ride|item|service|childcare (required)"
}
```

**Response 201:** Resource object

---

### `DELETE /api/resources/:id`
Remove resource. **Auth required.**

**Response 204:** No content

---

## Feed Endpoints

### `GET /api/feed/stats`
Dashboard community stats.

**Response 200:**
```json
{
  "totalMembers": 25,
  "totalPosts": 143,
  "activeListings": 18,
  "upcomingEvents": 3,
  "activeAlerts": 1,
  "availableResources": 12
}
```

---

### `GET /api/feed/activity`
Aggregated recent activity feed (max 20 items).

**Response 200:**
```json
[
  {
    "id": "post-5",
    "type": "post",
    "title": "Lost cat found!",
    "description": "Found near the park...",
    "actorName": "Jane Doe",
    "actorAvatar": "https://...",
    "createdAt": "2024-05-01T10:00:00Z"
  }
]
```

`type` values: `post`, `listing`, `event`, `alert`, `resource`

---

## Error Responses

All errors return JSON:
```json
{ "error": "message string" }
```

| Status | Scenario |
|---|---|
| 400 | Invalid body (Zod validation failure) |
| 401 | Not authenticated / session expired |
| 404 | Entity not found |
| 500 | Internal server error |

---

## Security Notes

1. **No rate limiting** currently implemented (good first improvement)
2. **No row-level ownership enforcement** on delete/update — frontend hides buttons but server does not verify the requester owns the resource
3. **Session refresh:** `authMiddleware` auto-refreshes expired tokens using `refresh_token` if available via `openid-client.refreshTokenGrant`
4. **PKCE enforced** on all web login flows — prevents auth code interception
5. **`sameSite: lax`** on all auth cookies — allows top-level navigation redirects but blocks CSRF from third-party contexts
6. **`REPLIT_DOMAINS`** used for callback URL construction — never relies on user-controlled headers
