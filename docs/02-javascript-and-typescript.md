# 2 · JavaScript & TypeScript

This guide covers the language features you will meet in this codebase. It is not
a complete language course — it is "the parts of JS/TS that `neoipc-app` actually
uses, explained against real code here." For the full reference, follow the
official links; they are the source of truth.

- JavaScript: <https://developer.mozilla.org/en-US/docs/Web/JavaScript>
- TypeScript: <https://www.typescriptlang.org/docs/>

> **About the 📖 links.** Throughout these guides, a 📖 line points to the
> official documentation for the concept just introduced. Follow it when you want
> the complete, authoritative explanation — these guides only cover the slice this
> codebase uses.

## 2.1 JavaScript vs TypeScript — what's the difference?

**JavaScript (JS)** is the programming language browsers run. **TypeScript (TS)**
is JavaScript *plus a type system*. You write `.ts`/`.tsx` files with type
annotations; a compiler checks them and then **erases** the types to produce plain
JavaScript that the browser runs. The types exist only to catch your mistakes at
build time — at runtime there is no TypeScript, only JavaScript.

This repo is TypeScript. Files are `.ts` (plain logic) or `.tsx` (logic that also
contains JSX — see the [React guide](./03-react.md)).

> **The mental model that helps most:** types are a *conversation with your future
> self and your teammates*, enforced by a machine. When `src/AppContext.tsx:7`
> says a `MeData` has `id: string` and `authorities: string[]`, the compiler will
> stop anyone who tries to treat `authorities` as anything other than an array of
> strings.

