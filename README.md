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
npm start                                  # dev server on port 4202
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
