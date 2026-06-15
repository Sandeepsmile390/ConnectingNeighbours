# Architecture.md — Connecting Neighbors Technical Blueprint

## Tech Stack

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18+ (catalog) |
| Build tool | Vite | 6+ (catalog) |
| Language | TypeScript | 5.9 |
| Routing | wouter | ^3.3.5 |
| Server state | TanStack React Query | catalog (v5) |
| Forms | react-hook-form | ^7.55.0 |
| Validation | Zod | catalog (^3.x) |
| Styling | Tailwind CSS v4 | catalog |
| Animations | tw-animate-css | ^1.4.0 |
| UI Components | shadcn/ui (Radix UI) | latest |
| Icons | lucide-react | catalog |
| Date utilities | date-fns | ^3.6.0 |
| Charts | Recharts | ^2.15.2 |

### Backend
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 24 |
| Framework | Express | ^5 |
| Language | TypeScript | 5.9 |
| Build | esbuild | ^0.27.3 |
| Logging | pino + pino-http | ^9 / ^10 |
| Auth | openid-client (OIDC PKCE) | ^6.8.4 |
| Validation | Zod | catalog |
| ORM | Drizzle ORM | catalog |

### Database
| Layer | Technology |
|---|---|
| Engine | PostgreSQL (Replit managed) |
| Schema tool | Drizzle Kit |
| Schema validation | drizzle-zod |

### Infrastructure
| Layer | Technology |
|---|---|
| Hosting | Replit (pnpm monorepo) |
| Auth Provider | Replit OIDC (`https://replit.com/oidc`) |
| Reverse Proxy | Replit path-based router |
| Package manager | pnpm workspaces |
| Type checking | TypeScript project references |
| API codegen | Orval (from OpenAPI spec) |

---

## Monorepo Structure

```
workspace/
├── pnpm-workspace.yaml          # Catalog pins (zod, react, tailwind, etc.)
├── tsconfig.base.json           # Shared strict TS defaults
├── tsconfig.json                # Solution file (libs only)
├── package.json                 # Root dev tooling
│
├── artifacts/
│   ├── api-server/              # Express REST API (@workspace/api-server)
│   │   ├── src/
│   │   │   ├── index.ts         # Entry: start server on $PORT
│   │   │   ├── app.ts           # Express app setup (middleware chain)
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts      # OIDC config, session CRUD, AuthUser type
│   │   │   │   └── logger.ts    # Pino singleton logger
│   │   │   ├── middlewares/
│   │   │   │   └── authMiddleware.ts  # Loads user from session on every req
│   │   │   └── routes/
│   │   │       ├── index.ts     # Assembles all routers
│   │   │       ├── health.ts    # GET /healthz
│   │   │       ├── auth.ts      # Login/callback/logout + mobile token exchange
│   │   │       ├── users.ts     # Users CRUD + /auth/me + getOrCreateNeighborhoodUser
│   │   │       ├── posts.ts     # Posts CRUD + like toggle
│   │   │       ├── marketplace.ts  # Listings CRUD
│   │   │       ├── events.ts    # Events CRUD + RSVP toggle
│   │   │       ├── alerts.ts    # Alerts CRUD
│   │   │       ├── resources.ts # Resources CRUD
│   │   │       └── feed.ts      # /feed/stats + /feed/activity
│   │   ├── build.mjs            # esbuild bundler config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── connecting-neighbors/    # React + Vite frontend (@workspace/connecting-neighbors)
│       ├── src/
│       │   ├── main.tsx         # React root: QueryClientProvider wraps App
│       │   ├── App.tsx          # Auth guard + router
│       │   ├── index.css        # Tailwind v4 + CSS custom properties (theme)
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   └── AppLayout.tsx  # Sidebar (desktop) + header (mobile)
│       │   │   └── ui/               # shadcn/ui components (50+ files)
│       │   ├── pages/
│       │   │   ├── login.tsx
│       │   │   ├── home.tsx
│       │   │   ├── feed.tsx
│       │   │   ├── marketplace.tsx
│       │   │   ├── events.tsx
│       │   │   ├── alerts.tsx
│       │   │   ├── resources.tsx
│       │   │   ├── members.tsx
│       │   │   ├── profile.tsx
│       │   │   └── not-found.tsx
│       │   ├── hooks/
│       │   │   ├── use-mobile.tsx
│       │   │   └── use-toast.ts
│       │   └── lib/
│       │       └── utils.ts     # cn() helper (clsx + tailwind-merge)
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
│
└── lib/
    ├── api-spec/                # OpenAPI spec + Orval codegen config
    │   ├── openapi.yaml         # Source of truth for all API contracts
    │   └── orval.config.ts      # Generates api-client-react + api-zod
    │
    ├── api-client-react/        # Generated TanStack Query hooks (@workspace/api-client-react)
    │   └── src/
    │       ├── index.ts
    │       ├── custom-fetch.ts  # Fetch wrapper with credentials:include
    │       └── generated/
    │           ├── api.ts       # All useQuery/useMutation hooks
    │           └── api.schemas.ts  # Zod schemas for client
    │
    ├── api-zod/                 # Generated Zod schemas for server (@workspace/api-zod)
    │   └── src/
    │       ├── index.ts
    │       └── generated/
    │           └── api.ts       # Request/response Zod schemas
    │
    ├── db/                      # Database layer (@workspace/db)
    │   ├── src/
    │   │   ├── index.ts         # Exports db client + all tables
    │   │   └── schema/
    │   │       ├── index.ts     # Barrel export
    │   │       ├── auth.ts      # usersTable + sessionsTable (Replit Auth)
    │   │       ├── community.ts # All app tables + enums + insert schemas
    │   │       └── relations.ts # Drizzle relations for `with` queries
    │   ├── drizzle.config.ts
    │   └── package.json
    │
    └── replit-auth-web/         # Browser auth hook (@workspace/replit-auth-web)
        └── src/
            ├── index.ts
            └── use-auth.ts      # useAuth() hook (login/logout/user state)
```

