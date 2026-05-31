# 1 · Getting started

This guide gets the app running on your machine and explains what each tool in
the toolchain is for. If a command fails, the [Build, test & deploy](./09-build-test-deploy.md)
guide has more detail; this one is the happy-path quickstart.

## 1.1 The tools you need installed

| Tool | What it is | Why this project needs it |
|------|------------|---------------------------|
| **Node.js** | A program that runs JavaScript *outside* a browser (on your laptop, on servers). | All the build/dev tooling is written in JavaScript and runs on Node. |
| **Yarn (Classic, v1)** | A *package manager* — it downloads the libraries the app depends on. | This repo is pinned to `yarn@1.22.22` (see `package.json:7`). Use Yarn, not npm, so everyone resolves the same dependency versions from `yarn.lock`. |

> **What is a "package manager"?** Modern apps are built from hundreds of small
> reusable libraries ("packages") published to a public registry (npmjs.com).
> Listing a package in `package.json` and running `yarn install` downloads it and
> all *its* dependencies into a local `node_modules/` folder. `yarn.lock` records
> the *exact* versions that were resolved, so a teammate who runs `yarn install`
> later gets a byte-for-byte identical dependency tree.

> 📖 **Reference:** [Node.js](https://nodejs.org/en/about) · [Yarn Classic (v1)](https://classic.yarnpkg.com/en/docs) · [DHIS2 App Platform — Installation](https://developers.dhis2.org/docs/app-platform/installation/)

Check what you have:

```bash
node --version    # any recent LTS (v18+) is fine
yarn --version    # should report 1.22.x
```

## 1.2 Install dependencies

From the repository root:

```bash
yarn install
```

This reads `package.json`, resolves everything against `yarn.lock`, and populates
`node_modules/` (which is git-ignored — see `.gitignore`). You only need to re-run
it when the dependency list changes.

## 1.3 The scripts you'll use

All the everyday commands are defined under `"scripts"` in
[`package.json`](../package.json). You run them with `yarn <script-name>`. Each one
is a thin wrapper around **`d2-app-scripts`**, the DHIS2 App Platform's build CLI
(more on that in [guide 4](./04-dhis2-app-platform.md)).

| Command | What it does |
|---------|--------------|
| `yarn start` | Starts a local dev server with hot-reload. Edit a file, the browser updates. |
| `yarn build` | Produces a production build (a `.zip` you can install into DHIS2). Runs `prebuild` first. |
| `yarn test` | Runs the test suite (Jest). |
| `yarn deploy` | Builds and uploads the app to a configured DHIS2 instance. |
| `yarn i18n:extract` | Scans the source for `i18n.t('...')` calls and updates the translation template. |
| `yarn i18n:generate` | Generates the runtime translation files from the `.po` files in `i18n/`. |

The `prebuild` script (`package.json:15`) runs `scripts/check-schema-drift.mjs`
automatically before every `build`. That guard is explained in
[guide 7](./07-forms-and-the-reporting-backend.md) — for now just know that a
broken build complaining about "schema drift" is *that* check doing its job.

## 1.4 Running it locally

```bash
yarn start
```

The dev server needs to talk to a real DHIS2 backend to fetch data (the current
user, organisation units, reference datasets). The App Platform handles this with
a **proxy**: you point it at a DHIS2 server and it forwards API calls there while
serving your local code. The platform will prompt you for a server URL and
credentials, or you can configure them; see the App Platform docs on
[getting started / the dev server](https://developers.dhis2.org/docs/app-platform/getting-started/)
for the exact flags.

> **Why does it need a live server?** Almost every screen in this app reads data
> from DHIS2 (`useDataQuery`) or from the NeoIPC-Reporting service. There is no
> local database — the app is purely a front-end. The one place you can see it run
> *without* a server is the test in `src/App.test.tsx`, which feeds it fake data.

## 1.5 What gets created (and ignored)

Per `.gitignore`, these are generated and must never be committed:

- `node_modules/` — downloaded dependencies.
- `build/` — the output of `yarn build`.
- `.d2/` — App Platform scratch/cache.
- `src/locales/` — generated translation bundles (`yarn i18n:generate` output).

If you see any of these in `git status`, something is misconfigured — they should
stay invisible to git.

## 1.6 Editor setup

Use an editor with **TypeScript** support (VS Code is the common choice and has it
built in). The single biggest productivity win for a newcomer is that the editor
will show you the *type* of any value when you hover over it, and will red-underline
mistakes before you ever run the code. Lean on this constantly — it is the fastest
way to learn what shape the data has.

---

Next: [JavaScript & TypeScript](./02-javascript-and-typescript.md) — the language
the whole app is written in.
</content>
