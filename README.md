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

## Container

```
docker network create csp-frontend   # once
docker compose -f deploy/compose.yml up --build
```

The image listens on port 80 inside the container and is published as **`4203:80`**, the port the
shell (`csp-front`) uses in `CATALOG_REMOTE_URL`; the container joins the external `csp-frontend`
network, the same one as `csp-auth-portal` and `csp-concessions-portal`. The shell loads this
portal from another origin, so the container renders its CORS rule from the environment when it
starts (ADR-026) and refuses to start without it:

| Variable | Meaning | Development value |
|---|---|---|
| `CORS_ALLOWED_ORIGIN_REGEX` | Origins allowed to load `remoteEntry.json` and the modules of the portal | `^http://localhost:420[0-5]$` |

The origin is the one of the shell (`csp-front`, on port 4200 in development): the variable has the same name and the same value in the shell and in every portal of an environment (ADR-026), so a `qa` or `main` deployment sets the origin of its own shell and not the development default.

`CORS_ALLOWED_ORIGIN_REGEX` **must be a fully anchored regular expression (`^…$`)**: nginx matches
the pattern against the whole `Origin` header, and an unanchored value would also accept any
origin that merely contains it (for example `http://localhost:4200.evil.example`).
`deploy/compose.yml` sets the development value when the variable is not defined. Copy `.env.example` to `.env` for
local values and never commit it. CI builds the image and checks that it answers the allowed
origin, stays silent for any other — including an origin that only contains the allowed one —
and does not start without the variable.

## HU-FE-CATALOG-002 real catalog data

The billboard (`/`) and the movie detail (`/movies/:movieId`) read the public routes of `csp-catalog-api` through the
HttpClient of the shell: `GET /api/v1/catalog/billboard` and `GET /api/v1/catalog/billboard/movies`, which the API gateway
routes since `csp-api-gateway#9` (`APP_GATEWAY_CATALOG_UPSTREAM`). `CatalogApiService` is the typed client and
`BillboardSearchState` holds the filters, the page, the showtimes and the loading, empty and error states. The billboard
searches by text, genre (the exact value, with the genres seen as suggestions) and maximum duration, twelve movies per page.
The API has no route for one movie: the detail takes the movie that the billboard passes in the navigation state or, on a
direct URL, from the upcoming showtimes of the movie, so a movie with none is shown as not available. Neither screen reads
the synthetic dataset or falls back to it: an error is shown as an error with a retry.

Still synthetic: the reports of the administration view, which moved
to the real API one screen at a time (`csp-catalog-portal#82`): the movies, rooms and showtimes screens are real; only the
mock reports screen stays synthetic (the contract has no reports route).

## Synthetic data of the reports

The mock reports screen of the administration view (`/admin/reports`) is the only part of the portal that reads a typed
local dataset, `SYNTHETIC_CATALOG` under `src/app/catalog/data/`, through `AdminCatalogStateService`: the contract has
no reports route. The seat map is not a screen of this portal: the client chooses seats in the Booking portal
(`/booking/showtime/:showtimeId`, `csp-booking-api`), and the synthetic seat map that the portal had in Cut 2 was removed.

### Showtime configuration

#### Showtime IDs
- All `showtimeId` are **UUID v4** for compatibility with Booking API
- Same UUID in Catalog and Booking

#### Integration Catalog ↔ Booking
- Catalog exposes billboard and detail at `/movies/:id`
- **Seat selection → Booking portal** at `/booking/showtime/:showtimeId`
- Catalog **does not** implement hold/reservation (that is HU-FE-BOOKING-001)

## Administration view (`/admin/*`)

The administration screens of `12-ux-ui/mockup/index-admin.html` live under `src/app/catalog/admin/`
and are exposed to the shell as a **second entry point**, `./admin-routes`, exporting `ADMIN_ROUTES`:

| Address | Page | Source of the design |
|---|---|---|
| `/admin/billboard` | `AdminBillboardPageComponent` — schedule a showtime of the real API (auto end time, price in Colombian pesos, room conflict alert from the service) and list/cancel the scheduled ones | mockup § CARTELERA |
| `/admin/movies` | `AdminMoviesPageComponent` — list, create and archive the movies of the real Catalog API (title, genre, duration, classification, synopsis, optional poster, optional trailer link) | mockup § PELÍCULAS |
| `/admin/rooms` | `AdminRoomsPageComponent` — list, create and archive the rooms of the real Catalog API, with their seat capacity | mockup § SALAS |
| `/admin/reports` | `AdminReportsPageComponent` — headline metrics, room occupancy and showtime summary (mock only) | mockup § REPORTES |

- **Shell (`csp-front`)**: `catalogAdminMatcher` consumes only `admin` for `billboard`, `movies` and
  `rooms`, then loads `ADMIN_ROUTES` behind `roleGuard('ADMIN')`. `reports` is not part of that
  matcher, so inside the shell it keeps falling through to the 404 page; it is reachable when the
  portal runs standalone (`npm start` → `http://localhost:4203/admin/reports`).
- **Navigation**: the screens render their own section sub-nav with the `Admin` badge. The brand
  header and the footer belong to the shell (and to `AppComponent` when standalone), so the portal
  never duplicates them.
- **Data**: the movies, the rooms and the showtimes come from `AdminMoviesState`, `AdminRoomsState` and
  `AdminShowtimesState`, which read and write the real Catalog API through `CatalogAdminApiService` (an
  `Idempotency-Key` on every write, an error shown as an error, never the synthetic data). Only the mock reports
  screen reads `AdminCatalogStateService`, a read-only copy of `SYNTHETIC_CATALOG`.
- **Feedback**: `AdminToastService` drives the success/error toasts of the mockup (3.5 s each).

