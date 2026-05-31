# 9 · Build, test & deploy

Everything here runs through `d2-app-scripts`, the DHIS2 App Platform CLI, via the
`scripts` in [`package.json`](../package.json). This guide explains each command,
what it produces, and the gotchas.

Official reference: <https://platform.dhis2.nu/>.

## 9.1 The scripts at a glance

| Command | Underlying | Output / effect |
|---------|-----------|-----------------|
| `yarn start` | `d2-app-scripts start` | Dev server + hot reload. |
| `yarn build` | `prebuild` then `d2-app-scripts build` | A production bundle + installable `.zip` in `build/`. |
| `yarn test` | `d2-app-scripts test` | Runs Jest tests. |
| `yarn deploy` | `d2-app-scripts deploy` | Builds and uploads to a DHIS2 instance. |
| `yarn i18n:extract` | `d2-app-scripts i18n extract` | Updates `i18n/en.pot` from `i18n.t(...)` calls. |
| `yarn i18n:generate` | `d2-app-scripts i18n generate` | Builds runtime locale bundles (`src/locales/`, git-ignored). |

## 9.2 Development: `yarn start`

Starts a local server that compiles the app, serves it, and reloads the browser
when you save a file ("hot reload"). Because almost every screen reads live data,
the dev server proxies API calls to a real DHIS2 backend — you'll provide a server
URL and credentials the first time (see [guide 1 §1.4](./01-getting-started.md#14-running-it-locally)
and the platform docs).

Day-to-day, this is the command you keep running.

## 9.3 Production build: `yarn build`

Two phases:

1. **`prebuild`** (declared at `package.json:15`) runs
   `node scripts/check-schema-drift.mjs`. If the report forms have drifted from the
   vendored backend schemas, **the build fails here** with a `schema drift` error.
   That's intended — fix the drift (see [guide 7](./07-forms-and-the-reporting-backend.md))
   and rebuild. npm/yarn run a script named `prebuild` automatically before a
   script named `build`; that's the convention wiring them together.
2. **`d2-app-scripts build`** type-checks, bundles, splits the lazy page chunks,
   and packages an installable app `.zip` under `build/`.

`build/` is git-ignored; it's an artefact, not source.

> **TypeScript errors block the build.** Because `tsconfig.json` has `noEmit`, the
> bundler is what actually emits JS, but type errors still fail the build. A clean
> `yarn build` means the types check *and* the schema is in sync.

## 9.4 Tests: `yarn test`

Runs Jest. Today the suite is the smoke test in `src/App.test.tsx`, which renders
`<App>` with fake data (a `CustomDataProvider` and a stubbed `fetch`) and asserts it
mounts without throwing. It's deliberately minimal but is the template for adding
component tests: provide mock data through the runtime's test provider, render,
assert.

Note the `*.spec.ts` files in `src/forms/` are **not** Jest tests despite the name
— they're the wire-field contract declarations checked by TypeScript and the
drift script (see [guide 7 §7.5](./07-forms-and-the-reporting-backend.md#75-the-schema-drift-guard)).

## 9.5 Deploy: `yarn deploy`

Builds and uploads the app to a DHIS2 instance you configure. In practice
deployment is usually done by CI or by an administrator against the target server;
check with the team for the actual release process before running this against any
shared instance. The repo guardrails also forbid pushing directly to `main`/`master`
— deployment and release flow go through the team's normal process.

## 9.6 i18n commands

Covered in [guide 8 §8.2](./08-styling-i18n-and-authorities.md#82-internationalisation-i18n).
In short: `i18n:extract` after you add/change UI strings (updates `i18n/en.pot`);
`i18n:generate` to build the runtime bundles. The per-language `.po` files in
`i18n/` are maintained by translators.

## 9.7 The typical workflow

```
yarn install            # once, and whenever dependencies change
yarn start              # develop with hot reload
# … edit code …
yarn test               # check nothing broke
yarn i18n:extract       # if you added/changed user-facing strings
yarn build              # verify a clean production build (runs the drift check)
```

If `yarn build` is green, the types check, the schema is in sync, and the bundle is
installable — a good gate before opening a pull request.

---

Next: the [Glossary](./10-glossary.md) — every term and acronym in one place.
</content>
