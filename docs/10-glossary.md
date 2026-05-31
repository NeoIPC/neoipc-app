# 10 · Glossary

A plain-language dictionary of the terms, acronyms, and jargon used in this repo
and in these guides. Skim it once; come back when a word trips you up.

## Stack & tooling

- **App Platform / `d2-app-scripts`** — DHIS2's official build tooling for apps. It
  bundles the dev server, bundler, test runner, i18n pipeline, and packaging into
  one CLI so you don't configure them yourself. Docs: <https://platform.dhis2.nu/>.
- **`app-runtime` (`@dhis2/app-runtime`)** — the library for talking to DHIS2 from
  an app: `useConfig`, `useDataQuery`, the provider. Docs:
  <https://runtime.dhis2.nu/>.
- **Bundler** — the tool that combines many source files into a few optimised files
  the browser downloads. This platform uses **Vite** under the hood.
- **CSS Module** — a `*.module.css` file whose class names are scoped to the file
  that imports them, preventing global name clashes.
- **Design token** — a named CSS variable for a color/spacing value (e.g.
  `--colors-grey300`), provided by `@dhis2/ui` so apps share one look.
- **`d2.config.js`** — the app manifest: name, entry point, authorities, etc. Read
  by the App Platform.
- **Jest** — the test runner used by `yarn test`.
- **Node.js** — runs JavaScript outside the browser; all the tooling runs on it.
- **npm / Yarn** — package managers. This repo uses **Yarn Classic (v1)**.
- **Package / dependency** — a reusable library listed in `package.json` and
  downloaded into `node_modules/`.
- **`@dhis2/ui`** — DHIS2's component library (buttons, cards, tables, …). Docs:
  <https://ui.dhis2.nu/>.

## Language (JS/TS)

- **`async` / `await`** — syntax for working with Promises; `await` waits for an
  async result without freezing the app.
- **`as` (type assertion)** — tells TypeScript to treat a value as a given type, with
  *no* runtime check. Used at untyped boundaries (decoding JSON).
- **`as const`** — freezes a value to its narrowest literal type; used to derive
  types from data (`enums.ts`).
- **Callback** — a function passed as an argument, to be called later (e.g. a
  form's `onSubmit`).
- **Destructuring** — pulling fields out of an object/array in one expression:
  `const { baseUrl } = useConfig()`.
- **Discriminated union** — a union of object shapes distinguished by one field
  (`RenderResult` with its `format`).
- **Generic (`<T>`)** — a type/function with a type placeholder, so one definition
  works for many shapes type-safely (`adminList<T>`, `AdminListPage<T>`).
- **Interface / type** — declarations of the shape of data.
- **Module** — a single file; uses `import`/`export` to share with other files.
- **Nullish coalescing (`??`)** — `a ?? b` uses `a` unless it's `null`/`undefined`.
  Unlike `||`, it does *not* fall back on `0` or `''`.
- **Optional chaining (`?.`)** — `a?.b` reads `b` only if `a` exists.
- **Promise** — an object representing a value that will be available later.
- **Spread (`...`)** — copies an object/array's contents; used for immutable
  updates (`{ ...prev, [key]: value }`).
- **Thunk** — a zero-argument function used to defer computing a value (the label
  `() => i18n.t('…')`).
- **Type guard / narrowing** — a runtime check (`x instanceof Y`) that tells
  TypeScript a value's specific type inside a branch.
- **Union type (`A | B`)** — a value that may be one of several types; **string
  literal union** restricts to specific strings (`'html' | 'pdf'`).

## React

- **Component** — a function returning UI (`FC`). The building block of the app.
- **Context** — app-wide data provided high in the tree and read anywhere below,
  avoiding "prop drilling" (`AppContext`, `useAppContext`).
- **Dependency array** — the list passed to `useEffect`/`useMemo`/`useCallback`
  controlling when they re-run.
- **Fragment (`<>…</>`)** — groups elements without adding a wrapper node.
- **Hook** — a `use*` function adding state/lifecycle to a component (`useState`,
  `useEffect`, `useRef`, `useMemo`, `useCallback`, plus the custom ones here).
- **JSX** — the HTML-like syntax for describing UI inside components. Note
  `className` (not `class`) and `{ }` to embed JavaScript.
- **Lazy / `Suspense`** — `React.lazy` splits a component into a separately-loaded
  chunk; `<Suspense>` shows a fallback while it loads.
- **Props** — a component's read-only inputs, passed by its parent.
- **Prop drilling** — threading a prop through many layers; Context avoids it.
- **Render** — React running a component to produce UI; happens again on state
  change.
- **Single-page application (SPA)** — the page never fully reloads; routing swaps
  content in the browser.
- **State** — data a component remembers across renders (`useState`).

## Routing

- **HashRouter** — React Router variant that keeps the route after `#` in the URL;
  used by DHIS2 apps because the server serves a single HTML file.
- **React Router** — the routing library (`useNavigate`, `useLocation`, `Routes`,
  `Route`). Docs: <https://reactrouter.com/>.
- **Route** — a mapping from a URL path to a component to render.

## DHIS2 domain

- **Authority** — a permission string on a DHIS2 user's role. This app's custom
  ones: `NEOIPC_ADMIN`, `NEOIPC_REPORT`. `ALL` = superuser.
- **DHIS2** — the open-source health-information platform this app runs inside.
  Web API docs: <https://developers.dhis2.org/docs/>.
- **i18n** — "internationalization" (i-18 letters-n): making text translatable, via
  `@dhis2/d2-i18n` and `i18n.t(...)`.
- **`/api/me`** — DHIS2 endpoint returning the current user (here: id +
  authorities).
- **NeoIPC** — the neonatal infection-prevention-and-control surveillance project
  this app serves.
- **NeoIPC-Reporting** — the separate .NET backend service that actually generates
  reports and stores admin files, reached under `/neoipc/api`. **Not** the DHIS2
  Web API.
- **Organisation unit (org unit / OU)** — a node in DHIS2's facility hierarchy. This
  app cares about levels Country (2), Hospital (3), Department (4) — see
  `dhis2Constants.ts`. The app uses org-unit **`code`** strings on the wire, not
  UIDs.
- **Reference data / reference dataset** — pre-computed comparison data a report can
  be rendered against (vs. computing it live from filters).
- **UID** — DHIS2's unique identifier for an object (e.g. the core program UID
  `D8mSSpOpsKj`).
- **Validation exceptions** — uploaded files listing records exempt from certain
  validation, referenced by id when generating a report.

## Reporting & this app's own terms

- **Confidence interval mode** — a report parameter (`all` / `rate` / `none`).
- **Drift / schema-drift check** — the guard
  (`scripts/check-schema-drift.mjs` + the `.spec.ts` files + the JSON snapshots)
  that keeps the forms in sync with the backend's accepted parameters. See
  [guide 7](./07-forms-and-the-reporting-backend.md).
- **Fragment mode** — a backend option (`fragmentMode=true`) that returns an HTML
  fragment with no `<html>`/`<head>`/`<body>` wrapper, suitable for injection by
  `InlineHtmlReport`.
- **Online vs dataFile mode** (Partner report) — pull live DHIS2 data vs. upload a
  JSON export.
- **RFC 7807 / `application/problem+json`** — a standard JSON error format
  (`title` + `detail`) the backend returns; `enrichError` reads it for friendlier
  messages.
- **Quarto** — the document/report engine the backend uses; its HTML output is what
  `InlineHtmlReport` renders.
- **Wire format / wire contract** — the exact parameter names and value formats sent
  over HTTP, which must match the backend.

---

Back to the [index](./README.md).
</content>
