# 4 · The DHIS2 App Platform

You now know JavaScript/TypeScript and React. This guide explains the layer that
makes this a *DHIS2 app* rather than a generic React app: the **DHIS2 App
Platform** and its companion libraries.

Authoritative docs (the DHIS2 **Developer Portal**, `developers.dhis2.org`, is the
current canonical home):

- App Platform (build tooling, `d2.config.js`): <https://developers.dhis2.org/docs/app-platform/getting-started/>
- App Runtime (`@dhis2/app-runtime`, data access): <https://developers.dhis2.org/docs/app-runtime/getting-started/>
- UI library (`@dhis2/ui`): <https://developers.dhis2.org/docs/tutorials/ui-library/> (live component browser: <https://ui.dhis2.nu/>)
- DHIS2 Web API (the server endpoints): <https://docs.dhis2.org/en/develop/develop.html>

## 4.1 What is DHIS2, and what is a "DHIS2 app"?

**DHIS2** is a large open-source platform for health information systems, used by
ministries of health and programmes worldwide. It stores data (patients, events,
aggregated figures), manages users and permissions, and exposes everything through
a **Web API** (`/api/...`).

A **DHIS2 app** is a front-end program that DHIS2 hosts. When installed, it appears
in the DHIS2 app menu; when opened, it runs in the browser and talks to the DHIS2
Web API using the logged-in user's session. `neoipc-app` is one such app.

The big consequences for how this code is written:

- **Authentication is free.** The user is already logged into DHIS2; the app
  inherits that session (a cookie). You'll see `credentials: 'include'` on fetches
  to carry the session cookie (`src/api/neoipcReporting.ts:41`).
- **The app is pure front-end.** There is no database in this repo. All data comes
  from DHIS2 or from the NeoIPC-Reporting backend.
- **Permissions come from DHIS2.** "Authorities" assigned to the user's DHIS2 role
  decide what they can see — see [guide 8](./08-styling-i18n-and-authorities.md).

