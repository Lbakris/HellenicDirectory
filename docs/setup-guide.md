# Setup Guide

Comprehensive configuration and deployment guide for all environments — local development, staging, and production. Covers backend, web, iOS, and Android.

---

## Environment Variables Reference

The backend reads all configuration through `backend/src/config/env.ts`, validated with Zod at startup. The server will refuse to start if any required variable is missing or invalid.

### Backend (`backend/.env` or system environment)

```dotenv
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/hellenicdir"
# Full Prisma-compatible PostgreSQL connection string.
# Use a connection pooler (PgBouncer/Supabase) in production.

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"
# Used for: rate-limiting counters, optional token blacklist.
# TLS: redis://user:password@host:6380?tls=true

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET="<64+ byte hex — openssl rand -hex 64>"
JWT_REFRESH_SECRET="<different 64+ byte hex>"
JWT_ACCESS_EXPIRES_IN="15m"   # Short-lived — refresh on expiry
JWT_REFRESH_EXPIRES_IN="30d"  # Rotated on use; hashed in DB

# ── Network ───────────────────────────────────────────────────────────────────
API_PORT=4000
CORS_ORIGINS="https://hellenicdir.com,https://www.hellenicdir.com"
# Comma-separated list of allowed origins.

# ── App URLs ──────────────────────────────────────────────────────────────────
APP_URL="https://hellenicdir.com"
# Used in email links (verification, password reset).

# ── Email ─────────────────────────────────────────────────────────────────────
RESEND_API_KEY="re_live_..."
EMAIL_FROM="Hellenic Directory <noreply@hellenicdir.com>"
# Resend account: https://resend.com
# Domain must be verified in Resend before transactional email works.

# ── Firebase Admin (push notifications) ──────────────────────────────────────
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
# JSON string of the Firebase service account key.
# Keep in a secrets manager — do not commit.

# ── Seed (development / staging only) ────────────────────────────────────────
SEED_OWNER_PASSWORD="min_12_chars_secure_password"
# Required when running `npm run db:seed`.
# NEVER set this in production — remove the variable entirely.

# ── Environment ───────────────────────────────────────────────────────────────
NODE_ENV="production"   # "development" | "test" | "production"
```

### Web (`web/.env.local`)

```dotenv
NEXT_PUBLIC_API_URL="https://api.hellenicdir.com/api/v1"
# Must include /api/v1 — all client-side API calls prepend this.

JWT_SECRET="<same value as backend JWT_ACCESS_SECRET>"
# Used server-side in Next.js middleware for JWT signature verification.
# Must match the backend value exactly.
```

### iOS (`ios/HellenicDirectory/App/Info.plist`)

```xml
<key>API_BASE_URL</key>
<string>https://api.hellenicdir.com/api/v1</string>
```

Set this per build scheme using Xcode build configurations, or inject via your CI/CD environment.

### Android (`android/app/build.gradle.kts`)

```kotlin
defaultConfig {
    buildConfigField("String", "API_BASE_URL", "\"https://api.hellenicdir.com/api/v1\"")
}
buildTypes {
    debug {
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:4000/api/v1\"")
    }
}
```

The `API_BASE_URL` build config field is injected per build type. Override it in a `local.properties` file or via CI environment variables.

---

## Database

### Schema Management

The database schema lives in `backend/prisma/schema.prisma`. All changes must be made through Prisma migrations — never modify the database directly in production.

```bash
# Create a new migration after editing schema.prisma
cd backend
npx prisma migrate dev --name descriptive_name

# Apply migrations in production (no interactive prompts)
npx prisma migrate deploy

# Introspect existing DB (only needed if DB was modified externally)
npx prisma db pull
```

### Connection Pooling (Production)

Prisma's `@prisma/client` does not pool connections on its own. Use a connection pooler in production:

- **Supabase** provides PgBouncer in transaction mode automatically
- **PgBouncer** standalone: set pool mode to `transaction`, max 10 connections per worker
- **Prisma Data Proxy / Accelerate**: managed connection pooling option

Update `DATABASE_URL` to the pooler connection string when using external pooling.

### Indexes

