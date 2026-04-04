# Getting Started

This guide gets you from a fresh clone to a fully running local development environment for all four parts of the Hellenic Directory stack: backend API, web, iOS, and Android.

---

## Prerequisites

### All platforms
| Tool | Version | Notes |
|---|---|---|
| Git | Any recent | For cloning |
| Docker Desktop | 4.x+ | Runs PostgreSQL and Redis locally |
| Node.js | 20 LTS | Backend + web |
| npm | 10+ | Comes with Node 20 |

### iOS only
| Tool | Version |
|---|---|
| Xcode | 15.0+ |
| macOS | Sonoma (14.0+) |
| iOS Simulator | iOS 16.0+ |
| CocoaPods / Swift Package Manager | SPM (no Podfile) |

### Android only
| Tool | Version |
|---|---|
| Android Studio | Hedgehog (2023.1.1+) |
| Android SDK | API 35 |
| JDK | 17 (bundled with Android Studio) |
| Android Emulator | API 26+ |

---

## 1 — Clone the Repository

```bash
git clone https://github.com/lbakris/hellenicdirectory.git
cd hellenicdirectory
```

---

## 2 — Configure Environment Variables

Copy the example file and fill in values:

```bash
cp .env.example .env
```

Open `.env` and set these required values for local development:

```dotenv
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://hellenicdir:hellenicdir@localhost:5432/hellenicdir"

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── JWT secrets — generate with: openssl rand -hex 64 ────────────────────────
JWT_ACCESS_SECRET="replace_me_with_64_byte_hex"
JWT_REFRESH_SECRET="replace_me_different_64_byte_hex"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# ── App URLs ──────────────────────────────────────────────────────────────────
API_PORT=4000
APP_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000"

# ── Email (Resend — use your account or a test key) ───────────────────────────
RESEND_API_KEY="re_test_..."
EMAIL_FROM="noreply@yourdomain.com"

# ── Seed data admin password (min 12 chars) ───────────────────────────────────
SEED_OWNER_PASSWORD="dev_password_here"

# ── Next.js public env ────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

> **Security note:** Never commit the real `.env` file. The `.gitignore` already excludes it.

---

## 3 — Start Local Services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432` (database: `hellenicdir`, user: `hellenicdir`, password: `hellenicdir`)
- **Redis** on port `6379`

Verify they are running:
```bash
docker compose ps
```

---

## 4 — Backend Setup

```bash
cd backend
npm install
```

### 4a — Run database migrations

```bash
npm run db:migrate
# Alias for: npx prisma migrate dev
```

This creates all tables, indexes, and enum types in PostgreSQL.

### 4b — Seed development data

```bash
npm run db:seed
# Alias for: npx ts-node src/lib/seed.ts
```

This creates:
- One owner account using `SEED_OWNER_PASSWORD` from your `.env`
- Sample parishes and a test directory

### 4c — Start the API server

```bash
npm run dev
# Starts Fastify on http://localhost:4000
```

You should see:
```
Server listening on http://0.0.0.0:4000
```

Test the health endpoint:
```bash
curl http://localhost:4000/health
# {"status":"ok","db":"ok"}
```

---

## 5 — Web Setup

```bash
cd web
npm install
npm run dev
# Starts Next.js on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The web app automatically connects to the backend at `http://localhost:4000/api/v1` via `NEXT_PUBLIC_API_URL`.

---

## 6 — iOS Setup

1. Open `ios/HellenicDirectory.xcodeproj` (or `HellenicDirectory.xcworkspace` if it exists) in Xcode.
2. Select your target device or simulator (iOS 16.0+).
3. In `ios/HellenicDirectory/App/Info.plist`, confirm `API_BASE_URL` points to your local machine.

> **Important:** iOS Simulator cannot reach `localhost` from the app. Use your Mac's local IP instead.

```
# Find your local IP:
ipconfig getifaddr en0
# e.g. 192.168.1.42

# Update Info.plist:
API_BASE_URL = http://192.168.1.42:4000/api/v1
```

4. Build and run with `Cmd + R`.

### Keychain on simulator

The app uses the iOS Keychain to store tokens. On a fresh simulator, this works without extra steps. If you see Keychain errors, reset the simulator from **Device > Erase All Content and Settings**.

---

## 7 — Android Setup

1. Open `android/` as an existing project in Android Studio.
2. Wait for Gradle sync to complete (downloads dependencies).
3. The debug build automatically points to `http://10.0.2.2:4000/api/v1` — this is the Android emulator's alias for `localhost` on your Mac/PC.
4. Run on an emulator (API 26+) using the green play button.

### Google Maps

The parish map requires a Maps API key. For local development you can leave it blank — the map will show an error tile but the rest of the app works fine.

To enable the map:
1. Get an API key from [Google Cloud Console](https://console.cloud.google.com).
2. Add it to `android/local.properties`:
   ```
   MAPS_API_KEY=AIza...
   ```
3. Gradle injects this into the manifest automatically.

---

## 8 — Verify Everything Works

With backend and web running, try this end-to-end flow:

1. **Browse parishes**: Go to [http://localhost:3000/parishes](http://localhost:3000/parishes) — should show a list.
2. **Register**: Go to [http://localhost:3000/register](http://localhost:3000/register) — fill in the form and check all three consent boxes.
3. **Dashboard**: After login you should land on the authenticated dashboard.
4. **Account data**: Go to [http://localhost:3000/account](http://localhost:3000/account) — test the data export button.
5. **API directly**: `curl http://localhost:4000/api/v1/parishes?city=New+York` should return JSON.

---

## Useful Development Commands

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start API with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:studio` | Open Prisma Studio GUI (DB browser) |
| `npm run db:seed` | Seed development data |
| `npm test` | Run Jest unit tests |

### Web

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check (no emit) |

### Database utilities

```bash
# Open an interactive Postgres shell
docker exec -it hellenicdir-postgres psql -U hellenicdir hellenicdir

# Open Prisma Studio (visual DB browser)
cd backend && npx prisma studio
# Opens on http://localhost:5555
```

### Resetting everything

```bash
# Wipe DB and restart
docker compose down -v
docker compose up -d
cd backend && npm run db:migrate && npm run db:seed
```

---

## Common Issues

| Symptom | Fix |
|---|---|
| `Cannot connect to database` | Check `docker compose ps` — Postgres container must be running |
| `JWT_ACCESS_SECRET is required` | Your `.env` file is missing or the variable is blank |
| `SEED_OWNER_PASSWORD must be at least 12 characters` | Increase password length in `.env` |
| iOS app can't reach API | Use your Mac's IP address instead of `localhost` in `Info.plist` |
| Android Gradle sync fails | Check that JDK 17 is active: `java -version` |
| Next.js shows stale data | React Query caches for 60 seconds by default — wait or clear cache |
| Keychain errors in simulator | Reset simulator via Device menu in Xcode |
| `Module not found: jose` | Run `npm install` again in the `web/` directory |

---

## Next Steps

- Read [docs/setup-guide.md](setup-guide.md) for staging/production deployment
- Read [docs/user-manual.md](user-manual.md) to understand what users can do
- Read [docs/code-guide.md](code-guide.md) for a full annotated walkthrough of the codebase
