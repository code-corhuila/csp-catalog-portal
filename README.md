# csp-catalog-portal

> catalog bounded context: web UI (remote)

Part of the **Cinesync Platform** distributed system — team `cinesync-platform`, Group 1.
Governance and documentation live in [`csp-docs`](https://github.com/code-corhuila/csp-docs).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `csp-docs`.

## Build, test and run

Angular 21 portal with Native Federation, on Node 22 (ADR-022 in `csp-docs`). It has no HTTP client of its own: the shell
(`csp-front`) provides it, so the portal is exercised by loading it from the shell.

```bash
npm ci
npm run build
npm run lint
npm test -- --browsers=ChromeHeadless
npm start                                  # dev server on port 4203
docker build -f deploy/Dockerfile -t csp-catalog-portal .
```

`deploy/compose.yml` joins the `platform` network and exposes port 8080 without publishing it. Copy `.env.example` to `.env` for
local values and never commit it.

## HU-FE-CATALOG-001 synthetic data

The Catalog portal currently exercises the billboard and seat-map flow with a typed local dataset
under `src/app/catalog/data/`. `SyntheticCatalogDataService` is the ADR-022 data boundary for
this Cut 2 slice: it does not use `HttpClient` or a backend and filters `DRAFT` movies before
the billboard renders. The dataset includes 5 published movies (`The Silent Reel`, `Interstellar`,
`Oppenheimer`, `The Dark Knight`, `Avatar: The Way of Water`) and 1 draft movie (`Neon Sky`),
one room (`Room 1`) with **48 seats distributed in 6 rows × 8 columns: A1 through F8**.
Seat availability is deterministic demo data: `A1` is unavailable for the synthetic showtime so the
UI can render both states. It is not a reservation model and must be replaced by the Catalog
availability response when the backend integration is introduced.
Showtimes and seats linked to `DRAFT` movies are excluded by the same service boundary, including
when a user navigates directly to a showtime URL.

### Cut 2 — Seat Map & Showtime Configuration

#### Seat Map
- **48 seats** distributed in 6 rows × 8 columns: **A1–F8**
- A1: occupied (demo), A2–F8: available

#### Showtime IDs
- All `showtimeId` are **UUID v4** for compatibility with Booking API
- Same UUID in Catalog and Booking

#### Integration Catalog ↔ Booking
- Catalog exposes billboard and detail at `/movies/:id`
- **Seat selection → Booking portal** at `/booking/showtime/:showtimeId`
- Catalog **does not** implement hold/reservation (that is HU-FE-BOOKING-001)
- Showtime DRAFT (`bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`) does not expose seat map

## Administration view (`/admin/*`)

The administration screens of `12-ux-ui/mockup/index-admin.html` live under `src/app/catalog/admin/`
and are exposed to the shell as a **second entry point**, `./admin-routes`, exporting `ADMIN_ROUTES`:

| Address | Page | Source of the design |
|---|---|---|
| `/admin/billboard` | `AdminBillboardPageComponent` — schedule a showtime (auto end time, room conflict alert) and list/delete the scheduled ones | mockup § CARTELERA |
| `/admin/movies` | `AdminMoviesPageComponent` — create/delete movies (title, genre, duration, classification, synopsis, trailer) | mockup § PELÍCULAS |
| `/admin/rooms` | `AdminRoomsPageComponent` — create/delete rooms with their seat capacity | mockup § SALAS |
| `/admin/reports` | `AdminReportsPageComponent` — headline metrics, room occupancy and showtime summary (mock only) | mockup § REPORTES |

- **Shell (`csp-front`)**: `catalogAdminMatcher` consumes only `admin` for `billboard`, `movies` and
  `rooms`, then loads `ADMIN_ROUTES` behind `roleGuard('ADMIN')`. `reports` is not part of that
  matcher, so inside the shell it keeps falling through to the 404 page; it is reachable when the
  portal runs standalone (`npm start` → `http://localhost:4203/admin/reports`).
- **Navigation**: the screens render their own section sub-nav with the `Admin` badge. The brand
  header and the footer belong to the shell (and to `AppComponent` when standalone), so the portal
  never duplicates them.
- **Data**: `AdminCatalogStateService` seeds a mutable copy of `SYNTHETIC_CATALOG` for the session.
  The constant itself is never modified: the public billboard, the seat map and the 40 original unit
  tests keep reading the frozen dataset. No `HttpClient` is involved.
- **Feedback**: `AdminToastService` drives the success/error toasts of the mockup (3.5 s each).