---

## Request Lifecycle

### Authentication Flow (Web)

```
Browser                    Frontend                API Server            Replit OIDC
   │                          │                        │                     │
   │── click "Join" ─────────>│                        │                     │
   │                          │── GET /api/login ─────>│                     │
   │                          │                        │── build PKCE ──────>│
   │                          │                        │<─ redirect URL ─────│
   │<─ redirect to Replit ────│<─ 302 ─────────────────│                     │
   │── login at Replit ───────────────────────────────────────────────────-->│
   │<─ redirect to /api/callback?code=... ───────────────────────────────────│
   │── GET /api/callback ─────────────────────────────>│                     │
   │                          │                        │── token exchange ──>│
   │                          │                        │<─ tokens + claims ──│
   │                          │                        │── upsert user in DB │
   │                          │                        │── create session ───│
   │<─ Set-Cookie: sid=... ───────────────────────────<│                     │
   │── redirect to / ─────────────────────────────────>│                     │
   │                          │                        │                     │
```

### API Request Lifecycle (Authenticated)

```
Browser → GET /api/posts
  ↓ Replit reverse proxy (path: /api → api-server:8080)
  ↓ pinoHttp middleware (structured logging)
  ↓ CORS middleware (credentials: true, origin: true)
  ↓ cookieParser middleware
  ↓ express.json() + express.urlencoded()
  ↓ authMiddleware: reads sid cookie → loads session from DB → sets req.user
  ↓ router → postsRouter → GET /posts handler
  ↓ getOrCreateNeighborhoodUser(req) — auto-creates neighbor profile if missing
  ↓ Drizzle ORM query with `with: { author: true }` (joined)
  ↓ map to response format (with isLikedByMe computed)
  ↓ res.json(result)
```

### Codegen Flow

```
lib/api-spec/openapi.yaml
  ↓ pnpm --filter @workspace/api-spec run codegen
  ↓ Orval reads openapi.yaml
  ├─→ lib/api-client-react/src/generated/api.ts        (React Query hooks)
  ├─→ lib/api-client-react/src/generated/api.schemas.ts (client Zod schemas)
  └─→ lib/api-zod/src/generated/api.ts                  (server Zod schemas)
       ↓ post-codegen: overwrite lib/api-zod/src/index.ts
         with: export * from "./generated/api";
```

---

## Middleware Chain (app.ts order)

```typescript
app.use(pinoHttp(...))        // 1. Structured request logging
app.use(cors({ credentials: true, origin: true }))  // 2. CORS
app.use(cookieParser())       // 3. Parse cookies (required before authMiddleware)
app.use(express.json())       // 4. Parse JSON bodies
app.use(express.urlencoded({ extended: true }))  // 5. Parse form data
app.use(authMiddleware)       // 6. Load user from session into req.user
app.use("/api", router)       // 7. All routes under /api prefix
```

---

## Service Routing (Replit Proxy)

| Path | Service | Port |
|---|---|---|
| `/` | connecting-neighbors (Vite) | `$PORT` (e.g. 24741) |
| `/api` | api-server (Express) | 8080 |

- Paths are NOT rewritten — Express handles the full `/api/*` path
- Frontend uses relative URLs (e.g. `/api/posts`) — proxy handles routing

---

## TypeScript Configuration

- **Libs** (`lib/*`): composite, `declarationMap: true`, `emitDeclarationOnly: true`
- **Artifacts** (`artifacts/*`): leaf packages, `tsc --noEmit` only
- **Root** `tsconfig.json`: references only libs (api-client-react, api-zod, db, replit-auth-web)
- **Shared base**: `tsconfig.base.json` with strict mode

---

## Key Patterns

### `getOrCreateNeighborhoodUser(req)`
Every write route calls this. If the authenticated Replit user has no `neighborhood_users` row yet, one is created automatically using name/username/avatar from the OIDC claims. This is the user-creation on first use pattern.

### Toggle operations (Like / RSVP)
Both `POST /posts/:id/like` and `POST /events/:id/rsvp` use the same toggle pattern:
1. Check if a junction table row exists for `(entityId, userId)`
2. If yes → delete it, decrement count
3. If no → insert it, increment count
4. Return `{ liked/rsvped: boolean, count: number }`

### isLikedByMe / isRsvpedByMe
Computed per-request: fetch all user's likes/RSVPs for visible entity IDs, build a `Set`, then check membership per entity in the `.map()`.

### Cache invalidation
All mutations call `queryClient.invalidateQueries({ queryKey: get[Entity]QueryKey() })` on success to refetch the relevant list.
