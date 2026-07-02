# neoipc-app end-to-end (e2e) suite

Browser-driven tests (Playwright) that exercise behaviour type-checking and
unit tests can't: authority-driven nav filtering, per-user org-unit picker
scoping, report render (inline HTML fragment + PDF download), admin CRUD, and
UI-locale switching. They run against an **installed** app bundle served from a
DHIS2 origin — production fidelity, not the `yarn start:dev` proxy.

## What runs

| Spec | Covers |
|------|--------|
| `nav-authority` | Authority-filtered left-nav: superuser sees all four items; a report-only user sees the two report items and neither admin item. |
| `org-unit-picker` | Per-user department scoping (`withinUserHierarchy`): each report user sees only their country's department. |
| `partner-report-online` | Online render: HTML mounts `#neoipc-rendered-report`; PDF triggers a `partner-report.pdf` download. |
| `partner-report-data-file` | Render from an uploaded partner-data JSON, both formats. *(needs a real fixture — see `data/README.md`)* |
| `reference-report` | Render a stored reference dataset, both formats. *(needs a real fixture)* |
| `admin-crud` | reference-data list (upload → row → delete); validation-exceptions singleton (upload → current file → remove). |
| `locale-switch` | `keyUiLocale=de` + reload flips the translated nav label. |

## Prerequisites

1. **Dependencies** — `@playwright/test` (via `yarn install`) and the three
   browser engines: `npx playwright install chromium firefox webkit`
   (add `--with-deps` on Linux for the engines' system libraries).
2. **A running, seeded DHIS2 stack** reachable at `DHIS2_BASE_URL`, with the
   play package imported (departments `AT_TEST_TEST` / `CH_TEST_TEST`, users
   `play.admin`, `play.at.report1`, `play.ch.report1`) and synthetic patients
   under `AT_TEST_TEST`. Global setup **installs the app bundle** into DHIS2 and
   asserts the seed is present; it does not seed.
3. **A built bundle** at `build/bundle/neoipc-app-<version>.zip` (`yarn build`).

## Auth model

Each persona is logged in **once** via DHIS2 form login
(`POST /dhis-web-commons-security/login.action`) and its `JSESSIONID` session is
saved as a Playwright `storageState` (`e2e/.auth/<user>.json`, git-ignored).
Basic auth is deliberately **not** used: DHIS2's API is stateless
(`SessionCreationPolicy.NEVER`), so a Basic-auth call mints no auth-bearing
session, and the `/neoipc` reporting mount authenticates *only* by validating
that cookie. See `dhis2-login.ts`.

## Running

```sh
# all three engines
npx playwright test

# one engine (fast dev loop)
npx playwright test --project=chromium

# one spec, headed
npx playwright test --project=chromium --headed -g "org-unit-picker"
```

Environment (all have defaults for the local stack):

| Var | Default | Purpose |
|-----|---------|---------|
| `DHIS2_BASE_URL` | `http://localhost:8080` | Stack origin. |
| `DHIS2_ADMIN_USER` / `DHIS2_ADMIN_PASS` | `admin` / `district` | Installs the app + uploads the reference fixture. |
| `PLAY_USER_PASSWORD` | `NeoIPC-Play1` | Password on the seeded play users. |

The three engines run **serially** (`workers: 1`): every engine shares one DHIS2
substrate and the singleton validation-exceptions resource, so admin CRUD is the
binding constraint. Render assertions allow up to ~12 min (the Quarto/R backend
render can take ~10 min).

## Fixtures

See [`data/README.md`](data/README.md). Two dataset fixtures are committed as
placeholders and their dependent specs skip until real captures are dropped in.

## First-run notes

These are the points most likely to need a small adjustment on the first live
run (marked `first-run` in the code):

- `@dhis2/ui` radio/multiselect gestures — `setDataSource`/`setOutputFormat`
  use `input.check()`; the department and dataset dropdown open/click may need
  tuning against the running widgets.
- The Partner Report reporting period uses a wide range typed into the
  `CalendarInput`; confirm it accepts a typed ISO date and overlaps the seeded
  demo-data date range.
