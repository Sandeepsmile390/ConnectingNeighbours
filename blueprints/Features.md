# Features.md — Connecting Neighbors Functional Blueprint

## Feature Overview

| # | Feature | Auth Required | CRUD |
|---|---|---|---|
| 1 | Replit Authentication | — | Login/Logout |
| 2 | Community Feed | Read: No, Write: Yes | Create, Read, Delete, Like |
| 3 | Marketplace | Read: No, Write: Yes | Create, Read, Update, Delete |
| 4 | Events | Read: No, Write: Yes | Create, Read, RSVP |
| 5 | Safety Alerts | Read: No, Write: Yes | Create, Read |
| 6 | Shared Resources | Read: No, Write: Yes | Create, Read, Delete |
| 7 | Member Directory | Yes (auto-creates profile) | Read |
| 8 | Profile Management | Yes | Read, Update |
| 9 | Dashboard / Activity Feed | No (public stats) | Read |

---

## 1. Authentication

### Login Flow
1. User visits `/` — `useAuth()` fetches `GET /api/auth/user` with `credentials: "include"`
2. If `user === null` → render `<Login />` page
3. User clicks "Join your neighborhood" → `window.location.href = /api/login?returnTo=/`
4. Server builds PKCE challenge, stores `code_verifier`, `nonce`, `state`, `return_to` in `HttpOnly; Secure; SameSite=Lax` cookies (10 min TTL)
5. Server redirects to Replit OIDC with `redirect_uri = https://${REPLIT_DOMAINS}/api/callback`
6. User authenticates at Replit
7. Replit redirects back to `/api/callback?code=...&state=...`
8. Server verifies state/nonce/PKCE, exchanges code for tokens
9. Claims extracted → user upserted in `users` table
10. Session created in `sessions` table → session ID set as `sid` cookie (7-day TTL)
11. User redirected to `return_to` (typically `/`)
12. Frontend re-fetches `GET /api/auth/user` → user object set → dashboard shown

### Session Cookie
```
Name: sid
HttpOnly: true
Secure: true
SameSite: lax
Path: /
MaxAge: 7 days (604800000 ms)
```

### OIDC Cookies (temporary, 10 min)
- `code_verifier` — PKCE verifier
- `nonce` — ID token nonce
- `state` — CSRF protection
- `return_to` — post-login redirect path

### Logout Flow
1. User clicks "Log out" → `window.location.href = /api/logout`
2. Server clears `sid` cookie, deletes session from DB
3. Redirects to Replit end-session URL → returns to app origin

### `useAuth()` Hook API
```typescript
{
  user: AuthUser | null,
  isLoading: boolean,     // true while /api/auth/user is pending
  isAuthenticated: boolean,
  login: () => void,      // navigates to /api/login?returnTo=<BASE_URL>
  logout: () => void,     // navigates to /api/logout
}
```

### `getOrCreateNeighborhoodUser(req)` Pattern
- Called at the start of every authenticated write handler
- Looks up `neighborhood_users` by `replit_id = req.user.id`
- If not found, auto-creates with: name from first+last or username, avatar from profile image, `is_verified: true`
- Returns the `NeighborhoodUser` record (the app-level user)

---

## 2. Community Feed

### List Posts
- **Endpoint:** `GET /api/posts?category=&limit=&offset=`
- **Auth:** Not required (unauthenticated users can read)
- **Filtering:** Category filter applied in memory after fetching (not SQL WHERE — simple implementation)
- **Computed field:** `isLikedByMe` — checked against current user's likes
- **Sort:** `desc(createdAt)` — newest first
- **Default limit:** 50
- **Frontend:** Horizontal pill filter buttons (client-side `useState` → refetch with new `queryKey`)

### Create Post
- **Endpoint:** `POST /api/posts`
- **Auth:** Required
- **Body:** `{ content: string (required), title?: string, category: enum, imageUrl?: string }`
- **Form validation:** Zod schema via react-hook-form
- **UI:** Dialog modal, form resets on success, cache invalidated

### Delete Post
- **Endpoint:** `DELETE /api/posts/:id`
- **Auth:** Required
- **Owner check:** Frontend only shows delete button when `user.id === post.authorId` (Note: server does not enforce author ownership — trust frontend guard)
- **Response:** 204 No Content

### Like/Unlike Post (Toggle)
- **Endpoint:** `POST /api/posts/:id/like`
- **Auth:** Required
- **Logic:** Toggle — if like exists, delete it and decrement; else insert and increment
- **Response:** `{ liked: boolean, likesCount: number }`
- **UI:** Heart icon fills (`fill-current`) and turns rose-500 when liked