> 📖 **Reference:** [DHIS2 Developer Portal](https://developers.dhis2.org/) · [DHIS2 Web API documentation](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/introduction.html)

## 4.2 The App Platform: build tooling you don't have to assemble

A modern React app normally needs you to configure a bundler, a dev server, a test
runner, a translation pipeline, and a packaging step. The **App Platform** bundles
all of that into one CLI, **`d2-app-scripts`**, so you don't maintain that
configuration yourself. The `package.json` scripts are all thin wrappers around it
(see [guide 1](./01-getting-started.md) and [guide 9](./09-build-test-deploy.md)).

> 📖 **Reference:** [App Platform — Getting Started](https://developers.dhis2.org/docs/app-platform/getting-started/) · [Installation](https://developers.dhis2.org/docs/app-platform/installation/)

### `d2.config.js` — the app manifest

[`d2.config.js`](../d2.config.js) is the one file that tells the platform what kind
of app this is and how it should be installed into DHIS2. The important fields:

```js
{
    type: 'app',
    name: 'neoipc-app',
    title: 'NeoIPC',
    entryPoints: { app: './src/App.tsx' },     // the root React component
    minDHIS2Version: '2.40',
    customAuthorities: ['NEOIPC_ADMIN', 'NEOIPC_REPORT'],  // ← see below
    dataStoreNamespace: 'neoipc-app',
    shortcuts: [ … ],                          // entries DHIS2 shows for the app
    viteConfigExtensions: { … },               // tweaks to the underlying bundler
}
```

- **`entryPoints.app`** points at `src/App.tsx` — the top of the component tree.
  The platform generates the surrounding HTML/bootstrap for you.
- **`customAuthorities`** declares two permission strings. On install, DHIS2 makes
  these assignable in the User Role editor; the app then gates features on whether
  the user holds them. This is the source of `AppAuthority` in
  `src/authority/Authority.ts`.
- **`shortcuts`** are quick links DHIS2 surfaces for the app, pointing at hash
  routes (`#/reports/partner`, …) that match the routes in `ContentArea`.
- **`viteConfigExtensions`** lets you adjust the bundler (Vite). The comment in the
  file explains the one tweak here: raising the chunk-size warning threshold
  because `@dhis2/ui` is legitimately large.

> 📖 **Reference:** [`d2.config.js` Configuration File Reference](https://developers.dhis2.org/docs/app-platform/config/d2-config-js-reference/) · Vite (the underlying bundler): <https://vite.dev/>

## 4.3 `@dhis2/app-runtime` — talking to DHIS2

This library is how the app reads its environment and queries the DHIS2 Web API.
Three pieces are used here.

### The provider (set up for you)

The platform wraps your `App` in a runtime **provider** that knows the DHIS2 base
URL and session. You don't see this wrapper in `src/App.tsx` because the platform
injects it — but it's why the hooks below "just work." (The test in
`src/App.test.tsx` supplies its own `CustomDataProvider` with fake data to render
the app without a real server.)

### `useConfig()` — environment info

```ts
const { baseUrl } = useConfig()                // src/App.tsx:35
```

Gives you the DHIS2 server's base URL. The API helpers need it to build absolute
URLs to the NeoIPC-Reporting service (`src/api/neoipcReporting.ts:11`).

> 📖 **Reference:** [`useConfig` hook](https://developers.dhis2.org/docs/app-runtime/hooks/useconfig/)

### `useDataQuery()` — declarative reads from the DHIS2 Web API

Instead of writing `fetch` calls against `/api/...` by hand, you describe *what*
data you want as an object, and the hook fetches it and tracks loading/error state
for you:

```ts
const meQuery = {
    me: { resource: 'me', params: { fields: 'id,authorities' } },
}
const { loading, error, data } = useDataQuery<MeQueryResult>(meQuery)   // src/App.tsx:27-40
```

This reads `GET /api/me?fields=id,authorities`. The result arrives as
`data.me`. `OrganisationUnitMultiSelect` uses the same hook with filters to fetch
org units for a given hierarchy level
(`src/forms/fields/OrganisationUnitMultiSelect.tsx:67-85`).

> **Why `useDataQuery` and not plain `fetch` for DHIS2?** The runtime handles the
> base URL, the session, request de-duplication, and loading/error state in a
> React-friendly way. We *do* use plain `fetch` — but only for the *separate*
> NeoIPC-Reporting service (`src/api/neoipcReporting.ts`), which is not the DHIS2
> Web API. Keeping that distinction clear is important: DHIS2 reads go through
> `app-runtime`; reporting-service calls go through our own `fetch` wrapper.

The `<MeQueryResult>` generic types the response — without it, `data` would be
loosely typed.

> 📖 **Reference:** [`useDataQuery` hook](https://developers.dhis2.org/docs/app-runtime/hooks/usedataquery/) · [Tutorial: Fetching data with useDataQuery](https://developers.dhis2.org/docs/tutorials/app-runtime-query/) · [Query type / data queries](https://developers.dhis2.org/docs/app-runtime/types/query/)

## 4.4 `@dhis2/ui` — the design system

Every visible widget — buttons, cards, tables, inputs, the header bar, spinners,
notice boxes — comes from `@dhis2/ui`, DHIS2's official component library. Using it
means the app automatically looks and behaves like the rest of DHIS2.

You'll recognise the imports at the top of nearly every `.tsx`:

```tsx
import { Button, Card, DataTable, NoticeBox, … } from '@dhis2/ui'
```

A few you'll meet often:

| Component | Role | Seen in |
|-----------|------|---------|
| `HeaderBar` | The DHIS2 top bar | `src/App.tsx:82` |
| `Card` | A content panel | the forms, `AdminListPage` |
| `Button` | Buttons (with `primary`, `destructive`, `loading` flags) | everywhere |
| `NoticeBox` | Inline info/warning/error message | error handling throughout |
| `CircularLoader` / `Center` | Spinner + centring | loading states |
| `DataTable` + friends | Tables | `src/admin/AdminListPage.tsx` |
| `SingleSelectField` / `MultiSelectField` | Dropdowns | the forms |
| `CalendarInput` | Date picker | wrapped by `src/forms/fields/DateField.tsx` |

The app also pulls in `CssReset` and `CssVariables` (`src/App.tsx:80-81`). The
latter exposes DHIS2's design tokens (colours, spacing) as CSS variables like
`--colors-grey300` and `--spacers-dp16`, which the app's own CSS then uses (see
`src/shell/Shell.module.css` and [guide 8](./08-styling-i18n-and-authorities.md)).

> 📖 **Reference:** [Tutorial: the DHIS2 UI Library](https://developers.dhis2.org/docs/tutorials/ui-library/) · [About the DHIS2 design system](https://developers.dhis2.org/design-system/) · live component browser with props & examples: <https://ui.dhis2.nu/>

## 4.5 `@dhis2/d2-i18n` — translation

DHIS2 is used in many languages, so user-facing text must be translatable. Every
display string is wrapped in `i18n.t(...)`:

```tsx
<h1>{i18n.t('Partner Report')}</h1>
```

`yarn i18n:extract` scans for these calls and collects the strings into
`i18n/en.pot`; translators fill in the `.po` files (`i18n/de.po`, etc.);
`yarn i18n:generate` builds the runtime bundles. This has real consequences for how
strings are written in the code — they must be *literal* arguments to `i18n.t`, not
variables — which is why labels are thunks and enum labels use big `switch`
statements. The full explanation is in
[guide 8](./08-styling-i18n-and-authorities.md).

> 📖 **Reference:** [Guide: How to add translation support to an application](https://developers.dhis2.org/docs/guides/translation-support/)

## 4.6 Putting the libraries together

A single screen typically uses all of these at once. For example,
`OrganisationUnitMultiSelect`:

- reads DHIS2 data with **`useDataQuery`** (`app-runtime`),
- renders the dropdown with **`MultiSelectField`** (`@dhis2/ui`),
- localises its labels with **`i18n.t`** (`d2-i18n`),
- and is a **React** component using **`useMemo`**.

Once you can see those four layers in one file, the rest of the codebase reads
easily.

---

Next: [Architecture overview](./05-architecture-overview.md) — how all the files in
this repo connect.
</content>
