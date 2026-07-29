# neoipc-app

[![build-and-test](https://github.com/NeoIPC/neoipc-app/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/NeoIPC/neoipc-app/actions/workflows/build-and-test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The NeoIPC application for DHIS2 — where a neonatal department requests its surveillance
reports, and where the network's administrators maintain the reference data those reports
are benchmarked against. It runs inside DHIS2 as a
[DHIS2 App Platform](https://developers.dhis2.org/docs/app-platform/getting-started) app
(React and TypeScript) and drives report generation through the
[NeoIPC-Reporting](https://github.com/NeoIPC/NeoIPC-Reporting) service.

[NeoIPC](https://neoipc.org) works to reduce the transmission of resistant bacteria in
neonatal intensive care across Europe and globally; its
[surveillance system](https://neoipc.org/surveillance/) collects healthcare-associated
infection and antimicrobial-use data from neonatal departments. This app is the face of
that system for the people who take part in it.

## What it does

- **Report forms** for the Partner Report a department receives and the network-wide
  Reference Report — choose an organisation unit, a period and the content to include,
  then render inline or download a PDF. A report can also be rendered from an uploaded
  data file rather than live from DHIS2.
- **Administration** of the reference datasets reports are benchmarked against and of the
  validation-exception file.
- **A role-filtered shell.** The left navigation shows only what the signed-in user may
  actually do, driven by the custom DHIS2 authorities `F_NEOIPC_REPORT` and
  `F_NEOIPC_ADMIN`, and the organisation-unit picker is scoped to each user's own
  hierarchy.
- **Localization** following the DHIS2 user-interface locale, with catalogues for the nine
  languages the rest of the project targets — Afrikaans, German, Greek, Spanish, Estonian,
  French, Italian, Nepali and Turkish. The plumbing works end to end; the catalogues
  themselves are nearly empty so far, so the interface is in practice still English. See
  [Contributing](#contributing).

**DHIS2 versions.** The app declares a floor of **2.40** and is exercised end-to-end against **2.40**
and **2.41**. It does **not** currently work on **2.42 or later**: login succeeds but the app shell
never mounts, so the navigation never appears — 42 of 45 end-to-end specs fail that way on 2.42.5.1,
identically across all three browser engines. The cause is not yet established, so treat 2.42+ as
unsupported rather than untested.

## Installing a release

Each release attaches an installable bundle, `neoipc-app-<version>.zip`. Install it on a
DHIS2 instance through **App Management → Upload app**, or with `d2-app-scripts deploy`.
[`RELEASING.md`](RELEASING.md) describes how a release is cut.

## Development

```sh
yarn install
yarn start:dev
```

`yarn start:dev` serves the app on `http://localhost:3000` and points it at its **own**
origin, while the Vite dev server proxies the DHIS2 paths (`/api`, `/neoipc`, …) to a
DHIS2 instance — `http://localhost:8080` unless you say otherwise. Because every request
is then same-origin there is **no CORS to configure**: no `corsWhitelist` entry, no proxy
flag, no cache to clear. The login modal asks only for a username and password, since the
server is fixed to the dev origin. Edits hot-reload.

- Different DHIS2 instance: `DHIS2_PROXY_TARGET=<url> yarn start:dev`.
- Different port: `PORT=3001 yarn start:dev` (make sure it is free).
- Plain `yarn start` instead lets you type any server into the login modal — use it
  against a remote instance that already allows this origin.

To check everything that does not need a running instance — type-checking, the report-form
schema-drift check described below, and the unit tests:

```sh
yarn validate
```

The browser-driven end-to-end suite is separate: it runs against an **installed** bundle on
a seeded DHIS2 instance rather than the dev proxy, because that is what production looks
like. [`e2e/README.md`](e2e/README.md) covers what it exercises and what it needs.

## Part of the NeoIPC surveillance system

| Repository | Role |
|------------|------|
| [Surveillance-Toolkit](https://github.com/NeoIPC/Surveillance-Toolkit) | The protocol, the case definitions, the DHIS2 metadata and the report sources |
| [neoipcr](https://github.com/NeoIPC/neoipcr) | R package that reads NeoIPC data out of DHIS2 and computes the surveillance indicators |
| [NeoIPC-Reporting](https://github.com/NeoIPC/NeoIPC-Reporting) | Service that renders the toolkit's reports on demand and serves them over HTTP |
| **neoipc-app** | *(this repository)* The DHIS2 application people use to request reports and administer reference data |

The report forms are built against snapshots of NeoIPC-Reporting's report-parameter schemas,
vendored under [`src/schemas/`](src/schemas/). `yarn validate` always checks each form
against its snapshot, so a form and its contract cannot drift apart unnoticed. Checking the
snapshots themselves against the live backend is a second, opt-in mode of the same script —
point `NEOIPC_REPORTING_REPO` at a NeoIPC-Reporting checkout and it re-emits the schemas and
diffs them.

## Contributing

Issues and pull requests are welcome. The app is pre-alpha and moving quickly, so it is
worth raising an issue before a larger change.

**Translations are the most useful thing an outside contributor can offer right now.** The
app's own interface strings live in [`i18n/`](i18n/) as gettext catalogues, extracted from
the source with `yarn i18n:extract` and bundled by `yarn build` — and they are very nearly
empty in every language. Filling one in and opening a pull request is a genuinely valuable,
self-contained contribution that needs no knowledge of the rest of the system.

The surveillance content the reports themselves carry — the protocol, the report text, the
infectious-agent names — is translated separately, on
[Weblate](https://hosted.weblate.org/projects/neoipc/), where no git knowledge is needed.

## Licensing

- **Code** — MIT License (see [LICENSE](LICENSE)).
- **Documentation / content** — Creative Commons Attribution (CC-BY).
- **NeoIPC symbol & icon assets** — the app icons in [`public/`](public/) and the icon sources in [`design/`](design/) depict the NeoIPC symbol, © Fondazione Penta ETS, used under the NeoIPC brand guideline. They are **not** covered by the MIT or CC-BY licences — see [COPYRIGHT](COPYRIGHT).

## Funding

The NeoIPC project has received funding from the European Union's Horizon 2020 research
and innovation programme under grant agreement No 965328.
