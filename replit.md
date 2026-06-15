# Connecting Neighbors

## Overview

A hyperlocal community app for residential colonies where neighbors connect, share resources, post announcements, buy/sell locally, coordinate rides, report safety alerts, and build a stronger community together.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (wouter routing, TanStack Query, shadcn/ui, framer-motion)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **Auth**: Replit Auth (OpenID Connect with PKCE)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

- `artifacts/connecting-neighbors/` — React + Vite frontend (served at `/`)
- `artifacts/api-server/` — Express API server (served at `/api`)
- `artifacts/neighbors-mobile/` — Expo (React Native) mobile app (preview at `/mobile/`)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (single source of truth)
- `lib/api-client-react/` — Generated React Query hooks (shared by web + mobile)
- `lib/api-zod/` — Generated Zod validation schemas
- `lib/db/` — Drizzle ORM schema and DB connection
- `lib/replit-auth-web/` — Browser auth hook (`useAuth`)

## Mobile App (Expo)

- **Navigation**: 5 bottom tabs — Home, Feed, Market, Events, More
- **More tab**: links to Members, Safety Alerts, Resources, Profile + Sign Out
- **Auth**: `expo-web-browser.openAuthSessionAsync` opens Replit OIDC login; server redirects back to `neighbors-mobile://auth-callback?token=<sid>` via `?mobile_redirect=` param; token stored in AsyncStorage and sent as `Authorization: Bearer` header
- **API**: All screens use generated `@workspace/api-client-react` hooks with `setBaseUrl` + `setAuthTokenGetter`
- **Design**: Matches web app design tokens (teal primary `#289B87`, warm background `#FAF9F5`); NativeTabs with liquid glass on iOS 26+, BlurView Tabs fallback on older iOS/Android
- **Server change**: `GET /api/login?mobile_redirect=<scheme-url>` sets a cookie that causes `GET /api/callback` to redirect to the app scheme with the session token after successful auth

## Key Features

- Community feed with categories (general, announcement, helpNeeded, lostFound, recommendation, safety)
- Local marketplace (buy, sell, free, rent items)
- Community events with RSVP
- Safety alerts with severity levels
- Resource sharing (rides, items, services, childcare)
- Member directory
- User profiles with apartment info
- Dashboard with community stats and activity feed

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Tables

- `users` — Replit auth users
- `sessions` — Auth sessions
- `neighborhood_users` — App user profiles with apartment/bio info
- `posts` — Community feed posts
- `post_likes` — Post likes junction table
- `listings` — Marketplace listings
- `events` — Community events
- `event_rsvps` — Event RSVPs junction table
- `alerts` — Safety alerts
- `resources` — Shared resources

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
