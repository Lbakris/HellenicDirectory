# Hellenic Directory of America

The premier digital directory for the Greek Orthodox community in North America — connecting members with parishes, private community directories, Greek-owned businesses, and direct messaging, across iOS, Android, and the web.

---

## What Is This?

Hellenic Directory of America is a full-stack, multi-platform application built for the Greek American and Greek Canadian community. It serves three distinct audiences:

- **General public** — discover Greek Orthodox parishes and businesses without signing up
- **Community members** — join private, invite-only directories; message other members; manage a public profile
- **Directory administrators / owners** — manage member lists, send broadcast messages, verify org affiliations

The platform is built with privacy-first design. Religious affiliation is treated as sensitive personal data under CCPA, PIPEDA, Quebec Law 25, and 20 US state privacy statutes. Every user consents explicitly before any data is collected.

---

## Platform Overview

| Platform | Technology | Min Version |
|---|---|---|
| Backend API | Node.js · Fastify · TypeScript · Prisma · PostgreSQL | Node 20+ |
| Web | Next.js 14 App Router · React 18 · Tailwind CSS | Chrome 110+ / Safari 16+ |
| iOS | SwiftUI · Swift 5.9 · MVVM | iOS 16.0+ |
| Android | Kotlin · Jetpack Compose · Hilt | Android 8.0 (API 26+) |
| Shared types | TypeScript | — |

---

## Features

### Public (no login required)
- Search Greek Orthodox parishes by city, state, or zip code
- View parish details: clergy, address, service times, map
- Browse Greek-owned and Greek-operated businesses by category and location

### Members (login required)
- Join private, invite-only community directories
- View and search the member list within a directory
- Send direct messages and read broadcast announcements
- Edit a profile with photo, city, industry, employer, and organization affiliations
- Download a copy of all personal data (CCPA right-to-know)
- Delete account with 30-day grace period (CCPA/GDPR right to erasure)

### Directory Administrators
- Invite members by email (dual-approval: invite + accept)
- Remove members, update member roles
- Send broadcast messages to all directory members
- Verify member organization affiliations (AHEPA, Philoptochos, etc.)

### Platform Owners / Admins
- Manage all users, directories, and business listings
- Assign and revoke app-level roles
- Review immutable audit logs for all sensitive admin actions
- Manage sponsored business listings and categories

---

## Architecture at a Glance

```
┌────────────────────────────────────────────────────────┐
│                   Client Layer                         │
│  Next.js Web  │  iOS SwiftUI  │  Android Compose       │
└──────────────────────┬─────────────────────────────────┘
                       │ HTTPS / REST JSON
                       ▼
┌────────────────────────────────────────────────────────┐
│              API Layer — Fastify + TypeScript          │
│  /api/v1/auth  /api/v1/parishes  /api/v1/directories  │
│  /api/v1/businesses  /api/v1/messaging  /api/v1/admin  │
└────────────┬──────────────────────┬────────────────────┘
             │                      │
      ┌──────▼──────┐        ┌──────▼──────┐
      │ PostgreSQL  │        │    Redis    │
      │  (Prisma)   │        │  (rate-lim/ │
      │             │        │   sessions) │
      └─────────────┘        └─────────────┘
```

---

## Repository Layout

```
HellenicDirectory/
├── backend/          Node.js/Fastify REST API + Prisma
├── web/              Next.js 14 web application
├── ios/              SwiftUI iOS application
├── android/          Kotlin/Compose Android application
├── shared/           TypeScript type definitions (monorepo shared)
├── docs/             This documentation
├── docker-compose.yml  Local PostgreSQL + Redis
└── .env.example      Required environment variables
```

---

## Quick Start

See [docs/getting-started.md](getting-started.md) for full instructions.

```bash
# 1 — Start local services
docker compose up -d

# 2 — Install backend dependencies and migrate DB
cd backend && npm install && npm run db:migrate && npm run db:seed

# 3 — Start the backend API
npm run dev          # http://localhost:4000

# 4 — Start the web frontend
cd ../web && npm install && npm run dev    # http://localhost:3000
```

---

## Security & Compliance Summary

| Requirement | Implementation |
|---|---|
| CCPA right-to-delete | `DELETE /api/v1/auth/account` — 30-day soft delete |
| CCPA right-to-know | `GET /api/v1/account/data` — JSON export |
| Sensitive data opt-in | Explicit consent checkbox at registration on all platforms |
| Religious data classification | Flagged in Privacy Policy; separate consent field |
| Password security | bcrypt (cost 12) + timing-safe comparison |
| Token security | JWT RS256; SHA-256 hashed refresh tokens in DB |
| Transport security | HSTS 1-year; TLS enforced in production |
| Admin audit logging | Immutable `AuditLog` table for all role changes |
| iOS token storage | Keychain — `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` |
| Android token storage | EncryptedSharedPreferences (AES-256-GCM/SIV) |

---

## Documentation

| File | Contents |
|---|---|
| [docs/getting-started.md](getting-started.md) | Prerequisites, local setup, first run |
| [docs/setup-guide.md](setup-guide.md) | Full environment config, secrets, deployment |
| [docs/user-manual.md](user-manual.md) | End-user guide for all platforms |
| [docs/design-description.md](design-description.md) | Design system, colors, typography, UX principles |
| [docs/code-guide.md](code-guide.md) | Annotated code walkthrough for all four codebases |

---

## License

Proprietary. All rights reserved. See the Business Plan and PRD documents for commercial terms.
