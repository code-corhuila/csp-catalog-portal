# Changelog

All notable changes of `csp-catalog-portal` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/). A release is a `release/<version>` branch cut from `main` and filled with the commits of `qa`,
re-applied with `git cherry-pick -x` (numerals 6.2.3, 10 and 11 of the course norm); it reaches `main` by pull request, never by merging `qa`,
and is tagged `v<version>` once it is merged.

## [Unreleased]

## [2.0.0] - 2026-10-11

MVP 2 (Cut 2), first release of the portal's functionality. Story HU-FE-CATALOG-001
([#6](https://github.com/code-corhuila/csp-catalog-portal/issues/6), epic EP-002): the client browses the billboard, opens a movie and
picks seats for a showtime, and the administrator manages the billboard schedule, movies and rooms, all over a dataset burned into the
portal.

### Added

- Federated remote of the shell (`./routes`), standalone runtime and the mockup look (HU-UI-001,
  [csp-docs#1](https://github.com/code-corhuila/csp-docs/issues/1)).
  ([#10](https://github.com/code-corhuila/csp-catalog-portal/issues/10))
- Synthetic catalog (`SYNTHETIC_CATALOG`: 5 published movies, 1 draft, 8 showtimes, 48 seats A1–F8) with the `PUBLISHED`/`DRAFT`
  filtering enforced in the service layer: draft movies are hidden from the billboard and from direct URL access.
  ([#16](https://github.com/code-corhuila/csp-catalog-portal/issues/16))
- Expanded unit coverage of the synthetic catalog rules.
  ([#17](https://github.com/code-corhuila/csp-catalog-portal/issues/17))
- Billboard with title, duration, genres and their showtimes, dark theme and CineSync branding.
  ([#18](https://github.com/code-corhuila/csp-catalog-portal/issues/18))
- Movie detail with synopsis, showtimes, dynamic rating and trailer, without duplicating the site header.
  ([#19](https://github.com/code-corhuila/csp-catalog-portal/issues/19))
- Showtime seat map with seat labels, deterministic availability, selection and booking links.
  ([#20](https://github.com/code-corhuila/csp-catalog-portal/issues/20))
- Relative movie-detail links so the shell mount under `/movies` no longer 404s.
  ([#26](https://github.com/code-corhuila/csp-catalog-portal/issues/26))
- Administration area exposed as a second federated entry (`./admin-routes`), mounted by the shell at `/admin/*` behind
  `roleGuard('ADMIN')`: layout with section navigation and the `Admin` badge, billboard scheduling with automatic end time and
  room-conflict detection, movies CRUD, rooms CRUD with seat labels in rows of 8, and a mock reports screen.
  ([#35](https://github.com/code-corhuila/csp-catalog-portal/issues/35))
- `AdminCatalogStateService` (session-scoped copy of the dataset with the business rules: a movie or room with scheduled showtimes is
  not deleted) and `AdminToastService`.
  ([#35](https://github.com/code-corhuila/csp-catalog-portal/issues/35))
- Dev server on port **4203** for the catalog (ADR-025: booking keeps 4202), aligned with the shell's `CATALOG_REMOTE_URL`.
- CI workflow and container files (`deploy/Dockerfile`, `deploy/nginx.conf`, `deploy/compose.yml`, health endpoint `/health`, Docker
  network `platform`).
- Specs for the catalog, the screens, the administration services and the routes; **97 specs**, 96.48% of lines (95.76% of statements,
  93.93% of functions, 86.2% of branches; minimum 80%).

### Fixed

- The standalone site header is hidden on the administration routes (`isAdminRoute`), so the admin area shows the shell chrome and the
  module sub-navigation instead of a second header; the exact-segment check is locked by near-miss route tests.
- The `Reportes` tab is rendered with `aria-disabled="true"` while the shell's `catalogAdminMatcher` does not list `reports` (that
  address 404s inside the shell); the page and its route stay intact and work standalone.

### Known limits

- The administration area has no authorization of its own: the shell mounts it behind its role guard, a client-side check on the
  session of the auth portal, and not a security boundary until a backend enforces it.
- There is no backend: the dataset is burned into the portal and must not be deployed to a public environment; the calls to
  `csp-catalog-api` come in a later cut.
- The administration state is in-memory and session-scoped: it resets on reload and nothing is persisted.
- `Reportes` is reachable only when the portal runs standalone; it is re-enabled after the shell adds `reports` to
  `CATALOG_ADMIN_AREAS` (shell first, then this portal).
- Reports data and seat availability are mock/deterministic, and duplicate room names are allowed.
- Open follow-ups, not in this release: import the shared error contract from `csp-front` and drop the unused parser, move
  `ADMIN_SHARED_STYLES` out of the layout component, and render `Access-Control-Allow-Origin` from `CORS_ALLOWED_ORIGIN_REGEX`
  (ADR-026) instead of the fixed `*`.
- No integration or contract tests against an API: the portal does not call one yet.

## [0.1.0] - 2026-10-05

### Added

- Governance, project configuration, Angular 21 + Native Federation setup and the standalone runtime (21 files): the base that 2.0.0
  builds on. ([#10](https://github.com/code-corhuila/csp-catalog-portal/issues/10))
