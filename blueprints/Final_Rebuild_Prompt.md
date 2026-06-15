# Final_Rebuild_Prompt.md

---

## Master Prompt: Rebuild "Connecting Neighbors" App

You are a senior full-stack developer. Build a production-ready hyperlocal community app called **"Connecting Neighbors"** — a neighborhood social platform for residential colonies where residents can post updates, buy/sell/trade items, organize events, share resources, and report safety alerts.

---

## Tech Stack (non-negotiable)

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Routing:** `wouter` v3
- **Server state:** `@tanstack/react-query` v5 — wrap root with `<QueryClientProvider>`
- **Forms:** `react-hook-form` v7 + `@hookform/resolvers` + `zod` validation
- **UI components:** `shadcn/ui` (Radix UI primitives + Tailwind CSS v4)
- **Icons:** `lucide-react`
- **Date utils:** `date-fns` v3
- **Auth:** Custom `useAuth()` hook that calls `GET /api/auth/user`

### Backend
- **Node.js 24** + **Express 5** + **TypeScript**
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Replit OIDC / OpenID Connect PKCE via `openid-client` v6
- **Logging:** `pino` + `pino-http`
- **Validation:** Zod (server-side)
- **Build:** esbuild (ESM output)

---

## Brand & Design System

### Colors (CSS custom properties on `:root`)
```css
--background: 40 33% 98%;       /* warm off-white */
--foreground: 215 25% 15%;      /* dark blue-grey */
--primary: 173 58% 39%;         /* Earthy Teal #289B87 — main brand */
--primary-foreground: 0 0% 100%;
--secondary: 24 95% 53%;        /* Warm Orange/Coral #F97316 */
--secondary-foreground: 0 0% 100%;
--muted: 40 20% 92%;
--muted-foreground: 215 15% 45%;
--card: 0 0% 100%;
--border: 215 15% 85%;
--radius: 0.75rem;
```

Also implement dark mode variants (see Design.md for exact HSL values).

### Typography
- Font: **Inter** (sans-serif)
- Page headings: `text-3xl font-bold tracking-tight`
- Body: `font-sans antialiased`

### App identity
- Logo: "CN" text in a `32×32` teal `rounded-lg` box
- App name: "Neighbors" (short form in sidebar), "Connecting Neighbors" (mobile drawer)

---

## App Structure

### 9 Pages (all behind auth wall except login)

| Route | Page | Description |
|---|---|---|
| Login (no route) | Auth guard | Full-screen centered login |
| `/` | Home | Dashboard with 6 stat cards + activity feed |
| `/feed` | Community Feed | Posts with category filters, like, create |
| `/marketplace` | Marketplace | Buy/sell/free/rent listings with tabs |
| `/events` | Events | Events with RSVP, calendar-style date cards |
| `/alerts` | Safety Alerts | Color-coded severity alerts |
| `/resources` | Resources | Shared rides/items/services/childcare |
| `/members` | Members | Searchable neighbor directory |
| `/profile` | Profile | Edit profile (name, bio, apartment, phone, avatar) |

### Layout
- **Desktop (md+):** Fixed `256px` left sidebar with logo, nav links (7 items), user avatar + logout at bottom
- **Mobile:** Sticky 64px header with hamburger button opening a left Sheet drawer

### Auth Flow (web)
1. `useAuth()` fetches `GET /api/auth/user` with `credentials: "include"` on mount
2. If `user === null` → show `<Login />` page
3. Login button → `window.location.href = /api/login?returnTo=/`
4. Server handles full OIDC PKCE flow with Replit (`https://replit.com/oidc`)
5. Callback → session cookie set → redirect to `/`
6. `useAuth()` re-fetches → user set → app shown

---

## Database Schema (PostgreSQL + Drizzle ORM)

Create these tables in order:

```sql
-- Auth tables (required for session management)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IDX_session_expire ON sessions(expire);

-- Enums
CREATE TYPE post_category AS ENUM ('general','announcement','helpNeeded','lostFound','recommendation','safety');
CREATE TYPE listing_type AS ENUM ('sell','free','rent');
CREATE TYPE listing_category AS ENUM ('electronics','furniture','clothing','books','groceries','appliances','other');
CREATE TYPE alert_severity AS ENUM ('low','medium','high','emergency');
CREATE TYPE resource_type AS ENUM ('ride','item','service','childcare');

-- App tables
CREATE TABLE neighborhood_users (
  id SERIAL PRIMARY KEY,
  replit_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  bio TEXT,
  apartment VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(50),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  title VARCHAR(255),
  content TEXT NOT NULL,
  category post_category NOT NULL DEFAULT 'general',
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price VARCHAR(50),
  type listing_type NOT NULL DEFAULT 'sell',
  category listing_category NOT NULL DEFAULT 'other',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  rsvp_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  user_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'low',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  offerer_id INTEGER NOT NULL REFERENCES neighborhood_users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type resource_type NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## All API Endpoints

Mount all routes under `/api` prefix. Express middleware order:
1. pinoHttp (structured logging)
2. cors({ credentials: true, origin: true })
3. cookieParser()
4. express.json()
5. express.urlencoded({ extended: true })
6. authMiddleware (loads session → sets req.user + req.isAuthenticated())
7. router

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/healthz` | No | Health check → `{ status: "ok" }` |
| GET | `/api/auth/user` | No | Session user (Replit identity) |
| GET | `/api/auth/me` | Yes | App-level neighborhood user |
| GET | `/api/login` | No | Start OIDC flow (302 redirect) |
| GET | `/api/callback` | No | OIDC callback (302 redirect) |
| GET | `/api/logout` | No | Clear session (302 redirect) |
| POST | `/api/mobile-auth/token-exchange` | No | Mobile PKCE exchange |
| POST | `/api/mobile-auth/logout` | No | Mobile session logout |
| GET | `/api/users` | No | List all members |
| GET | `/api/users/:id` | No | Get member profile |
| PUT | `/api/users/:id` | Yes | Update profile |
| GET | `/api/posts` | No | List posts (query: category, limit, offset) |
| POST | `/api/posts` | Yes | Create post |
| GET | `/api/posts/:id` | No | Get single post |
| DELETE | `/api/posts/:id` | Yes | Delete post |
| POST | `/api/posts/:id/like` | Yes | Toggle like |
| GET | `/api/marketplace` | No | List listings (query: type, category) |
| POST | `/api/marketplace` | Yes | Create listing |
| GET | `/api/marketplace/:id` | No | Get listing |
| PUT | `/api/marketplace/:id` | Yes | Update listing |
| DELETE | `/api/marketplace/:id` | Yes | Delete listing |
| GET | `/api/events` | No | List events |
| POST | `/api/events` | Yes | Create event |
| GET | `/api/events/:id` | No | Get event |
| POST | `/api/events/:id/rsvp` | Yes | Toggle RSVP |
| GET | `/api/alerts` | No | List alerts |
| POST | `/api/alerts` | Yes | Create alert |
| GET | `/api/resources` | No | List resources (query: type) |
| POST | `/api/resources` | Yes | Create resource |
| DELETE | `/api/resources/:id` | Yes | Delete resource |
| GET | `/api/feed/stats` | No | Dashboard community stats |
| GET | `/api/feed/activity` | No | Aggregated recent activity (20 items) |

---

## Key Implementation Details

### `getOrCreateNeighborhoodUser(req)` — implement on EVERY write handler
```typescript
async function getOrCreateNeighborhoodUser(req) {
  if (!req.isAuthenticated()) return null;
  const user = req.user; // from authMiddleware
  let nbUser = await db.query.neighborhoodUsersTable.findFirst({
    where: eq(neighborhoodUsersTable.replitId, user.id)
  });
  if (!nbUser) {
    [nbUser] = await db.insert(neighborhoodUsersTable).values({
      replitId: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.id,
      username: user.id,
      avatarUrl: user.profileImageUrl,
      isVerified: true,
    }).returning();
  }
  return nbUser;
}
```

### Toggle Pattern (Like / RSVP)
```typescript
const existing = await db.query.junctionTable.findFirst({
  where: and(eq(junctionTable.entityId, id), eq(junctionTable.userId, nbUser.id))
});
if (existing) {
  await db.delete(junctionTable).where(eq(junctionTable.id, existing.id));
  // decrement count on parent
  res.json({ toggled: false, count: newCount });
} else {
  await db.insert(junctionTable).values({ entityId: id, userId: nbUser.id });
  // increment count on parent
  res.json({ toggled: true, count: newCount });
}
```

### Cache Invalidation Pattern (frontend)
```typescript
const queryClient = useQueryClient();
mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: getListEntityQueryKey() });
    toast({ title: "Success message" });
    setOpen(false);
    form.reset();
  },
  onError: () => toast({ title: "Failed", variant: "destructive" })
});
```

