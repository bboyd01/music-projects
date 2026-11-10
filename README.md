# Music Projects

A self-hosted workspace for music composition projects: tracks, sketches, creative stages, inspirations, audio, comments, todos and feedback. It combines a ClickUp-style project view with Frame.io-style timestamped review, built for audio.

- **Projects → Tracks → Inspirations**, with customizable statuses
- **Track list** in Table, List or Board view, with show/hide fields saved per project
- **Persistent audio player**: a mini player stays on screen on every page, and there is a fullscreen Listen view with an inspiration collage
- **Waveform**: SoundCloud-style bars in the mini player, fullscreen and Listen views. Users can switch to a plain playhead line in Settings → Appearance → Player timeline
- **Timestamped comments**: one tap to comment at the playhead, `@mentions`, one click to turn a comment into a todo
- **Todos**: multiple checklists per track, optional timestamps, sort by added order or timestamp
- **Inspirations**: each project has a canvas where you drag, drop and resize text, images and songs, and connect items with lines (plain, dotted, arrow, two-way). Each track has its own separate list. Search songs as you type, or paste an Apple Music / Spotify link
- **Discord**: new comments are posted to a channel webhook, and @mentioned people are pinged
- **Accounts**: sign in with email or username; admin-managed users; per-project sharing (owner / editor / viewer); optional read-only `test` account
- **Dark & light themes**, subtle animations (≤130ms) with an option to turn them off on mobile

## Deploy with Coolify

1. In Coolify, create a new resource from this Git repository and choose the **Docker Compose** build pack (it uses `docker-compose.yml`).
2. Set the domain on the `app` service, for example `https://music.example.com`, port `3000`.
3. Add environment variables:

   | Variable | Required | Description |
   |---|---|---|
   | `ORIGIN` | yes | Public URL, e.g. `https://music.example.com`. Needed for form posts behind Coolify's proxy. |
   | `ADMIN_EMAIL` | first run | Email of the first admin account (created only when no users exist). |
   | `ADMIN_PASSWORD` | first run | Password for that account. You can remove both after first login. |
   | `ADMIN_NAME` | no | Display name for the first admin (default `Admin`). |
   | `DISCORD_WEBHOOK_URL` | no | Fallback webhook for projects that don't set their own. |
   | `MAX_AUDIO_MB` | no | Largest audio upload, in MB (default `500`). |
   | `INCLUDE_TEST_USER` | no | Read-only demo account `test` / `test` that can view (not change) every project. Default `true`; set `false` to remove it. Anyone who can reach your site can use it. |

4. Deploy. All data lives in the `music-data` volume mounted at `/data`: the SQLite database plus uploaded audio and images. Back up that volume.

Using the plain **Dockerfile** build pack instead also works. Expose port `3000` and add a persistent storage mount at `/data`. If you use a bind mount instead of a volume, make it writable by UID 1000 (`chown -R 1000:1000 /path`).

If your reverse proxy limits request body size, raise it to allow large audio uploads. Coolify's default Traefik setup doesn't limit it.

### Run locally with Docker