The schema includes indexes on all columns used for search:
- `parishes`: `city`, `state`, `metropolitis`, `(lat, lon)` for geographic queries
- `users`: `email` (unique), `appRole`
- `businesses`: `city`, `category`, `name`
- `directoryMembers`: `(directoryId, userId)` composite unique
- `refreshTokens`: `token` (for O(1) lookup during rotation)

### Backups

- Enable automated daily backups on your managed Postgres provider (RDS, Supabase, Neon)
- Set retention to at minimum 30 days (matches the account soft-delete grace period)
- Test restore procedures quarterly

---

## Redis

Redis is used for rate-limiting counters via `@fastify/rate-limit`. It is not used as a session store — sessions are stateless JWT.

If Redis is unavailable at startup, the server will start but rate-limiting will degrade to in-memory (non-distributed) mode. This is acceptable for a single-server deployment but not for multi-instance.

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
# Expected: PONG
```

---

## Backend Deployment

### Docker (recommended)

```dockerfile
# backend/Dockerfile (create if deploying via container)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build && npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### Environment injection at runtime

Pass secrets via environment variables — never bake them into images:
```bash
docker run \
  -e DATABASE_URL="..." \
  -e JWT_ACCESS_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  -e RESEND_API_KEY="..." \
  -p 4000:4000 \
  hellenicdir-backend:latest
```

### Health check endpoint

Your load balancer / orchestrator should poll:
```
GET https://api.hellenicdir.com/health
```
Expected response: `200 {"status":"ok","db":"ok"}`

If the database is unreachable, the endpoint returns `503 {"status":"error","db":"error"}`. Route this to an alert.

### Graceful shutdown

The server handles `SIGTERM` and `SIGINT` by:
1. Stopping accepting new connections (`app.close()`)
2. Disconnecting Prisma (`prisma.$disconnect()`)
3. Quitting Redis (`redis.quit()`)

Kubernetes, ECS, and most PaaS providers send `SIGTERM` before killing a container. The default 30-second grace period is sufficient for in-flight requests.

---

## Web Deployment (Next.js)

### Vercel (simplest)

1. Connect the `web/` directory to a Vercel project.
2. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`
   - `JWT_SECRET`
3. Deploy: `vercel --prod`

### Self-hosted / Docker

```bash
cd web
npm run build
npm start          # Starts on port 3000
```

Or use the official Next.js Docker image and set `output: 'standalone'` in `next.config.ts`.

### CDN / Reverse proxy

Put Cloudflare or Nginx in front of the web server:
- Terminate TLS at the edge
- Set `Cache-Control: no-store` for all `/api` paths
- Enable HSTS (the app sets the header but the CDN should enforce it too)

---

## iOS Deployment

### Xcode build schemes

Create two schemes in Xcode:
- **Development**: points to staging API, debug logging on
- **Production**: points to production API, logging off, entitlements signed

### App Store submission checklist

- [ ] `PrivacyInfo.xcprivacy` present at `Resources/PrivacyInfo.xcprivacy` — **required since Spring 2024**
- [ ] `NSUserTrackingUsageDescription` set in `Info.plist` if any tracking APIs used
- [ ] `NSLocationWhenInUseUsageDescription` set (parish map)
- [ ] `NSPhotoLibraryUsageDescription` set (profile photo)
- [ ] `NSCameraUsageDescription` set (profile photo capture)
- [ ] `MinimumOSVersion = 16.0`
- [ ] App uses only `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for Keychain (no background credential access)
- [ ] Account deletion accessible in-app (per June 2022 App Store policy)

### TestFlight

1. Archive in Xcode: **Product > Archive**
2. Upload via Xcode Organizer or `altool`
3. Add internal testers in App Store Connect

---

## Android Deployment

### Keystore (signing)

