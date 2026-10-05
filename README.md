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
the billboard renders. The dataset includes `The Silent Reel`, one showtime, Room 1, and seats
`A1` through `B3`; the first seat is unavailable in the deterministic seat-map example.