```bash
cp .env.example .env    # then edit ADMIN_EMAIL / ADMIN_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Open http://localhost:3000.

## Development

Requires Node 22+.

```bash
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=devpassword npm run dev
```

Data goes to `./data` (override with `DATA_DIR`). Migrations run automatically on start.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / run (`node build`) |
| `npm run check` | Type-check (svelte-check) |
| `npm test` | Unit tests (Vitest) |
| `npm run db:generate` | Generate a migration after editing `src/lib/server/db/schema.ts` |
| `npm run backgrounds` | Rebuild the default backgrounds (see below) |

## How it works

- **Stack:** SvelteKit 3 (Svelte 5, adapter-node), SQLite via Drizzle ORM (better-sqlite3, WAL mode), Tailwind CSS 4, `sharp` for images, `music-metadata` for durations, argon2 password hashing.
- **One container, one volume.** No external database or services are required.
- **Persistent player:** a single `<audio>` element lives in the root layout (`src/lib/components/player/AudioEngine.svelte`) and is driven by a global state object (`src/lib/state/player.svelte.ts`). Client-side navigation never unmounts it, so playback continues anywhere in the app. Lock-screen controls use the Media Session API.
- **Waveforms** are computed once on the server after upload (WAV/AIFF parsed directly, MP3 decoded with the small WebAssembly `mpg123-decoder`; no ffmpeg) and stored as ~1,200 peaks per track. Other formats get peaks from the uploader's browser. Existing files are backfilled in the background on start.
- **Audio** streams to disk on upload (it's never held whole in memory) and is served with HTTP Range support for seeking. Each track has one audio file, and uploading a new one replaces it.
- **Images** are processed in memory and only compressed WebP output is saved. EXIF orientation is applied, then all metadata (including GPS) is stripped.

  | Use | Output |
  |---|---|
  | Image inspiration | Fits inside 1280×720, WebP q82 |
  | Uploaded project cover | 1600px (fullscreen player) + 480px q60 (blurred backdrop) |
  | Audio artwork | 100×100 WebP |
- **Access control:** every project-scoped request goes through `requireProjectAccess` / `requireTrackAccess` (`src/lib/server/access.ts`). Non-members get a 404.
- **Music search** uses Apple's public iTunes Search API (no key needed). Spotify links are resolved with Spotify's public oEmbed endpoint.

## Backgrounds

Each project shows its cover blurred behind the interface. The cover is chosen in this order:
1. The pinned or uploaded cover.
2. The first image on the project's canvas.
3. The global background.

**Global background** (Settings → Background, admins): choose Random, one of the built-in backgrounds, or upload your own. Uploads are compressed to 1600px plus a small blurred copy, and are selected automatically. Pages outside a project (Projects, Comments, Settings) always use the global background. Random picks one per browser session.

The eight built-ins in `static/backgrounds/` are original abstract images generated by `scripts/backgrounds.mjs`. To replace them with photos, put up to 8 files in `assets/backgrounds/`, run `npm run backgrounds`, and credit them in `static/backgrounds/CREDITS.md`.

## Open in DAW (macOS)

Settings → **Open in DAW** adds an **Open Project** button to each track that opens its project file in your DAW. The path is built as:

```
<Project folder>/<Track Name>/<Track Name><extension>
e.g. /Users/you/Documents/REAPER Media/PROJECTS/New Sketch 14/New Sketch 14.rpp
```

The track title is used exactly as written, so rename either the track or the folder to keep them matching.

Browsers won't open local files from a website, so a tiny one-time helper handles the button. Run the command shown in Settings in Terminal; it looks like this:

```bash
curl -fsSL 'https://YOUR-SERVER/opener/install.sh' | bash -s -- .rpp
```

- **What it does:** creates `~/Applications/Music Projects Opener.app`, a small background app with no Dock icon that handles `musicprojects://` links.
- **What it opens:** only files that exist and end in the allowed extension, using macOS's `open` (the default app for that file type).
- **First use:** your browser asks once to allow opening it.
- **Changing or removing it:** run the command again after changing the extension; delete the app to remove it.
- **Turning the button off:** use the switch in the same Settings card.

## Upload API & REAPER

Create a personal API token in **Settings → API & REAPER**. It's shown once and stored hashed; revoke it there any time. Then upload a WAV or MP3 as the raw request body:

```bash
curl -X POST -H "Authorization: Bearer mp_…" -H "Content-Type: audio/mpeg" \
  --data-binary @"New Sketch 14.mp3" \
  "https://YOUR-SERVER/api/v1/audio?filename=New%20Sketch%2014.mp3"
```

**Matching:** the file name without its extension is matched to a track title in projects you can edit. Case, extra spaces and macOS Unicode file-name forms are ignored. The match replaces that track's audio, waveform included.

**Responses:**

| Status | Meaning |
|---|---|
| 200 | Uploaded; the JSON includes the project, track and link |
| 404 | No track with that name |
| 409 | Several tracks match; add `&project=<name or id>` |
| 415 | Not a WAV/MP3 file, or sent as a form upload (send the raw body) |
| 401 | Missing or revoked token |

**REAPER:** download the ReaScript from the same Settings card. It renders the region under the edit cursor using your saved render format (set MP3 once in File → Render…), names the file after the project, uploads it, and restores your render settings. The first time it runs, it asks for the server address and token.

## Discord

- **Per project:** Project → Settings → Discord → paste a channel webhook URL (Discord: *Channel settings → Integrations → Webhooks*).
- **Server-wide fallback:** `DISCORD_WEBHOOK_URL`.
- **Pings:** to be pinged when @mentioned, add your Discord user ID under Settings → Profile (Discord: enable *Developer Mode*, then *Copy User ID*).

Comments are stored in the app. Discord only receives notifications.

See [`docs/dev-plan.md`](docs/dev-plan.md) for the build plan and roadmap.