> 📖 **Reference:** [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) · [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## 2.2 Modules: `import` and `export`

Every file is a **module**. A module makes things available to other files with
`export`, and pulls things in with `import`.

There are two flavours of export, and you'll see both:

```ts
// A *named* export — the file exposes this under a specific name.
export const NEOIPC_CORE_PROGRAM_UID = 'D8mSSpOpsKj'   // src/config/dhis2Constants.ts:19

// A *default* export — the file's single "main" thing.
export default App                                      // src/App.tsx:112
```

And the matching imports:

```ts
import App from './shell/AppShell'                 // default import: pick your own name
import { NEOIPC_REPORTING_BASE } from '../config/dhis2Constants'  // named import: must match
import React, { FC, useState } from 'react'        // default + named, together
```

- A path starting with `.` / `..` is a **relative** import (a file in this repo).
- A bare name like `react` or `@dhis2/ui` is a **package** import (from
  `node_modules/`).

The convention in this repo: one main thing per file is a `default export`
(components, the API helpers), and supporting types/constants are `named exports`.

> 📖 **Reference:** MDN — [JavaScript modules (guide)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) · [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) · [`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)

## 2.3 `const`, `let`, and immutability

```ts
const baseUrl = useConfig()      // cannot be reassigned
let cancelled = false            // can be reassigned later
```

Prefer `const`. Use `let` only when you genuinely reassign the variable — for
example the cleanup flag in `src/App.tsx:48-72`, which flips from `false` to
`true`. Note that `const` prevents *reassignment*, not *mutation*: a `const`
array can still have items pushed into it.

> 📖 **Reference:** MDN — [`const`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const) · [`let`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)

## 2.4 Functions, arrow functions, and "thunks"

You'll see two function syntaxes. They are mostly interchangeable here:

```ts
// classic function declaration
function AdminListPage<T>({ resource }: Props<T>) { ... }   // src/admin/AdminListPage.tsx:49

// arrow function (the dominant style in this repo)
const neoipcReportingUrl = (baseUrl: string, path: string): string =>
    `${baseUrl}...`                                         // src/api/neoipcReporting.ts:11
```

The `=>` is an **arrow function**. `(args) => expression` returns the expression;
`(args) => { ...statements... }` runs a block and returns whatever you `return`.

A **thunk** is just "a function that takes no arguments and returns a value",
used to *delay* computing that value. This codebase uses thunks deliberately for
translatable labels:

```ts
label: () => i18n.t('Partner Report')   // src/menu/categories.tsx:45
```

Why wrap the string in `() =>`? So the translation is looked up *when the menu
renders* (and re-looked-up if the user switches language), not once at module-load
time. See [guide 8](./08-styling-i18n-and-authorities.md) for the full reasoning.

> 📖 **Reference:** MDN — [Functions (guide)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) · [Arrow function expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)

## 2.5 Template literals

Backtick strings let you interpolate with `${...}`:

```ts
`${baseUrl.replace(/\/$/, '')}${NEOIPC_REPORTING_BASE}${path}`   // src/api/neoipcReporting.ts:12
```

That `/\/$/` is a **regular expression** (a pattern). Here it matches a trailing
slash so it can be stripped. Regexes show up in a few places, notably the
`Content-Disposition` header parser in `src/api/reports.ts:163-194`.

> 📖 **Reference:** MDN — [Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) · [Regular expressions (guide)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)

## 2.6 Objects, arrays, and destructuring

**Destructuring** pulls fields out of an object (or items out of an array) in one
step, so you don't have to write `result.baseUrl` by hand every time. It shows up
in two places that *look* different but are the same idea.

**Form 1 — destructure a value you just received.** The first two lines below
unpack the object that a function returned:

```ts
const { baseUrl } = useConfig()                  // src/App.tsx:35  — grab one field
const { loading, error, data } = useDataQuery(…) // src/App.tsx:36  — grab three at once
```

`const { baseUrl } = useConfig()` is exactly shorthand for:

```ts
const result = useConfig()
const baseUrl = result.baseUrl       // take the `baseUrl` field out into its own variable
```

**Form 2 — destructure a function's *parameter*.** You can also unpack the object
a function is *handed as its argument*, right where you name the parameter. This is
the third line, and it's how nearly every component in this app reads its inputs —
so it's worth slowing down on:

```ts
const PartnerReportForm = ({ onSubmit, submitting = false }) => { … }
//                         └──────────┬──────────────────┘
//                         this whole thing is ONE parameter — an object —
//                         being unpacked into two local variables:
//                           • onSubmit
//                           • submitting   (defaulting to false if absent)
```

To see that it's the same idea as Form 1, here is the un-destructured equivalent —
the function receives one object and reaches into it:

```ts
const PartnerReportForm = (props) => {
    const onSubmit = props.onSubmit
    const submitting = props.submitting ?? false   // default when not provided
    …
}
```

The object being unpacked here has a name you'll meet in the next guide: **props**
(a component's inputs). The `submitting = false` part is a **default value** — if
the caller doesn't pass `submitting`, it becomes `false` instead of `undefined`.
You'll see this exact component again in [the React guide](./03-react.md#34-props),
where props are explained properly.

The **spread** operator `...` is destructuring's mirror image: instead of taking
fields *out*, it copies fields *in*. The pattern below — copy the old object, then
override one field — is how React state is updated immutably:

```ts
setValues((prev) => ({ ...prev, [key]: value }))   // src/forms/PartnerReportForm.tsx:109
```

`[key]` is a **computed property name**: the object key comes from the `key`
variable rather than being typed literally. The `...init` in
`src/api/neoipcReporting.ts:42` does the same for fetch options — start from a
default object, then let the caller's `init` override.

> 📖 **Reference:** MDN — [Destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) · [Default parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters) · [Spread syntax (`...`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) · [Computed property names](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#computed_property_names)

## 2.7 Optional chaining `?.` and nullish coalescing `??`

Two tiny operators you'll see constantly:

```ts
files?.[0]                       // if files is null/undefined, the whole thing is undefined
error?.message ?? i18n.t('Unknown error')   // use error.message, but fall back if it's null/undefined
visibleCategories[0]?.id ?? ''   // src/shell/ContentArea.tsx:17
```

- `a?.b` — read `b` *only if* `a` exists; otherwise short-circuit to `undefined`
  instead of throwing.
- `a ?? b` — use `a`, but if `a` is `null` or `undefined`, use `b` instead.

`??` differs from the older `||` in that `??` only falls back on `null`/`undefined`,
**not** on `0` or `''`. That distinction matters in this codebase — see the
careful empty-checks in `src/api/reports.ts:28-65`, which must treat `0` and `''`
differently from "not provided."

> 📖 **Reference:** MDN — [Optional chaining (`?.`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) · [Nullish coalescing (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing) · [Logical OR (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR)

## 2.8 Asynchronous code: Promises, `async`/`await`

Talking to a server takes time. JavaScript handles waiting with **Promises** — an
object representing a value that will exist *later*. The modern way to work with a
Promise is `async`/`await`:

```ts
export const loadReferenceDataSets = async (baseUrl: string) => {
    const response = await fetchNeoipcReporting(baseUrl, '/reference-data')
    return (await response.json()) as PublicReferenceDataMetadata[]
}                                                       // src/api/referenceData.ts:9-14
```

- Marking a function `async` means it returns a Promise.
- `await` pauses the function until the awaited Promise resolves, then gives you
  the value. The rest of the app keeps running in the meantime — `await` does not
  freeze the browser.

The older `.then()` / `.catch()` syntax does the same thing and appears where the
code is *not* inside an `async` function — for example in the `useEffect` in
`src/App.tsx:49-69`:

```ts
loadReferenceDataSets(baseUrl)
    .then((sets) => { … })       // runs when the Promise succeeds
    .catch((err) => { … })       // runs if it fails
```

Errors in async code are caught with `try`/`catch`, exactly like synchronous
errors — see `src/render/useReportRender.ts:80-107`.

> 📖 **Reference:** MDN — [Using promises (guide)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) · [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) · [`async function`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) · [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) · [`try...catch`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)

## 2.9 The type system in practice

### Basic annotations

```ts
const path: string = '/reference-data'
sizeBytes: number
includeTestUnits: boolean
authorities: string[]            // an array of strings
```

> 📖 **Reference:** TypeScript — [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)

### `interface` and `type` — describing object shapes

An `interface` names the shape of an object. The app uses them heavily to describe
the data coming back from servers:

```ts
export interface MeData {
    id: string
    authorities: string[]
}                                // src/AppContext.tsx:7
```

A `?` makes a field **optional** (it may be missing):

```ts
reportingPeriodFrom?: string     // src/AppContext.tsx:21 — may or may not be present
```

`type` does a similar job and can also express **unions** ("one of these"):

```ts
export type OutputFormat = 'html' | 'pdf'                  // src/api/reports.ts:11
export type AppAuthority = 'NEOIPC_ADMIN' | 'NEOIPC_REPORT'  // src/authority/Authority.ts:11
```

Those are **string literal types**: the only legal values are exactly `'html'` or
`'pdf'`. Try to assign `'xml'` and the compiler stops you. This is how the app
makes illegal states unrepresentable.

A union can also combine whole object shapes — a **discriminated union**, where one
field tells you which variant you have:

```ts
export type RenderResult =
    | { format: 'html'; fragmentHtml: string }
    | { format: 'pdf'; blob: Blob; suggestedFileName: string }   // src/api/reports.ts:19
```

After you check `if (result.format === 'pdf')`, TypeScript *knows* the object has
`blob` and `suggestedFileName` — see how `src/render/useReportRender.ts:83-98`
relies on this.

> 📖 **Reference:** TypeScript — [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) · [Union types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) · [Literal types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types) · [Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

### `as const` — freeze a value into its narrowest type

```ts
export const ConfidenceIntervalModeValues = ['all', 'rate', 'none'] as const  // src/forms/enums.ts:77
export type ConfidenceIntervalMode = (typeof ConfidenceIntervalModeValues)[number]
```

`as const` tells TypeScript "this array will never change, and its values are
*exactly* these three strings." The second line then derives a type from the
array: `ConfidenceIntervalMode` is `'all' | 'rate' | 'none'`, computed from the
data instead of duplicated by hand. Change the array, the type updates itself.
(The `typeof X[number]` move is "the type of any element of array `X`".)

> 📖 **Reference:** TypeScript — [`const` assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions) · [`typeof` type operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) · [Indexed access types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)

### Generics — types with a placeholder

A **generic** is a type or function with a "fill-in-the-blank" type parameter,
written `<T>`. It lets one piece of code work for many shapes while staying
type-safe. The admin layer is the showcase:

```ts
export const adminList = async <T extends AdminResourceMetadata>(
    baseUrl: string,
    segment: string
): Promise<T[]> => { … }                       // src/api/admin.ts:34
```

Read `<T extends AdminResourceMetadata>` as: "`T` is some type that *at least* has
all the fields of `AdminResourceMetadata`, but may have more." So `adminList`
returns a correctly-typed array whether the caller asks for reference-data rows or
validation-exception rows. The same `T` threads through `AdminListPage`
(`src/admin/AdminListPage.tsx:49`) and `AdminResourceType`
(`src/admin/AdminResourceType.ts:18`). This is *the* reason there is one generic
admin page instead of two near-identical ones.

> 📖 **Reference:** TypeScript — [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) · [`keyof` type operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) (used in the form `setField` helper)

### `unknown`, type guards, and narrowing

When you genuinely don't know a value's type (a caught error, a parsed JSON blob),
you start from `unknown` and **narrow** it with runtime checks:

```ts
const enrichError = async (err: unknown): Promise<Error> => {
    if (!(err instanceof NeoipcReportingError)) {
        return err instanceof Error ? err : new Error(String(err))
    }
    …                                          // src/render/useReportRender.ts:132
```

`err instanceof NeoipcReportingError` is a **type guard**: inside the branch where
it's true, TypeScript treats `err` as that specific class and lets you read
`err.response`.

> 📖 **Reference:** TypeScript — [Narrowing & type guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) · [`instanceof` narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#instanceof-narrowing)

### `as` — type assertions (use sparingly)

`value as SomeType` tells the compiler "trust me, this is that type." It does *no*
runtime checking — it just silences the type checker. The app uses it only at the
edges where data crosses an untyped boundary, e.g. decoding a server response:

```ts
return (await response.json()) as PublicReferenceDataMetadata[]   // src/api/referenceData.ts:13
```

`response.json()` returns `any`; the `as` records *our* expectation of its shape.
If the backend changes that shape, the `as` will happily lie — which is exactly
why the schema-drift guard in [guide 7](./07-forms-and-the-reporting-backend.md)
exists to catch drift the type system can't see.

> 📖 **Reference:** TypeScript — [Type assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)

## 2.10 The compiler config

[`tsconfig.json`](../tsconfig.json) configures all of the above. The notable
settings:

- `"noEmit": true` — TypeScript only *checks*; the App Platform's bundler does the
  actual JS output.
- `"jsx": "react"` — understand JSX syntax (see the [React guide](./03-react.md)).
- `"allowJs": true` — plain `.js`/`.mjs` files (like the drift-check script) are
  allowed alongside the TS.

> 📖 **Reference:** TypeScript — [What is a `tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) · [`tsconfig` option reference](https://www.typescriptlang.org/tsconfig/)

---

Next: [React](./03-react.md) — the library that turns this code into a user
interface.
</content>