### Auth Callback URL Construction
```typescript
function getOrigin(req): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0].trim()}`;
  }
  const host = Array.isArray(req.headers['x-forwarded-host'])
    ? req.headers['x-forwarded-host'][0]
    : req.headers['x-forwarded-host'] || req.headers['host'];
  return `https://${host}`;
}
// callbackUrl = `${getOrigin(req)}/api/callback`
```

### Profile Form Initialization (one-time init pattern)
```typescript
const initialized = useRef(false);
useEffect(() => {
  if (user && !initialized.current) {
    form.reset({ name: user.name, bio: user.bio || '', ... });
    initialized.current = true;
  }
}, [user, form]);
```

---

## Page-by-Page Implementation Checklist

### Home (`/`)
- [ ] 6 stat cards in `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — each links to its section
- [ ] Each card: labeled icon (colored per section) top-right, `text-3xl` count, title
- [ ] "Recent Activity" full-width card — icon + actor + type + title + description + date
- [ ] Skeleton loading for both sections
- [ ] Empty state with "Create a Post" CTA

### Feed (`/feed`)
- [ ] Horizontal scrollable filter pills: All + 6 categories (rounded-full)
- [ ] "New Post" Dialog: category → title (optional) → content (required)
- [ ] Post card: avatar, name, apartment, time ago, category badge, content, like/comment footer
- [ ] Like button: heart fills + turns rose-500 when liked
- [ ] Delete button (trash icon) visible only when `user.id === post.authorId`
- [ ] Skeleton: 3 animated-pulse cards

### Marketplace (`/marketplace`)
- [ ] Tabs: All / For Sale / For Free / For Rent (filter by `type`)
- [ ] Card grid 1/2/3 columns with `h-48` image area or icon placeholder
- [ ] Type badge overlay on card image (color-coded)
- [ ] Price hidden for "free" listings; conditional price field in form
- [ ] Delete icon only for own listings

### Events (`/events`)
- [ ] 2-column grid of event cards
- [ ] Card left column: month/day in primary teal text
- [ ] Status badges: Today (orange), Tomorrow (blue), Upcoming (primary/10), Past (muted)
- [ ] Past events `opacity-70`, RSVP disabled
- [ ] RSVP button toggles label and variant

### Alerts (`/alerts`)
- [ ] Red-tinted header banner with shield icon
- [ ] "Report Issue" button is `variant="destructive"`
- [ ] Cards with `border-l-4` colored by severity
- [ ] Card header background tinted by severity
- [ ] Resolved badge in green

### Resources (`/resources`)
- [ ] Teal-tinted header (mirrors alerts layout but in teal)
- [ ] Teal Tabs: All / Items / Services / Rides / Care
- [ ] Resource type icon in teal rounded-xl tile, `scale-110` on card hover

### Members (`/members`)
- [ ] Centered heading
- [ ] Rounded-full search input, client-side filter
- [ ] 1/2 column grid, large avatar (64×64), verified badge, apartment, bio, join date

### Profile (`/profile`)
- [ ] Avatar live preview from `avatarUrl` field (`form.watch`)
- [ ] Grid: name + apartment (2 cols), bio textarea, phone, avatarUrl
- [ ] "Save Changes" + "Sign Out" (destructive ghost) in same row

---

## Environment Variables Required

```
DATABASE_URL=postgresql://...     # Postgres connection string
SESSION_SECRET=...                # Long random secret for sessions (optional — using DB-backed sessions)
REPL_ID=...                       # Replit app ID (used as OIDC client_id)
REPLIT_DOMAINS=...                # Comma-separated deployment domains (used for callback URL)
PORT=8080                         # API server port
```

---

## Goal Checklist

- [ ] Login with Replit OIDC works (no "Invalid authentication request" error)
- [ ] `QueryClientProvider` wraps the entire React app in `main.tsx`
- [ ] New users automatically get a `neighborhood_users` profile on first API write
- [ ] All 9 pages render without errors
- [ ] All CRUD operations work (create, read, delete, toggle)
- [ ] Skeleton loading states show while data is fetching
- [ ] Empty states show when data arrays are empty
- [ ] Toast notifications fire on success and error
- [ ] Delete/edit buttons only appear for content the current user owns
- [ ] Responsive layout: sidebar on desktop, drawer on mobile
- [ ] Dark mode CSS variables defined (even if toggle not implemented in UI)
- [ ] Form validation errors display inline under each field