---

## 3. Marketplace

### List Listings
- **Endpoint:** `GET /api/marketplace?type=&category=`
- **Auth:** Not required
- **Filtering:** Both filters applied in memory
- **Frontend filter:** Tabs component (All / For Sale / For Free / For Rent)

### Create Listing
- **Endpoint:** `POST /api/marketplace`
- **Auth:** Required
- **Body:** `{ title, description, type: enum[sell,free,rent], category: enum[electronics,...], price?: number, imageUrl?: string }`
- **Price field:** Hidden in form when `type === "free"` (watched via `form.watch("type")`)
- **Price storage:** Stored as `varchar(50)` in DB, returned as `Number` from API
- **Form:** 2-column grid for type + category, conditional price field

### Update Listing
- **Endpoint:** `PUT /api/marketplace/:id`
- **Auth:** Required
- **Body:** `{ title?, description?, price?, isAvailable?: boolean }`

### Delete Listing
- **Endpoint:** `DELETE /api/marketplace/:id`
- **Auth:** Required
- **Frontend guard:** Delete button visible only when `user.id === listing.sellerId`

---

## 4. Events

### List Events
- **Endpoint:** `GET /api/events`
- **Auth:** Not required (but `isRsvpedByMe` is always false if unauthenticated)
- **Sort:** No explicit sort in DB query (insertion order)
- **Computed field:** `isRsvpedByMe`

### Create Event
- **Endpoint:** `POST /api/events`
- **Auth:** Required
- **Body:** `{ title, description, location, startsAt: ISO string, endsAt?: ISO string }`
- **Form:** `datetime-local` HTML inputs, values converted to `.toISOString()` before submit

### RSVP Toggle
- **Endpoint:** `POST /api/events/:id/rsvp`
- **Auth:** Required
- **Logic:** Toggle via `event_rsvps` junction table
- **Response:** `{ rsvped: boolean, rsvpCount: number }`
- **UI:** Button text: "RSVP" (primary) / "Cancel RSVP" (secondary); disabled for past events

### Event Status Display
- `isPast(startDate) && !isToday` → "Past" badge (muted outline)
- `isToday(startDate)` → "Today" badge (orange-500)
- `isTomorrow(startDate)` → "Tomorrow" badge (blue-500)
- Otherwise → "Upcoming" badge (primary/10)
- Past events: card `opacity-70`, RSVP button `disabled`

---

## 5. Safety Alerts

### List Alerts
- **Endpoint:** `GET /api/alerts`
- **Auth:** Not required
- **Sort:** Default (insertion order)
- **Severity levels:** `low`, `medium`, `high`, `emergency`

### Create Alert
- **Endpoint:** `POST /api/alerts`
- **Auth:** Required
- **Body:** `{ title, description, severity: enum }`
- **UI:** "Report Issue" red destructive button, dialog with severity dropdown first for emphasis

### Severity Visual Mapping
| Severity | Badge bg | Icon |
|---|---|---|
| emergency | red | `ShieldAlert` red |
| high | orange | `AlertTriangle` orange |
| medium | yellow | `AlertTriangle` yellow |
| low | blue | `AlertTriangle` blue |
| isResolved | green | `CheckCircle2` green |

- Card left border color matches severity (`border-l-4`)
- Card header background tinted by severity class

---

## 6. Shared Resources

### List Resources
- **Endpoint:** `GET /api/resources?type=`
- **Auth:** Not required
- **Types:** `ride`, `item`, `service`, `childcare`
- **Frontend filter:** Teal-styled Tabs (All / Items / Services / Rides / Care)

### Create Resource
- **Endpoint:** `POST /api/resources`
- **Auth:** Required
- **Body:** `{ title, description, type: enum }`
- **No price** — resources are free community sharing

### Delete Resource
- **Endpoint:** `DELETE /api/resources/:id`
- **Auth:** Required
- **Frontend guard:** Delete button only visible when `user.id === resource.offererId`

### Resource Type Icons
| Type | Icon |
|---|---|
| ride | `Car` |
| service | `Hammer` |
| childcare | `Baby` |
| item (default) | `Box` |

---

## 7. Member Directory

### List Users
- **Endpoint:** `GET /api/users`
- **Auth:** Not enforced (but auto-creates neighborhood profile for auth users)
- **Sort:** `orderBy(joinedAt)` — oldest first
- **Client-side search:** Filter by `name`, `apartment`, `bio` (case-insensitive `.includes`)

