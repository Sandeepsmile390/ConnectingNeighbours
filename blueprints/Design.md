# Design.md — Connecting Neighbors UI/UX Blueprint

## Brand Identity

- **App Name:** Connecting Neighbors ("Neighbors" in sidebar, "CN" as logo mark)
- **Tagline:** "Connect with locals, share resources, and build a stronger community together."
- **Vibe:** Warm, community-first, earthy. Not corporate. Feels like a neighborhood bulletin board brought online.

---

## Color Palette

### Light Mode (default)

| Token | HSL | Hex Approx | Role |
|---|---|---|---|
| `--background` | `40 33% 98%` | `#FAFAF7` | Page background (warm white) |
| `--foreground` | `215 25% 15%` | `#1E2433` | Body text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card backgrounds |
| `--card-foreground` | `215 25% 15%` | `#1E2433` | Card text |
| `--border` | `215 15% 85%` | `#D1D8E0` | Default borders |
| `--primary` | `173 58% 39%` | `#289B87` | Earthy Teal — CTAs, active states, links |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | Text on primary |
| `--secondary` | `24 95% 53%` | `#F97316` | Warm Orange/Coral — accent actions |
| `--secondary-foreground` | `0 0% 100%` | `#FFFFFF` | Text on secondary |
| `--muted` | `40 20% 92%` | `#EDE9E0` | Muted backgrounds |
| `--muted-foreground` | `215 15% 45%` | `#637085` | Placeholder text, metadata |
| `--accent` | `40 30% 90%` | `#EDE5D3` | Hover highlights |
| `--destructive` | `0 84% 60%` | `#F03E3E` | Errors, delete, emergency |
| `--ring` | `173 58% 39%` | `#289B87` | Focus rings |
| `--input` | `215 15% 85%` | `#D1D8E0` | Input borders |

### Dark Mode

| Token | HSL | Role |
|---|---|---|
| `--background` | `215 30% 10%` | Dark blue-grey |
| `--foreground` | `40 20% 95%` | Warm near-white |
| `--card` | `215 25% 13%` | Elevated dark card |
| `--primary` | `173 50% 45%` | Lighter teal |
| `--secondary` | `24 90% 60%` | Lighter coral |
| `--sidebar` | `215 30% 10%` | Same as background |

### Semantic Colour Usage (per feature)

| Feature | Colour |
|---|---|
| Safety Alerts header | `red-50/50` bg, `red-100` icon bg, `red-600` icon |
| Emergency alert card | `red-100` bg, `red-800` text, `red-300` border |
| High severity | `orange-100/800` |
| Medium severity | `yellow-100/800` |
| Low severity | `blue-100/800` |
| Resolved alert | `green-100/800` |
| Resources header | `teal-50/50` bg, `teal-100` icon bg, `teal-600` icon |
| Resources tabs | `teal-50` bg, active: `teal-100` |
| For Sale badge | `blue-100 text-blue-700` |
| For Free badge | `green-100 text-green-700` |
| For Rent badge | `orange-100 text-orange-700` |
| Like button (active) | `rose-500` |
| Verified badge | `blue-50 text-blue-600` |
| Stat card — Members | `text-blue-500` icon |
| Stat card — Posts | `text-green-500` icon |
| Stat card — Listings | `text-purple-500` icon |
| Stat card — Events | `text-orange-500` icon |
| Stat card — Alerts | `text-red-500` icon |
| Stat card — Resources | `text-teal-500` icon |

---

## Typography

| Property | Value |
|---|---|
| Font Family (sans) | `Inter`, `sans-serif` |
| Font Family (serif) | `Georgia`, `serif` |
| Font Family (mono) | `Menlo`, `monospace` |
| Base body | `font-sans antialiased` |
| Page headings | `text-3xl font-bold tracking-tight` |
| Card titles | `text-sm font-medium` (stat cards) / `font-semibold text-lg` (content) |
| Muted meta | `text-xs text-muted-foreground` |
| Bio/content text | `text-sm` |
| Sidebar app name | `font-semibold text-lg tracking-tight` |

---

## Spacing System

- Base spacing unit: `0.25rem` (Tailwind default, `--spacing: 0.25rem`)
- Page content max-width: `max-w-5xl mx-auto` (desktop layout), `max-w-3xl mx-auto` (feed/alerts), `max-w-4xl mx-auto` (members), `max-w-2xl mx-auto` (profile)
- Page padding: `p-4 md:p-8`
- Section spacing: `space-y-8` (home), `space-y-6` (most pages)
- Card padding: `p-5` (most cards), `p-4` (footers/smaller)
- Grid gaps: `gap-4` (stat cards), `gap-6` (marketplace/events/resources)
- Sidebar width: `w-64`