Create a signing keystore for production:
```bash
keytool -genkey -v \
  -keystore hellenicdir-release.jks \
  -alias hellenicdir \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Reference it in `android/app/build.gradle.kts`:
```kotlin
signingConfigs {
    create("release") {
        storeFile = file(System.getenv("KEYSTORE_PATH") ?: "hellenicdir-release.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias = System.getenv("KEY_ALIAS")
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
```

### Google Play submission checklist

- [ ] `minSdk = 26` — confirms Android 8.0+ minimum
- [ ] `android:networkSecurityConfig="@xml/network_security_config"` in manifest
- [ ] Cleartext disabled in production (`network_security_config.xml`)
- [ ] `EncryptedSharedPreferences` for token storage
- [ ] `isMinifyEnabled = true` for release builds
- [ ] `proguard-rules.pro` keeps Moshi adapter classes and Hilt entry points
- [ ] Account deletion accessible in-app (per Google Play policy June 2022)
- [ ] `POST_NOTIFICATIONS` permission requested at runtime (Android 13+)
- [ ] `HDFirebaseMessagingService` declared in manifest

### CI build command

```bash
./gradlew assembleRelease \
  -PMAPS_API_KEY=$MAPS_API_KEY \
  -PKEYSTORE_PATH=$KEYSTORE_PATH \
  -PKEYSTORE_PASSWORD=$KEYSTORE_PASSWORD \
  -PKEY_ALIAS=$KEY_ALIAS \
  -PKEY_PASSWORD=$KEY_PASSWORD
```

---

## Security Hardening Checklist

### Network
- [ ] TLS 1.2+ enforced on all endpoints
- [ ] HSTS header present: `max-age=31536000; includeSubDomains; preload`
- [ ] HSTS preload list submission at [hstspreload.org](https://hstspreload.org)
- [ ] Rate limiting active on all API routes
- [ ] Auth routes rate-limited more aggressively (5-10 req per 15 min)

### Authentication
- [ ] bcrypt cost factor ≥ 12
- [ ] Constant-time login (dummy hash comparison prevents email enumeration)
- [ ] Refresh tokens stored as SHA-256 hashes — raw token never in DB
- [ ] Atomic token rotation via database transaction (prevents reuse window)
- [ ] JWT access tokens expire in 15 minutes

### Data
- [ ] Sensitive personal data (religious affiliation) requires explicit consent
- [ ] Consent timestamps stored with `privacyPolicyVersion`
- [ ] `AuditLog` table records all admin role changes with IP + user-agent
- [ ] Account soft-delete with 30-day grace period before hard delete

### Headers (all platforms)
- [ ] `Content-Security-Policy` configured
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` restricts camera, microphone, payment

### Email (XSS prevention)
- [ ] All user-supplied content HTML-escaped in email templates (`escapeHtml()`)
- [ ] URL scheme validated before embedding in email links (`safeUrl()`)

---

## Monitoring Recommendations

| Signal | Tool | Threshold |
|---|---|---|
| API error rate | Sentry / Datadog | > 1% 5xx in 5 min |
| DB connection health | `/health` endpoint | Any 503 |
| Response time P95 | APM | > 2000ms |
| Rate limit hits | Redis counter metrics | Spike > 10x baseline |
| Failed logins | Auth log | > 20 failures/min per IP |
| Token refresh failures | Auth log | Any sustained failures |

---

## Secrets Management

Never store secrets in:
- Source code or version control
- Docker image layers
- `console.log` or application logs

Use one of:
- **AWS Secrets Manager** / **Parameter Store** — inject at container start
- **HashiCorp Vault** — dynamic secrets with TTLs
- **Doppler** — developer-friendly secrets sync
- **Vercel Environment Variables** — for the Next.js deployment
- **GitHub Actions Secrets** — for CI/CD pipelines only

---

## Rate Limiting Configuration

Rate limits are configured in `backend/src/server.ts`:

| Route | Limit | Window |
|---|---|---|
| All routes (global) | 100 requests | 1 minute |
| `POST /auth/register` | 5 requests | 15 minutes |
| `POST /auth/login` | 10 requests | 15 minutes |
| `POST /auth/verify-email` | 5 requests | 15 minutes |

Limits are keyed by IP address (`req.ip`). The server sets `trustProxy: true` to read the real IP from `X-Forwarded-For` when behind a load balancer.

Adjust these values in `auth.routes.ts` for your expected traffic patterns.
