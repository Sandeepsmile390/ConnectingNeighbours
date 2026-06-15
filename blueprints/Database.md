# Database.md — Connecting Neighbors Database Blueprint

## Engine

**PostgreSQL** (managed by Replit, accessed via `DATABASE_URL` environment variable)

ORM: **Drizzle ORM** with `drizzle-zod` for schema-derived Zod validators.

---

## Complete Schema

### Table: `users` (Replit Auth — do not drop)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `varchar` | PK, default `gen_random_uuid()` | Replit user UUID |
| `email` | `varchar` | UNIQUE | From OIDC claims |
| `first_name` | `varchar` | | |
| `last_name` | `varchar` | | |
| `profile_image_url` | `varchar` | | |
| `created_at` | `timestamp(tz)` | NOT NULL, default now | |
| `updated_at` | `timestamp(tz)` | NOT NULL, default now, `$onUpdate` | Auto-updated |

Purpose: Raw Replit auth identity. Upserted on every successful login using OIDC claims.

---

### Table: `sessions` (Replit Auth — do not drop)

| Column | Type | Constraints |
|---|---|---|
| `sid` | `varchar` | PK |
| `sess` | `jsonb` | NOT NULL |
| `expire` | `timestamp` | NOT NULL |

Index: `IDX_session_expire` on `expire` (for cleanup).

Session data shape (`sess` column):
```typescript
{
  user: {
    id: string,           // Replit user ID
    email: string | null,
    firstName: string | null,
    lastName: string | null,
    profileImageUrl: string | null,
  },
  access_token: string,
  refresh_token?: string,
  expires_at?: number,    // Unix timestamp
}
```

TTL: 7 days. Cleanup handled by checking `expire < now()` on read.

---

### Table: `neighborhood_users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | PK | App-level user ID |
| `replit_id` | `varchar(255)` | NOT NULL, UNIQUE | FK link to `users.id` |
| `name` | `varchar(255)` | NOT NULL | Display name |
| `username` | `varchar(255)` | NOT NULL | Replit username |
| `bio` | `text` | | Max 160 chars (frontend enforced) |
| `apartment` | `varchar(100)` | | Unit/house number |
| `avatar_url` | `text` | | Profile image URL |
| `phone` | `varchar(50)` | | |
| `is_verified` | `boolean` | NOT NULL, default `false` | Set to `true` on auto-create |
| `joined_at` | `timestamp(tz)` | NOT NULL, default now | |

---

### Table: `posts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | PK | |
| `author_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` | |
| `title` | `varchar(255)` | | Optional post title |
| `content` | `text` | NOT NULL | Required body text |
| `category` | `post_category` enum | NOT NULL, default `general` | |
| `image_url` | `text` | | |
| `likes_count` | `integer` | NOT NULL, default `0` | Denormalized count |
| `comments_count` | `integer` | NOT NULL, default `0` | Denormalized (no comments feature yet) |
| `created_at` | `timestamp(tz)` | NOT NULL, default now | |

**Enum `post_category`:** `general`, `announcement`, `helpNeeded`, `lostFound`, `recommendation`, `safety`

---

### Table: `post_likes`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | PK |
| `post_id` | `integer` | NOT NULL, FK → `posts.id` |
| `user_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` |
| `created_at` | `timestamp(tz)` | NOT NULL, default now |

Junction table for post likes. Toggle: insert on like, delete on unlike. No UNIQUE constraint enforced at DB level (checked in application logic first).

---

### Table: `listings`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | PK | |
| `seller_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` | |
| `title` | `varchar(255)` | NOT NULL | |
| `description` | `text` | NOT NULL | |
| `price` | `varchar(50)` | | Stored as string, parsed to Number in API |
| `type` | `listing_type` enum | NOT NULL, default `sell` | |
| `category` | `listing_category` enum | NOT NULL, default `other` | |
| `image_url` | `text` | | |
| `is_available` | `boolean` | NOT NULL, default `true` | |
| `created_at` | `timestamp(tz)` | NOT NULL, default now | |

**Enum `listing_type`:** `sell`, `free`, `rent`

**Enum `listing_category`:** `electronics`, `furniture`, `clothing`, `books`, `groceries`, `appliances`, `other`

---

### Table: `events`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | PK |
| `organizer_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` |
| `title` | `varchar(255)` | NOT NULL |
| `description` | `text` | NOT NULL |
| `location` | `varchar(255)` | NOT NULL |
| `starts_at` | `timestamp(tz)` | NOT NULL |
| `ends_at` | `timestamp(tz)` | |
| `rsvp_count` | `integer` | NOT NULL, default `0` |
| `created_at` | `timestamp(tz)` | NOT NULL, default now |

---

### Table: `event_rsvps`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | PK |
| `event_id` | `integer` | NOT NULL, FK → `events.id` |
| `user_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` |
| `created_at` | `timestamp(tz)` | NOT NULL, default now |

Junction table for event RSVPs. Toggle: insert on RSVP, delete on cancel. Checked in application logic first.

---

### Table: `alerts`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | PK |
| `reporter_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` |
| `title` | `varchar(255)` | NOT NULL |
| `description` | `text` | NOT NULL |
| `severity` | `alert_severity` enum | NOT NULL, default `low` |
| `is_resolved` | `boolean` | NOT NULL, default `false` |
| `created_at` | `timestamp(tz)` | NOT NULL, default now |

**Enum `alert_severity`:** `low`, `medium`, `high`, `emergency`

---

### Table: `resources`

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | PK |
| `offerer_id` | `integer` | NOT NULL, FK → `neighborhood_users.id` |
| `title` | `varchar(255)` | NOT NULL |
| `description` | `text` | NOT NULL |
| `type` | `resource_type` enum | NOT NULL |
| `is_available` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamp(tz)` | NOT NULL, default now |

**Enum `resource_type`:** `ride`, `item`, `service`, `childcare`

---

## Entity Relationships

```
users (1) ────────────────────── (1) neighborhood_users
                                        │
                        ┌───────────────┼───────────────┬────────────────┬──────────────┐
                       (n)             (n)              (n)              (n)             (n)
                      posts          listings          events           alerts        resources
                        │                                │
                       (n)                              (n)
                    post_likes                       event_rsvps
```

### Drizzle Relations (for `with:` queries)

```typescript
// postsTable
  author: many-to-one → neighborhoodUsersTable

// postLikesTable
  post: many-to-one → postsTable
  user: many-to-one → neighborhoodUsersTable

// listingsTable
  seller: many-to-one → neighborhoodUsersTable

// eventsTable
  organizer: many-to-one → neighborhoodUsersTable

// eventRsvpsTable
  event: many-to-one → eventsTable
  user: many-to-one → neighborhoodUsersTable

// alertsTable
  reporter: many-to-one → neighborhoodUsersTable

// resourcesTable
  offerer: many-to-one → neighborhoodUsersTable
```

---

## Seed Data

On initial setup, the following sample data is seeded (3 users, 5 posts, 3 listings, 3 events, 2 alerts, 3 resources). This gives new users a populated experience.

---

## Migration / Schema Push

```bash
pnpm --filter @workspace/db run push    # Push schema to DB (development)
```

No migration files — Drizzle Kit uses `drizzle-kit push` for dev. For production, use `drizzle-kit generate` + `drizzle-kit migrate`.

---

## DB Client Setup

```typescript
// lib/db/src/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
export * from "./schema";
```

Connection: Uses `DATABASE_URL` environment variable (Replit provides this automatically).