---

## Border Radius

| Token | Value |
|---|---|
| `--radius` | `0.75rem` (base) |
| `--radius-sm` | `calc(0.75rem - 4px)` = `0.5rem` |
| `--radius-md` | `calc(0.75rem - 2px)` = `0.625rem` |
| `--radius-lg` | `0.75rem` |
| `--radius-xl` | `calc(0.75rem + 4px)` = `1rem` |
| Logo/brand mark | `rounded-lg` (0.5rem) |
| Avatar | `rounded-full` |
| Buttons (filter pills) | `rounded-full` |
| Empty state containers | `rounded-xl` |
| Event date block | `w-24` fixed column |
| Resource type icon | `rounded-xl` |

---

## Shadows

```css
--shadow-2xs: 0px 1px 2px 0px rgba(0,0,0, 0.05);
--shadow-xs:  0px 2px 4px 0px rgba(0,0,0, 0.05);
--shadow-sm:  0px 4px 8px -2px rgba(0,0,0, 0.08), 0px 2px 4px -2px rgba(0,0,0, 0.04);
--shadow:     0px 8px 16px -4px rgba(0,0,0, 0.1), 0px 4px 8px -4px rgba(0,0,0, 0.05);
--shadow-md:  0px 12px 24px -6px rgba(0,0,0, 0.12), 0px 6px 12px -6px rgba(0,0,0, 0.06);
--shadow-lg:  0px 16px 32px -8px rgba(0,0,0, 0.14), 0px 8px 16px -8px rgba(0,0,0, 0.07);
```

Dark mode shadows are significantly more opaque (rgba(0,0,0, 0.4–0.95)).

---

## Animations & Transitions

- Page content fade-in: `animate-in fade-in duration-500` (AppLayout main content wrapper)
- Login page: `animate-in fade-in slide-in-from-bottom-8 duration-700`
- Resource icon on card hover: `group-hover:scale-110 transition-transform`
- Card hover borders: `transition-colors`
- Stat card hover: `hover-elevate transition-all`
- Pulse loading skeleton: `animate-pulse`
- Post/event card hover: `hover-elevate transition-shadow`
- Past events: `opacity-70`
- Custom utility `hover-elevate`: applies `::after` pseudo-element with `background-color: var(--elevate-1)` on hover (creates a subtle overlay lift without box-shadow)

---

## Component Library

Built on **shadcn/ui** components with Radix UI primitives. All styled via Tailwind CSS v4 + CSS variables.

### Components Used Per Page

| Page | Key Components |
|---|---|
| Login | `Button`, `HeartHandshake` icon |
| Home/Dashboard | `Card`, `CardHeader`, `CardContent`, `Skeleton`, `Link` (wouter), `Badge` |
| Feed | `Card`, `Avatar`, `Badge`, `Dialog`, `Form`, `Input`, `Textarea`, `Select`, `Button` |
| Marketplace | `Card`, `Avatar`, `Badge`, `Tabs`, `Dialog`, `Form`, `Input`, `Textarea`, `Select` |
| Events | `Card`, `Badge`, `Dialog`, `Form`, `Input`, `Textarea`, `Button` |
| Alerts | `Card`, `Badge`, `Dialog`, `Form`, `Input`, `Textarea`, `Select` |
| Resources | `Card`, `Avatar`, `Badge`, `Tabs`, `Dialog`, `Form`, `Input`, `Textarea`, `Select` |
| Members | `Card`, `Avatar`, `Badge`, `Input` (search) |
| Profile | `Card`, `Avatar`, `Form`, `Input`, `Textarea`, `Button` |
| AppLayout | `Avatar`, `Sheet`, `Button`, `Link` (wouter) |

### shadcn/ui Component List (installed)

accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input, input-group, input-otp, item, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip

---

## Layout Architecture

### Desktop (md+)

