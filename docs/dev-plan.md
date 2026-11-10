# Dev plan

## Decisions

| Area | Choice |
|---|---|
| Stack | SvelteKit 3 + SQLite (Drizzle), one Docker container, data on a `/data` volume |
| Hosting | Coolify on a VPS (Docker Compose build pack) |
| Discord | App is the source of truth; new comments and @mentions are pushed to a webhook (one-way) |
| Users | Admin creates accounts; per-project sharing with owner / editor / viewer roles |
| Look | Mature, subtly glassy, photo-driven blurred backgrounds; Inter + Newsreader; dark + light themes; warm brass accent; muted status palette |
| Motion | Subtle, on large elements only, 130ms max; setting: On / Off on mobile / Off; respects reduced-motion |
| Images | Compressed on upload to WebP, metadata stripped, originals never stored |

## Phases

- [x] **1. Scaffold**: SvelteKit, Tailwind, Drizzle schema + migrations, seeded statuses, Dockerfile/compose, health check
- [x] **2. Auth & access**: login/logout, hashed sessions, admin bootstrap, user admin, project membership, access helpers
- [x] **3. Projects & tracks**: CRUD, customizable statuses, Table / List / Board views, field show/hide per project, track page, icon picker (Lucide + custom instrument icons)
- [x] **4. Audio**: streamed upload/replace, range streaming, durations, persistent player (mini + fullscreen), prev/next within the project, Media Session
- [x] **5. Comments & todos**: general + timestamped (−3s) comments, @mentions, comment → todo, multiple checklists, sort by added/timestamp, Comments tab with mention filter, Discord webhook
- [x] **6. Inspirations**: canvas (drag/resize/pan/zoom), text/image/audio, 200ms music autosearch + Apple Music/Spotify links, track linking, fullscreen collage
- [x] **7. Polish**: mobile tab bar + sheets, themes, animation setting, default backgrounds, README

## Verification done

- `npm run check` (0 errors) and unit tests (time math, link parsing, mentions, roles)
- Browser end-to-end on desktop (dark) and iPhone viewport (light): login → project → tracks → upload audio → play → navigate (playback continues) → timestamped comment → todo → canvas text/images → Listen (minimized + fullscreen) → settings
- API checks: Range requests (206), auth on audio (401 signed out), non-member 404s, viewer vs editor permissions, last-owner protection, mention feed
- Image pipeline: 300px WebP, no EXIF/ICC in output
- Docker image built and run: first-boot admin, upload, data persisted across restart, healthcheck healthy, runs as non-root

## Roadmap / ideas

- Audio inspirations from uploaded files (spec: future enhancement)
- Waveform display on the progress line
- Version history for track audio (keep previous mixes instead of overwriting)
- Two-way Discord (bot that syncs replies back into the app)
- Drag-and-drop reordering on the Board and List views (Table supports it today)
- Pinch-to-zoom on the canvas for touch screens
- Email/password reset flow (today an admin resets passwords)
