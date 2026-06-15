# 🤝 Connecting Neighbors

A premium hyperlocal community platform designed for residential societies and colonies to connect, share resources, list accommodations, trade in local marketplaces, coordinate rides, report safety issues, and build strong neighborhood relationships.

---

## 🛠️ Technology Stack

Connecting Neighbors is structured as a type-safe TypeScript monorepo using **pnpm workspaces**:

* **Monorepo Engine**: `pnpm` Workspaces
* **Frontend (Web)**: React 19 + Vite + Wouter Routing + TanStack Query + TailwindCSS + shadcn/ui + Framer Motion
* **Mobile App**: Expo (React Native) with custom liquid glass styling and AsyncStorage token persistence
* **Backend API**: Express 5 + Winston Logger + Express-Session
* **Database & ORM**: PostgreSQL + Drizzle ORM + Drizzle Zod
* **Data Validation**: Zod
* **Auth Hook**: Replit Auth (OpenID Connect with PKCE)
* **API Codegen**: Orval (generates frontend hooks and typescript endpoints directly from the OpenAPI YAML spec)
* **Bundler & Tooling**: esbuild & TypeScript 5.9

---

## 🏗️ Monorepo Architecture

The project is structured logically into separate workspaces and shared packages:

```
├── artifacts/
│   ├── connecting-neighbors/  # Vite + React Web Application (served at /)
│   ├── api-server/            # Express.js API Server (served at /api)
│   └── neighbors-mobile/      # Expo React Native App (preview at /mobile/)
└── lib/
    ├── api-spec/              # OpenAPI Spec (openapi.yaml) - Single source of truth
    ├── api-client-react/      # Generated TanStack Query React hooks (shared by web + mobile)
    ├── api-zod/               # Generated Zod validation schemas
    ├── db/                    # Drizzle ORM schema, relations, & PostgreSQL connections
    └── replit-auth-web/       # Client authentication hooks (useAuth)
```

---

## 🌟 Key Features

### 🏡 Colony Hub Division & Verification
* **Colony Registration**: Neighbors can register new colonies and automatically become the administrator for that colony.
* **Residency Verification**: Neighbors choose the colony they belong to on registration. Their status is "Pending" until approved by the colony administrator.
* **Verified Residency Badges**: Approved neighbors receive a verified resident badge (green checkmark icon) next to their name in posts, comments, and the member directory.
* **Admin Dashboard**: Colony admins can view, review, and approve incoming residency requests in a dedicated control panel.

### 🏠 Hostels & Room Accommodations Registry
* **Rentals Listings**: A dedicated portal to browse PGs, hostels, and shared flats inside the society or surrounding sectors.
* **Smart Search & Filters**: Search listings dynamically by name or details, and filter listings by specific colonies.
* **Posting Slot Form**: Allows verified residents to post rental accommodations with detailed pricing (in ₹), description, amenities, and contact info.

### 🤖 Gemini AI Neighborhood Guide
* **Real-time Local Expert**: A chatbot assistant integrating a Google Gemini model (`gemini-1.5-flash`) to answer neighbor inquiries.
* **Live Context Infusion**: Automatically pulls active marketplace listings, events, safety alerts, resource sharing items, and verified members directly from the database and inserts them into the AI's prompt context.
* **Quick Action Cards**: Ready-made buttons to ask the AI about upcoming events, active listings, or resources to borrow.

### 🔔 Native Notifications & Synthesized Audio Chimes
* **HTML5 Push Notifications**: Informs the user in real-time when new alerts, resources, or events are posted.
* **Web Audio API Alerts**: Programmatic, high-fidelity sound notifications synthesized dynamically via oscillator nodes, removing the need for loading bulky external audio files (MP3/WAV).

### 💬 Community Feed, Marketplace & Resources
* **Categorized Feed**: Post messages under categories: General, Announcement, Help Needed, Lost & Found, Recommendations, and Safety.
* **Local Marketplace**: Sell, rent, or giveaway items within the neighborhood.
* **Resource Sharing**: Coordinate local rides, borrow tools, trade babysitting/childcare, or offer services.
* **Events & RSVP**: Coordinate block parties, clean-ups, or local events, with automatic RSVP counting.
* **Social Connections**: Profile cards support linking social profiles (Twitter/X, Facebook, LinkedIn, Instagram, GitHub) directly to the neighbor's directory card.
* **Feedback Section**: Dedicated Bug/Suggestion report card with star ratings, category dropdowns, and experience comments.
* **Terms & Guidelines**: Static guidelines document laying out safety rules and standards for verified residents.

---

## 💾 Database Schema

The database relies on Drizzle ORM tables defined in `@workspace/db`:

1. `users` — Base identity users mapping Replit OAuth records.
2. `neighborhood_users` — Profiles with `name`, `apartment`, `phone`, `avatarUrl`, social URLs, colony details, verification state, and admin parameters.
3. `colonies` — Colony registry containing addresses, description, and administrator ID.
4. `posts` / `post_likes` / `comments` — Interactive community board files.
5. `listings` — Buy/sell/rent items for the marketplace.
6. `events` / `event_rsvps` — Neighborhood events and RSVP states.
7. `alerts` — Critical safety warnings tagged by severity level.
8. `resources` — Offers of items, services, or ride shares.
9. `hostels` — Room rental and PG accommodation registry.
10. `feedbacks` — App feedback details.

---

## 🚀 Getting Started & Local Development

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (version 20 or higher) and [pnpm](https://pnpm.io/) installed.

### Environment Setup
Create a `.env` file in `artifacts/api-server/` with the following variables:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
SESSION_SECRET=your_session_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Initial Workspace Build
Run the build from the root directory to generate all dependency layers:
```bash
# Install dependencies
pnpm install

# Build workspace packages & api codegen specs
pnpm run build
```

### Development Servers
Run the dev commands concurrently to spin up the React frontend and Express server:
```bash
# Start backend Express server
pnpm --filter @workspace/api-server dev

# Start frontend Vite server
pnpm --filter @workspace/connecting-neighbors dev
```

### Key Commands
* `pnpm run typecheck` — Runs compiler check across all packages in the workspace.
* `pnpm --filter @workspace/api-spec run codegen` — Regenerates Orval React Query hooks and Zod validators when `openapi.yaml` changes.
* `pnpm --filter @workspace/db run push` — Syncs local schema changes to your Neon PostgreSQL instance.
