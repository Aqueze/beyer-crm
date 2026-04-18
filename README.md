# BeyCRM

Internal CRM for Beyer Maschinenbau GmbH.

## Tech Stack
- Next.js 15 (App Router, TypeScript)
- Drizzle ORM + PostgreSQL 16 + PostGIS 3.4
- NextAuth.js v5 (Credentials)
- Tailwind CSS 4 + shadcn/ui
- Leaflet.js + OpenStreetMap
- PWA with @serwist/next
- Caddy reverse proxy

## Setup

```bash
npm install
cp .env.example .env.local
docker compose up -d
npm run db:push
npm run dev
```

## Development

```bash
npm run dev          # Start dev server
npm run db:studio    # Open Drizzle Studio
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to DB
```
