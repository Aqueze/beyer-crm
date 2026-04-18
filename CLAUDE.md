# BeyCRM — Beyer Maschinenbau Internal CRM

## Project Overview
Internal CRM for Beyer Maschinenbau GmbH. Imports Outlook contacts via Excel, displays them on a world map, and shows nearby customers for sales reps on the go. When addresses are missing, the company is resolved via email domain.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **ORM:** Drizzle ORM with custom PostGIS GEOGRAPHY(POINT, 4326) types
- **Database:** PostgreSQL 16 + PostGIS 3.4
- **Auth:** NextAuth.js v5 (Credentials provider)
- **UI:** Tailwind CSS 4 + shadcn/ui + @tanstack/react-table
- **Map:** Leaflet.js + OpenStreetMap (no API key needed, marker clustering)
- **PWA:** @serwist/next (Service Worker, offline cache, installable)
- **Geocoding:** Nominatim (primary, 1 req/sec free) + OpenCage (fallback)
- **Excel:** SheetJS (xlsx)
- **Proxy:** Caddy (auto-HTTPS via Let's Encrypt)
- **Deployment:** Docker Compose on own server

## Database Schema
```
users          — Internal CRM users (5-20), roles: admin/user
companies      — Companies with address + PostGIS GEOGRAPHY(POINT, 4326), domain field
contacts       — Contacts with own address OR fallback to Company-Location, Tags as TEXT[] with GIN index
imports        — Import history with Column-Mapping (JSONB), status, error log
geocode_cache  — Cached geocoding results (SHA256 hash of address)
domain_lookups — Email domain → company info cache, manually overridable
```

## Geospatial Indexes
```sql
CREATE INDEX idx_contacts_location ON contacts USING GIST (location);
CREATE INDEX idx_companies_location ON companies USING GIST (location);
```

## Location Fallback Chain
1. Contact has own address → `location_source = 'own_address'`
2. Contact has Company with address → `location_source = 'company'`
3. Only email available → Domain-Lookup → `location_source = 'email_domain'`

## Project Structure
```
beyer-crm/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── layout.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx               — Dashboard
│   │   ├── contacts/page.tsx      — Contact list
│   │   ├── contacts/[id]/page.tsx — Contact detail
│   │   ├── contacts/nearby/page.tsx — Nearby (GPS)
│   │   ├── companies/page.tsx     — Company list
│   │   ├── map/page.tsx           — Fullscreen map
│   │   ├── import/page.tsx        — Excel import wizard
│   │   └── settings/page.tsx      — Domain mappings, settings
│   └── api/...                    — Route Handlers
├── components/
│   ├── map/contact-map.tsx        — Leaflet (dynamic, no SSR)
│   ├── import/column-mapper.tsx   — Excel columns to DB fields
│   ├── contacts/nearby-list.tsx   — Nearby with distance
│   └── ui/...                     — shadcn/ui components
├── lib/
│   ├── db/schema.ts               — Drizzle Schema + PostGIS Types
│   ├── services/geocoder.ts       — Nominatim + OpenCage + Rate-Limit
│   ├── services/domain-lookup.ts  — Email → Company resolver
│   ├── services/excel-parser.ts   — SheetJS wrapper
│   └── auth/auth.ts              — NextAuth config
├── docker-compose.yml             — App + PostGIS + Caddy
├── Dockerfile
└── Caddyfile
```

## API Endpoints
- `GET/POST/PUT/DELETE /api/contacts` — CRUD
- `GET /api/contacts/nearby` — PostGIS ST_DWithin query
- `GET /api/contacts/export` — Excel/CSV export
- `GET/POST/PUT/DELETE /api/companies` — CRUD
- `POST /api/imports/upload` — Excel upload + preview
- `POST /api/imports/execute` — Import with column mapping
- `GET /api/imports` — Import history
- `POST /api/geocode` — Single address geocode
- `POST /api/geocode/batch` — Batch after import
- `POST /api/domains/lookup` — Email domain → company
- `GET /api/map/contacts` — GeoJSON FeatureCollection

## Nearby Query (Core Feature)
```sql
SELECT *, ST_Distance(location, ST_MakePoint($lng, $lat)::geography) AS distance_m
FROM contacts
WHERE ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius)
ORDER BY distance_m
LIMIT 50;
```

## Email Domain Company Resolution (Layered)
1. Internal lookup table (manually maintained, highest priority)
2. Website title scraping (fetch domain → parse)
3. TLD country code (.co.jp → Japan, .nl → Netherlands, .se → Sweden)
4. Clearbit API (50 lookups/month free) or Hunter.io
5. Manual override in settings UI

## PWA / Mobile
- Bottom tab navigation (Contacts, Map, Nearby, Import)
- GPS permission on first Nearby call
- Radius slider: 10km / 25km / 50km / 100km / 250km
- Tap-to-Call, Tap-to-Email, "Route planen" (Google/Apple Maps)
- Installable as app on phone

## Important Technical Notes
- **Leaflet SSR:** Use `next/dynamic` with `ssr: false` (Leaflet needs `window`)
- **Geocoding Rate-Limit:** Nominatim max 1 req/sec → Token-bucket rate limiter. For 2000+ contacts ~35 min batch time.
- **Outlook Export Columns:** "First Name", "Last Name", "Company", "E-mail Address", "Business Street", "Business City" → auto-mapping
- **DSGVO:** B2B contact data under "legitimate interest" (Art. 6(1)(f)), add deletion function

## Deployment
Docker Compose on own server: app (Next.js) + db (postgis/postgis:16-3.4) + caddy (reverse proxy with auto-HTTPS). DNS A-record (e.g. crm.beyer-maschinenbau.de) pointing to server IP.

## Phase 1: Foundation (Week 1-2) ✅
1. Project setup (Next.js, Drizzle, Docker, PostGIS) ✅
2. Auth (Credentials provider) ✅
3. Contact CRUD + search ✅
4. Leaflet map with markers + clustering ✅
5. Manual geocoding on contact creation ✅

## Phase 2: Core Features (Week 3-4)
1. **Geocoder Service** — Nominatim + OpenCage fallback, rate-limited token bucket, geocode_cache DB table
2. **Domain Lookup Service** — Email domain → company resolver with layered approach (internal DB → TLD country → web scrape)
3. **Settings Page** — Domain mappings UI (CRUD for domain_lookups table), geocoding config
4. **Batch Geocoding API** — POST /api/geocode/batch for post-import geocoding with progress tracking
5. **Contact Detail Page** — Full contact view with edit form, location info, tags, interaction history
6. **Contact Create/Edit Form** — Form with address autocomplete, geocode-on-save, company linking
7. **Nearby Page** — GPS-based nearby contacts with radius slider (10/25/50/100/250km)
8. **Companies Page** — Company CRUD with location, domain, contact count
9. **Import Execute API** — POST /api/imports/execute with company auto-creation, domain lookup fallback

## Phase 3: Testing & Documentation (Week 5)
1. **Test Setup** — Vitest + React Testing Library, test environment config
2. **Unit Tests** — Services: geocoder (rate limiting, cache), domain-lookup (TLD mapping, scraping)
3. **API Route Tests** — All API endpoints: contacts CRUD, nearby, companies CRUD, geocode, domain lookup, imports
4. **Component Tests** — Contact forms, import wizard, nearby list, settings page
5. **Documentation** — README.md with full setup guide, API docs, architecture overview, deployment guide
6. **PWA Icons** — SVG icons for 192px + 512px + favicon generation script

## Code Standards
- TypeScript strict mode
- Type hints on all public functions
- shadcn/ui components (no custom UI library)
- 2-space indentation for TS/TSX, standard for other files
- No wildcard imports
