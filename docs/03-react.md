# 3 · React

React is the library that turns the data in this app into a user interface and
keeps the screen in sync as that data changes. This guide explains the React
concepts used in `neoipc-app`. The official docs are excellent and beginner-friendly
— when in doubt, read them: <https://react.dev/>.

## 3.1 The core idea

You describe **what the UI should look like for a given state**, and React figures
out the DOM changes to make it so. You almost never touch the DOM directly. When
the state changes, React re-runs your description and efficiently updates only what
differs. (The one deliberate exception in this app — directly poking the DOM — is
`InlineHtmlReport`, explained in [guide 6](./06-annotated-codebase-tour.md), and it
exists precisely *because* the content is opaque HTML React can't manage.)

## 3.2 Components

A **component** is a function that returns UI. By convention its name is
`PascalCase`. Every screen, every form field in this app is a component:

```tsx
const PartnerReportPage: FC = () => {
    …
    return (
        <>
            <h1>{i18n.t('Partner Report')}</h1>
            <PartnerReportForm onSubmit={render.submit} submitting={render.loading} />
            …
        </>
    )
}                                                // src/pages/reports/PartnerReportPage.tsx:10
```

`FC` (imported from React) is short for **F**unction **C**omponent — it is the
TypeScript type that says "this function is a React component." You'll see it on
nearly every component here: `const AppShell: FC = () => …`.

Components compose: `PartnerReportPage` renders `PartnerReportForm`, which renders
`DateField`, `NumberRangeField`, etc. The whole app is a tree of components rooted
at `App` (`src/App.tsx`).

## 3.3 JSX

The HTML-looking syntax inside the `return` is **JSX**. It is not HTML and not a
string — it's JavaScript expression syntax for describing UI, which the build step
compiles into function calls. A few rules that trip up newcomers:

- **You embed JavaScript with `{ }`.** `<h1>{i18n.t('Partner Report')}</h1>` runs
  `i18n.t(...)` and puts the result in the heading.
- **Attributes are camelCase**, and some are renamed: HTML's `class` becomes
  `className`, `for` becomes `htmlFor`. (This renaming is exactly why
  `InlineHtmlReport` *can't* hand raw report HTML to React — see guide 6.)
- **A component must return one root element.** When you have several siblings and
  don't want an extra wrapper `<div>`, use an empty **Fragment** `<>…</>`, as in
  `PartnerReportPage` above.
- **Lists need a `key`.** When you render an array of elements, each needs a stable
  `key` prop so React can track them:

  ```tsx
  {visibleCategories.map(({ id, Page }) => (
      <Route key={id} path={id} element={<Page />} />
  ))}                                          // src/shell/ContentArea.tsx:28
  ```

## 3.4 Props

**Props** are the inputs to a component — the attributes you pass when you use it.
They flow *down* from parent to child and are read-only inside the child. The
child declares the shape it expects with a TypeScript interface:

```tsx
interface LeftNavProps {
    categories: MenuCategory[]
}

const LeftNav: FC<LeftNavProps> = ({ categories }) => { … }   // src/shell/LeftNav.tsx:6
```

Here the parent (`AppShell`) passes `<LeftNav categories={categories} />` and
`LeftNav` receives that array as a prop. Note the destructuring `({ categories })`
— that's just pulling the `categories` field out of the props object (see
[JS/TS guide §2.6](./02-javascript-and-typescript.md#26-objects-arrays-and-destructuring)).

A common prop type is a **callback** — the parent passes a function the child calls
when something happens:

```tsx
onSubmit?: (values: PartnerReportFormValues) => void   // src/forms/PartnerReportForm.tsx:96
```

The form doesn't know *what* happens on submit; it just calls `onSubmit(values)`
and lets the parent page decide. This keeps the form reusable and the page in
control.

## 3.5 Hooks

**Hooks** are special functions whose names start with `use`. They let a function
component "hook into" React features like state and lifecycle. Two rules:

1. Only call hooks at the **top level** of a component (never inside an `if` or a
   loop).
2. Only call them from components or from other hooks.

### `useState` — remembering values across renders

```tsx
const [file, setFile] = useState<File | null>(null)   // src/admin/AdminListPage.tsx:57
```

`useState(initial)` returns a pair: the current value and a setter. Calling the
setter (`setFile(...)`) tells React "this value changed, re-render with the new
one." The form components keep *all* their fields in one state object:

```tsx
const [values, setValues] = useState<PartnerReportFormValues>(defaultValues)  // PartnerReportForm.tsx:105
```

…and update it immutably with the spread pattern from the JS guide:

```tsx
setValues((prev) => ({ ...prev, [key]: value }))
```

The `prev =>` form (passing a function to the setter) is the safe way to compute
new state from the old state.

### `useEffect` — running code after render / talking to the outside world

`useEffect` runs a side-effect *after* the component renders. You give it a
function and a **dependency array**; React re-runs the effect whenever a dependency
changes. This is how the app loads data when a screen appears:

```tsx
useEffect(() => {
    let cancelled = false
    loadReferenceDataSets(baseUrl)
        .then((sets) => { if (!cancelled) setReferenceDataSets(sets) })
        .catch(…)
    return () => { cancelled = true }   // ← cleanup function
}, [baseUrl])                            // ← dependency array
```
(`src/App.tsx:47-73`)

Three things to understand here, because this pattern recurs:

- **The dependency array `[baseUrl]`** means "re-run this effect if `baseUrl`
  changes." An empty `[]` would mean "run once when the component first appears."
- **The returned function is cleanup.** React calls it before re-running the
  effect and when the component disappears. Here it sets `cancelled = true`.
- **Why the `cancelled` flag?** If the component is removed while the fetch is
  still in flight, we must *not* call `setReferenceDataSets` on a gone component.
  The flag lets the late-arriving `.then()` notice "I was cancelled" and do
  nothing. This guards against a class of bugs and warnings that bite every React
  beginner.

`useReportRender` (`src/render/useReportRender.ts`) uses an effect for a different
job — tearing down its elapsed-time timer when the page unmounts
(`useEffect(() => stopTimer, [stopTimer])` at line 55).

### `useCallback` and `useMemo` — stable references

React re-creates everything inside a component on each render, including functions
and objects. Sometimes you need the *same* function/object identity to persist
across renders — typically because it's a dependency of another hook. That's what
these two do:

- `useCallback(fn, deps)` returns the *same* function instance until `deps` change.
  See `submit`, `reset`, and `stopTimer` in `src/render/useReportRender.ts`.
- `useMemo(() => value, deps)` returns the *same* computed value until `deps`
  change. `OrganisationUnitMultiSelect` uses it to build the DHIS2 query object
  only when `level` changes (`src/forms/fields/OrganisationUnitMultiSelect.tsx:67`)
  — otherwise a fresh object every render would make `useDataQuery` think the query
  changed and re-fetch endlessly.

> **When do I need these?** As a beginner: don't reach for them by default. Add
> them when a value is a *dependency* of `useEffect`/`useDataQuery`/another
> callback and you need it to stay stable, which is exactly the cases above.

### `useRef` — a value that survives renders but doesn't trigger them

`useRef` gives you a mutable box (`.current`) that persists across renders *without*
causing a re-render when you change it. Two uses in this app:

- Holding a timer id so it can be cleared later
  (`intervalRef` in `src/render/useReportRender.ts:46`).
- Getting a handle to a real DOM node
  (`containerRef` in `src/render/InlineHtmlReport.tsx:40`, used to inject HTML).

### Custom hooks — bundling logic for reuse

You can write your own hook by composing the built-in ones. This app has three:

- `useAppContext()` (`src/AppContext.tsx:48`) — read the app-wide data.
- `useAuthorities()` (`src/authority/useAuthorities.ts:12`) — ask "does the user
  have authority X?".
- `useReportRender()` (`src/render/useReportRender.ts:36`) — the entire
  submit → loading → result/error lifecycle for a report, shared by both report
  pages.

The payoff: `PartnerReportPage` and `ReferenceReportPage` are nearly identical and
tiny, because all the messy async/loading/error logic lives once in
`useReportRender`.

## 3.6 Context — app-wide data without "prop drilling"

Passing a prop down through ten layers of components just so the bottom one can use
it ("prop drilling") is painful. **Context** lets a value be provided high up and
read anywhere below, without threading it through every layer.

This app fetches the current user and the reference datasets *once* at startup,
then provides them via context:

```tsx
<AppContextProvider value={{ me: meData.me, referenceDataSets }}>
    <HashRouter><AppShell /></HashRouter>
</AppContextProvider>                          // src/App.tsx:97
```

Any component below can then read them:

```tsx
const { referenceDataSets } = useAppContext()  // src/forms/ReferenceReportForm.tsx:104
```

The `useAppContext` hook even throws a clear error if used outside the provider
(`src/AppContext.tsx:48-56`) — a guardrail so a misplaced component fails loudly
instead of silently getting `null`.

## 3.7 Lazy loading and `Suspense` — splitting the bundle

By default all your code ships to the browser in one big file. `React.lazy` lets
you split a component into its own file that downloads only when first needed:

```tsx
Page: React.lazy(() => import('../pages/reports/PartnerReportPage'))   // src/menu/categories.tsx:48
```

A lazy component must be rendered inside a `<Suspense fallback={…}>` boundary,
which shows the fallback (here a spinner) while the chunk downloads:

```tsx
<Suspense fallback={<Center><CircularLoader /></Center>}>
    <Routes>…</Routes>
</Suspense>                                    // src/shell/ContentArea.tsx:20
```

The result: opening the app downloads only the shell; each report/admin page's
code arrives the first time you navigate to it.

## 3.8 Routing (React Router)

The app has multiple "pages" but is a **single-page application** — the browser
never does a full page reload; the URL changes and React swaps the content. That
swap is handled by **React Router** (<https://reactrouter.com/>).

This app uses **`HashRouter`** (`src/App.tsx:103`), which keeps the route after a
`#` in the URL (e.g. `.../index.html#/reports/partner`). DHIS2 apps use the hash
router because the server only serves one HTML file — everything after the `#` is
invisible to the server and handled entirely in the browser.

The routes are declared in `ContentArea` (`src/shell/ContentArea.tsx:27`), one
`<Route>` per visible menu category, plus a catch-all that redirects unknown paths
to the first page. Navigation happens in `LeftNav` via the `useNavigate` hook
(`src/shell/LeftNav.tsx:32`), and the current location (to highlight the active menu
item) comes from `useLocation`.

> See [guide 5](./05-architecture-overview.md) for how routing, the menu, and
> authority-based filtering fit together.

---

Next: [The DHIS2 App Platform](./04-dhis2-app-platform.md) — the framework that
hosts this React app inside DHIS2.
</content>