### User Fields Displayed
- Large avatar (64×64) with letter fallback
- Name + "Verified" badge (if `isVerified`)
- `MapPin` + apartment unit
- Bio (2 line-clamp)
- Join date (`formatDistanceToNow` + "ago")

---

## 8. Profile Management

### Get My Profile
- **Endpoint:** `GET /api/auth/me`
- **Auth:** Required
- **Returns:** Full `NeighborhoodUser` record (app-level profile)

### Update Profile
- **Endpoint:** `PUT /api/users/:id`
- **Auth:** Required
- **Body:** `{ name?, bio?, apartment?, phone?, avatarUrl? }`
- **Validation:** name ≥ 2 chars, bio ≤ 160 chars, avatarUrl must be valid URL or empty string
- **Avatar preview:** Live preview image updates as user types in the `avatarUrl` field (`form.watch("avatarUrl")`)
- **Form init pattern:** `useRef(initialized)` prevents form re-reset on re-renders

---

## 9. Dashboard / Activity Feed

### Community Stats
- **Endpoint:** `GET /api/feed/stats`
- **Auth:** Not required
- **Returns:** `{ totalMembers, totalPosts, activeListings, upcomingEvents, activeAlerts, availableResources }`
- **Implementation:** 6 individual `COUNT(*)` SQL queries

### Recent Activity
- **Endpoint:** `GET /api/feed/activity`
- **Auth:** Not required
- **Returns:** Last 20 items merged from posts (5), listings (5), events (5), alerts (3), resources (3), sorted by `createdAt` desc
- **Shape:** `{ id: string, type: enum, title, description, actorName, actorAvatar, createdAt }`

---

## Loading States

All pages implement skeleton loading:
- Stat cards: `Skeleton` components (6 × `h-32 rounded-xl`)
- Feed posts: animated-pulse cards with muted header + content areas
- Marketplace: animated-pulse cards with `h-48` image placeholder
- Events: animated-pulse cards with `h-32` header
- Members: animated-pulse `h-40` cards
- Activity: 4 × `Skeleton h-16 w-full`

---

## Empty States

All lists show centered empty state when `data.length === 0`:
- Large icon (opacity-50)
- Heading + explanation text
- CTA button (where applicable, e.g. Feed → "Create a Post", Events → "Why not host one?")

---

## Error Handling

- Form submissions: `onError` callback → `toast({ title: "...", variant: "destructive" })`
- Success: `toast({ title: "..." })` (default)
- API 401: Routes return `{ error: "Unauthorized" }` — frontend shows login page
- API 404: Routes return `{ error: "... not found" }`
- All errors use shadcn/ui `useToast` hook → `<Toaster />` component

---

## Notifications

- **Tool:** shadcn/ui toast system via `useToast()` + `<Toaster />`
- **Triggers:**
  - Post created: "Post created successfully"
  - Post deleted: "Post deleted"
  - Post create error: "Failed to create post" (destructive)
  - Listing created: "Listing created successfully"
  - Listing deleted: "Listing deleted"
  - Event created: "Event created successfully"
  - RSVP confirmed: "RSVP confirmed"
  - RSVP cancelled: "RSVP cancelled"
  - Alert posted: "Alert posted successfully"
  - Resource offered: "Resource offered successfully"
  - Resource removed: "Resource removed"
  - Profile saved: "Profile updated successfully"

---

## User Flows

### New User First Login
```
Visit app → Login page → Click "Join" → Replit OIDC → Callback →
  users table upserted → session created → redirect to / →
  useAuth fetches /api/auth/user → user set → AppLayout shown →
  Home page → useGetFeedStats + useGetRecentActivity called →
  In background: if user navigates anywhere requiring auth write,
  getOrCreateNeighborhoodUser() creates neighborhood_users row automatically
```

### Create and Like a Post
```
Navigate to /feed → click "New Post" → Dialog opens →
  Select category → (optional) enter title → enter content →
  Click "Post to Feed" → POST /api/posts →
  Dialog closes → cache invalidated → list refetches →
  New post appears at top → click heart → POST /api/posts/:id/like →
  Heart fills rose-500 → count increments
```

### RSVP to Event
```
Navigate to /events → see event card with date block →
  Click "RSVP" → POST /api/events/:id/rsvp →
  Button changes to "Cancel RSVP" (secondary variant) →
  rsvpCount increments → toast "RSVP confirmed"
```