```
┌──────────────────────────────────────────┐
│  [Sidebar 256px]   │  [Main Content]     │
│  ┌──────────────┐  │  max-w-5xl mx-auto  │
│  │ CN logo+name │  │  p-4 md:p-8         │
│  ├──────────────┤  │                     │
│  │ Nav links    │  │  <page content>     │
│  │ (7 items)    │  │                     │
│  ├──────────────┤  │                     │
│  │ User avatar  │  │                     │
│  │ + name       │  │                     │
│  │ Log out btn  │  │                     │
│  └──────────────┘  │                     │
│  sticky h-screen   │  overflow-y-auto    │
└──────────────────────────────────────────┘
```

### Mobile (< md)

```
┌──────────────────────────────────────────┐
│  [Header bar 64px]                       │
│  CN logo | "Neighbors" | ☰ menu button  │
│  (Sheet drawer opens from left on ☰)    │
├──────────────────────────────────────────┤
│  [Main content area, full width]         │
│  p-4                                     │
└──────────────────────────────────────────┘
```

### Navigation Items (in order)

1. Home (`/`) — `Home` icon
2. Feed (`/feed`) — `MessageSquare` icon
3. Marketplace (`/marketplace`) — `ShoppingBag` icon
4. Events (`/events`) — `Calendar` icon
5. Alerts (`/alerts`) — `AlertTriangle` icon
6. Resources (`/resources`) — `HeartHandshake` icon
7. Members (`/members`) — `Users` icon

Active state: `bg-primary/10 text-primary hover:bg-primary/20` (custom), variant `"secondary"`.
Inactive state: variant `"ghost"`, `text-muted-foreground hover:text-foreground`.

---

## Page-by-Page Design Notes

### Login Page
- Full-screen centered layout
- Large `HeartHandshake` icon in `64×64` teal rounded-2xl container with shadow
- `text-4xl` heading, `text-lg` muted subtext
- Card with single CTA button: `size="lg" w-full`
- Replit auth note below button

### Home Dashboard
- `text-3xl` heading "Village Square"
- 2×3 grid of stat cards (6 stats) → each links to its respective page
- Each stat card: icon (colored) top-right, large `text-3xl` number, `text-sm` label
- "Recent Activity" full-width card below grid
- Activity items: icon circle + actor name + content type + title + timestamp
- Empty state: centered icon + text + CTA button

### Feed
- `max-w-3xl` constraint
- Horizontal scrollable filter pills (rounded-full buttons): All Posts + 6 categories
- "New Post" button (Dialog modal): category select → optional title → required content
- Post cards: avatar + author name + apartment + time ago + category badge + content + like/comment footer
- Like button turns `rose-500` when active, `fill-current` heart icon
- Delete button (trash) visible only to post author (matches `user.id === post.authorId`)
- Loading: animated pulse cards

### Marketplace
- Tabs component for type filtering: All / For Sale / For Free / For Rent
- `1 / 2 / 3` column grid
- Cards: 48px image area (or icon placeholder) + type badge overlay (top-right) + title + price + category + description (3 line-clamp) + seller avatar + time + delete button
- Price field hidden when type = "free"
- Color-coded type badges

### Events
- `2` column grid
- Unique card layout: left `96px` column with month/day in large type (primary color), right side has title, time, location
- Status badges: Today (`orange-500`), Tomorrow (`blue-500`), Upcoming (`primary/10`), Past (muted outline)
- Past events at `opacity-70`, RSVP button disabled
- RSVP button toggles between "RSVP" (default) and "Cancel RSVP" (secondary variant)

### Alerts
- `max-w-3xl` constraint
- Page header: red-tinted banner with shield icon, title, "Report Issue" destructive button
- Cards with `border-l-4` colored left border matching severity
- Card header background tinted by severity class
- Left icon column: severity-specific icons
- Resolved badge: green `"Resolved"` outline badge

### Resources
- Teal-tinted page header (mirrors alerts layout)
- Tabs: All / Items / Services / Rides / Care
- `1 / 2 / 3` column grid
- Resource type icon in `40×40` teal rounded-xl tile
- Icon animates `scale-110` on card hover
- Teal-styled "Offer Resource" button, teal tabs

### Members
- Centered heading
- Rounded-full search input with `Search` icon prefix
- `1 / 2` column grid
- Large `64×64` avatar with border, verified badge
- Shows: name, apartment (with MapPin icon), bio (2 line-clamp), join date

### Profile
- `max-w-2xl` centered
- Single card: "Public Information"
- Left: `128×128` avatar (live preview from URL field), update instruction text
- Right: form grid — name + apartment (2 col), bio (textarea), phone, avatarUrl
- "Save Changes" + "Sign Out" (destructive ghost) in same row
