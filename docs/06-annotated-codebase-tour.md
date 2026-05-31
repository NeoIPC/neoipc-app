# 6 · Annotated codebase tour

This is the guided walk through every source file, in roughly the order the app
executes. Open each file alongside this guide. The goal is that after this tour,
no file in `src/` is a mystery.

Concepts referenced here (hooks, generics, `useDataQuery`, etc.) are explained in
guides [2](./02-javascript-and-typescript.md), [3](./03-react.md), and
[4](./04-dhis2-app-platform.md) — follow the links if a term is new.

---

## The entry point

### `src/App.tsx` — the root component

This is the top of the component tree (declared as the entry point in
`d2.config.js`). Its whole job is **startup gating**: fetch the two things the rest
of the app assumes are present, show a spinner/error until they arrive, then mount
everything else.

- **Lines 27–40** — `meQuery` describes `GET /api/me?fields=id,authorities` and
  `useDataQuery` runs it. `meData.me` will be the current user.
- **Lines 42–73** — a second fetch, the reference-data listing, run in a
  `useEffect`. It uses our own `fetch` wrapper (not `useDataQuery`) because it hits
  the NeoIPC-Reporting service, not DHIS2. Note:
  - the `cancelled` flag + cleanup function (the standard React effect-cleanup
    pattern, [guide 3 §3.5](./03-react.md#useeffect--running-code-after-render--talking-to-the-outside-world));
  - the **401/403 special case** (lines 60–67): "no NeoIPC access" is turned into
    an empty list rather than an error, so `AppShell` can show a friendly notice.
- **Lines 75–76** — derive a single `loading` and `error` from the two independent
  fetches.
- **Lines 78–109** — the render. `CssReset`/`CssVariables` install DHIS2's styles
  and design tokens; `HeaderBar` is the DHIS2 top bar. Then a three-way switch:
  spinner while loading → error notice → otherwise mount the providers and
  `AppShell`. The conditional uses the ternary operator `cond ? a : b` nested twice
  — read it as a small if/else-if/else.

> **Beginner note on the providers nesting** (lines 97–106): `AppContextProvider`
> makes `{ me, referenceDataSets }` available to every descendant;
> `HashRouter` enables URL routing below it. Order matters — context and router
> must wrap the components that use them.

### `src/AppContext.tsx` — app-wide data

Defines the shapes of the startup data (`MeData`, `PublicReferenceDataMetadata`,
`AppContextValue`) and the React Context that carries them.

- `React.createContext<AppContextValue | null>(null)` — the context starts `null`
  (no provider yet).
- `useAppContext()` (lines 48–56) is the custom hook descendants call. It throws a
  clear error if the provider isn't above it — a deliberate guardrail so misuse
  fails loudly. Because `App` only mounts the provider *after* the fetches resolve,
  any component that calls this hook is guaranteed real data.

The doc comments here also record an important fact: these interfaces mirror the
backend's JSON shapes (camelCased). That's a *contract*, not a coincidence — see
[guide 7](./07-forms-and-the-reporting-backend.md).

---

## The shell

### `src/shell/AppShell.tsx` — the frame

Asks `useAuthorities()` for a `has(...)` predicate and `visibleCategories(has)` for
the menu entries this user may see. If the list is empty, it renders the "No NeoIPC
access" notice. Otherwise it lays out a two-pane grid: `<LeftNav>` + `<ContentArea>`,
both fed the same `categories` list. The CSS classes (`styles.shell`, etc.) come
from the CSS Module described below.

### `src/shell/ContentArea.tsx` — routing outlet

Renders the matched page. Key ideas:

- `<Suspense fallback={spinner}>` wraps the routes so a lazy page chunk can load
  without crashing ([guide 3 §3.7](./03-react.md#37-lazy-loading-and-suspense--splitting-the-bundle)).
- It maps `visibleCategories` to one `<Route>` each (`path={id}`,
  `element={<Page/>}`). Pages the user can't access were already filtered out, so
  they aren't even declared.
- The trailing `<Route path="*" …>` is a catch-all that `<Navigate>`s any unknown
  URL to the first visible category.

### `src/shell/LeftNav.tsx` — the navigation menu

Renders a `@dhis2/ui` `<Menu>` of `<MenuItem>`s, one per category. Clicking calls
`navigate('/' + id)` (React Router's `useNavigate`) rather than using an `href`;
the doc comment explains this is intentional so `HashRouter` handles the change.
The active item is computed by comparing the category id to the current
`useLocation()` path.

### `src/shell/Shell.module.css` — the layout styles

A **CSS Module** (note the `.module.css` name): the class names you write get
*scoped* to this file so they can't clash with styles elsewhere. It defines the
two-column grid and uses DHIS2 design tokens like `var(--colors-grey300)` and
`var(--spacers-dp16)`. How CSS Modules and tokens work is covered in
[guide 8](./08-styling-i18n-and-authorities.md).

---

## The menu (single source of truth)

### `src/menu/categories.tsx`

The most architecturally important small file. It defines:

- **`MenuCategory`** (interface) — the metadata for one menu entry/route: its
  hash-route `id`, a `label` thunk, an `icon`, the `requiredAuthority`, and a lazy
  `Page` component.
- **`categoryOrder`** — the ordered list of route ids, declared `as const` so the
  `CategoryId` type is derived from it.
- **`categories`** — the actual map from id to `MenuCategory`. Each `Page` is a
  `React.lazy(() => import(...))` so its code is a separate bundle.
- **`visibleCategories(has)`** — filters the ordered list down to the entries whose
  `requiredAuthority` the user holds (or which require none).

To add a page: add an entry here and create its page component. `LeftNav`,
`ContentArea`, and the routing all update automatically. To change who sees a page:
change its `requiredAuthority`. Nothing else needs touching.

---

## Authority (access control)

### `src/authority/Authority.ts`

A single line of real code: `export type AppAuthority = 'NEOIPC_ADMIN' |
'NEOIPC_REPORT'`. These two strings are the custom authorities declared in
`d2.config.js`. The big doc comment records that the DHIS2 superuser authority
`'ALL'` implicitly grants both — enforced in the next file.

### `src/authority/useAuthorities.ts`

The `useAuthorities()` hook reads the current user's authorities from context and
returns `{ has }`, a predicate that's `true` if the user holds the requested
authority *or* the `'ALL'` superuser authority. Everything access-related in the UI
funnels through this one predicate. See [guide 8](./08-styling-i18n-and-authorities.md).

---

## Config

### `src/config/dhis2Constants.ts`

Pinned, deployment-specific identifiers the app depends on:

- `NEOIPC_CORE_PROGRAM_UID` — the UID of the NeoIPC tracker program, used to filter
  org-unit queries.
- `COUNTRY_LEVEL` / `HOSPITAL_LEVEL` / `DEPARTMENT_LEVEL` — the org-unit hierarchy
  level numbers. **Read the doc comment**: the DHIS2 metadata *names* for these
  levels are misleading; the level *numbers* are the stable contract.
- `NEOIPC_REPORTING_BASE` — `'/neoipc/api'`, the path the NeoIPC-Reporting service
  is mounted at. Distinct from the legacy `/reporting/api`.

When the DHIS2 deployment changes, this is the file to revisit. It is intentionally
the *only* place these magic values live.

---

## The pages

The four files under `src/pages/` are deliberately tiny — they wire a page
together and delegate all real work to forms/admin/render pieces.

### `src/pages/reports/PartnerReportPage.tsx` & `ReferenceReportPage.tsx`

Each: instantiate `useReportRender(render<X>Report)`, render the corresponding
form (passing `render.submit` and `render.loading`), and render
`<ReportResultPanel>` fed from the hook's state. That's the whole page — the
machinery lives in the hook and the form.

### `src/pages/admin/ReferenceDataPage.tsx` & `ValidationExceptionsPage.tsx`

Each is a one-liner: `<AdminListPage resource={theConfig} />`. All admin behaviour
is in the generic `AdminListPage`.

---

## The forms

These are the largest files because they declare a lot of fields. Don't be
intimidated — they're repetitive, not complex. [Guide 7](./07-forms-and-the-reporting-backend.md)
is the deep dive; here's the structure.

### `src/forms/PartnerReportForm.tsx` & `ReferenceReportForm.tsx`

Each form:

1. Declares a `*FormValues` interface — the exact shape it collects. This interface
   mirrors the backend's accepted parameters (drift-checked; see guide 7).
2. Holds **all** field values in one `useState` object (`values`), updated through
   a small `setField(key)` helper that returns a setter for that one field.
3. Renders a series of `@dhis2/ui` `<Card>`s grouping related fields, using the
   reusable field components and the enum lists from `enums.ts`.
4. On submit, prevents the browser's default form submission and calls
   `onSubmit?.(values)` — handing the collected values up to the page.

A pattern worth internalising — the per-field setter:

```ts
const setField = (key) => (value) => setValues((prev) => ({ ...prev, [key]: value }))
```

`setField('locale')` returns a function that, when called with a value, updates
*only* `values.locale`. This is why each control reads
`onChange={... setField('xyz')(newValue)}`.

**Conditional fields:** the Partner form shows the file picker only in `dataFile`
mode and the "Scope" card only in `online` mode (`{values.mode === 'online' && …}`).
The Reference form **disables** (rather than hides) the live-fetch filters when a
saved dataset is chosen (`usingSavedDataset`), mirroring the backend's "no mixed
mode" rule.

### `src/forms/enums.ts` — vendored backend enums + labels

Holds the lists of report "elements" and "section texts" and the
confidence-interval modes — **copies** of the backend's C# enums, kept in sync by
the drift check. Also the `*Label` functions that turn a wire identifier
(`'SecondaryBsiRateTable'`) into a localised, human label (`'Secondary BSI rate
table'`). The labels use `switch` statements with literal `i18n.t('...')` calls so
the translation extractor can find every string — explained in
[guide 8](./08-styling-i18n-and-authorities.md).

### The reusable field components — `src/forms/fields/`

- **`DateField.tsx`** — wraps `@dhis2/ui`'s `CalendarInput` and normalises its
  output to a plain `YYYY-MM-DD` string (or `''`), matching the backend's
  `DateOnly` wire format.
- **`NumberRangeField.tsx`** — a from/to integer pair (birth weight, gestational
  age). Emits `null` for an empty box, matching the backend's nullable numbers.
  Note `parseValue` rejecting non-finite input.
- **`OrganisationUnitMultiSelect.tsx`** — the most substantial field. It
  `useDataQuery`s org units at a given hierarchy `level`, filtered to the NeoIPC
  program and the user's own units, then offers them in a `MultiSelectField`.
  Important behaviours: it emits org-unit **`code`** strings (the wire format), not
  UIDs; and it filters out units that have *no* code, showing a warning so
  operators know to ask metadata maintainers to fix the upstream data. `useMemo`
  keeps the query object stable so it doesn't re-fetch on every render.

---

## The render layer

### `src/render/useReportRender.ts` — the report lifecycle hook

The shared brain of both report pages. It exposes `{ loading, elapsedSeconds,
result, error, submit, reset }`. On `submit(values)` it:

1. starts a 1-second `setInterval` that ticks `elapsedSeconds` (renders can take
   5–10 minutes; a static spinner would look frozen),
2. calls the injected `render(baseUrl, values)` function,
3. routes the result: **PDF** → trigger a download and clear state; **HTML** →
   store as `result`; **error** → run `enrichError` and store as `error`.

`enrichError` (lines 132–161) reads the failed `Response`'s body — the backend
returns RFC 7807 `application/problem+json` with `title`/`detail` — to build a
human-readable message instead of a bare status code. Note the careful timer
teardown via `useRef` + `useCallback` + the unmount `useEffect`.

### `src/render/ReportResultPanel.tsx`

A presentational switch: if `loading`, show the spinner + elapsed counter; if
`error`, show a `NoticeBox`; if there's `fragmentHtml`, mount `InlineHtmlReport`;
otherwise render nothing (the PDF case). No logic beyond that.

### `src/render/InlineHtmlReport.tsx` — the deliberate exception

This is the one component that **bypasses React** and manipulates the DOM directly,
and the doc comment explains exactly why. The backend returns an HTML *fragment*
(Quarto output) whose tags/attributes aren't React-compatible (`class` vs
`className`, custom widget elements), so React would refuse to mount it. So the
component:

1. sets `container.innerHTML = fragmentHtml` (via a `useRef` to the real `<div>`),
2. then **re-creates every `<script>`** element, because browsers don't execute
   scripts inserted through `innerHTML` — interactive widgets (plotly, leaflet, DT)
   need their bootstraps to run. External scripts get a load "gate" so later inline
   scripts see their globals.

The cleanup function empties the container when the fragment changes or the
component unmounts. If a future report's widgets misbehave, the doc comment names
the fix (Shadow DOM) and points at this file as the boundary. This is a great
example of a comment that earns its place by recording *why* the unusual approach
is necessary.

> 📖 **Reference:** MDN — [`Element.innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) · [the `<script>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) · [Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM). The report HTML itself is produced by [Quarto](https://quarto.org/).

### `src/render/report-theme.css`

Plain (non-module) CSS, imported once in `App.tsx`. It styles the injected report
under the fixed container id `#neoipc-rendered-report`, and — importantly — handles
**print isolation** (`@media print`) so printing the page yields just the report.
The container id is a contract with the backend; see the comment and guide 8.

---

## The admin layer

### `src/admin/AdminListPage.tsx` — one generic page for all admin resources

A generic component `AdminListPage<T>` (where `T` is the resource's metadata shape).
It manages: loading the list on mount, an upload form (file + display name), and
per-row delete and download. State is local `useState`; errors surface inline via
`NoticeBox` and are non-blocking. After an upload it **prepends** the returned row
locally instead of re-fetching (instant feedback); after a delete it removes the
row locally. `enrichError` here mirrors the one in `useReportRender`.

### `src/admin/AdminResourceType.ts` — the config that drives it

The `AdminResourceType<T>` interface describes one resource family: its URL
`segment`, user-facing label thunks, the file `accept` types, the
`uploadContentType`, optional `displayNameHelp`, and any `extraColumns`. Because
all of this is data, adding a new admin resource family means writing one config —
no new page component. The labels are thunks (`() => string`) for the same i18n
reason as the menu.

### `src/admin/referenceDataResource.ts` & `validationExceptionsResource.ts`

The two concrete configs. Reference-data declares extra columns (reporting period,
countries) and forces `Content-Type: application/json` on upload (the backend
requires it). Validation-exceptions accepts any type and passes `null` so the
browser's detected MIME is used. Both define the backend wire shape they expect as
an interface extending `AdminResourceMetadata`.

---

## The API layer (all network access)

### `src/api/neoipcReporting.ts` — the foundation

- `neoipcReportingUrl(baseUrl, path)` — builds an absolute URL under
  `/neoipc/api`, trimming a trailing slash off the base.
- `NeoipcReportingError` — a custom `Error` subclass carrying the raw `Response`
  so callers can read the body for richer error messages.
- `fetchNeoipcReporting(baseUrl, path, init)` — the wrapper every other reporting
  call uses. It always sends `credentials: 'include'` (the DHIS2 session cookie),
  throws `NeoipcReportingError` on non-2xx, and otherwise returns the raw
  `Response` so the caller decides how to decode it.

### `src/api/referenceData.ts`

One function, `loadReferenceDataSets`, calling `GET /reference-data` and decoding
the JSON listing. Used by `App.tsx` at startup.

### `src/api/reports.ts` — the report request builders

The richest API file. It defines:

- `OutputFormat` and the `RenderResult` discriminated union.
- `buildReferenceReportQuery` / `buildPartnerReportQuery` — turn form values into
  `URLSearchParams`, **dropping empty/null values** (so the backend sees them as
  "unspecified") via the `appendString/Number/Bool/Array` helpers. Each honours the
  backend's "no mixed mode" rules (saved dataset *vs* live filters; online *vs*
  dataFile) by skipping the irrelevant params.
- `parseAttachmentFileName` — an RFC 6266/5987 `Content-Disposition` parser for
  naming the downloaded PDF.
- `renderReferenceReport` / `renderPartnerReport` — the actual calls. Partner-report
  branches between `GET` (online) and `POST` with the file body (dataFile mode).
- `downloadBlob` — triggers a browser download via a temporary hidden `<a download>`.

The doc comments cite specific backend source lines for each rule — that's the
contract this file implements.

> 📖 **Reference:** MDN — [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch) · [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) · [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) · [`Content-Disposition` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition). The error body format is [RFC 7807 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807).

### `src/api/admin.ts`

The generic admin operations used by `AdminListPage`: `adminList<T>` (GET list),
`adminUpload<T>` (POST a file), `adminDelete` (DELETE, treating 404 as success for
idempotency), and `adminDownloadUrl` (build a link). All generic over the
resource's metadata type `T`.

---

## Schemas & contract files

### `src/schemas/partner-report.json` & `reference-report.json`

Vendored JSON snapshots of the backend's accepted parameters (each field's name,
type, allowed values). These are *not* used at runtime — they exist so the
schema-drift check can compare them against the form's declared wire fields. See
[guide 7](./07-forms-and-the-reporting-backend.md).

### `src/forms/*.spec.ts`

Despite the `.spec` name these are **contract declarations**, not classic tests.
Each lists the wire-parameter names the form sends and uses a clever compile-time
type check (`AssertEqual`) to guarantee the list stays exhaustive against the
form's `*FormValues` type. The drift-check script reads these lists. Guide 7
explains the whole mechanism.

---

## Types & the test

### `types/global.d.ts` & `types/modules.d.ts`

Ambient type declarations. `modules.d.ts` teaches TypeScript that importing a
`*.module.css` file yields an object of class-name strings. `global.d.ts` augments
React's types for a niche styled-jsx attribute. You'll rarely touch these.

### `src/App.test.tsx`

A smoke test: it renders `<App>` with a `CustomDataProvider` supplying fake `me`
data and a stubbed `fetch`, and asserts it mounts without crashing. It's the one
place the app runs with no real server, and a good template for future component
tests. See [guide 9](./09-build-test-deploy.md) for running tests.

---

You've now seen every file. The next two guides go deeper on the two areas most
likely to need maintenance: the [forms and their backend contract](./07-forms-and-the-reporting-backend.md),
and [styling, i18n, and authorities](./08-styling-i18n-and-authorities.md).
</content>
