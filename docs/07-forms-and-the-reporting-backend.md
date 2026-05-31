# 7 · Forms & the reporting backend

The report forms are where this app spends most of its code, and where the most
subtle maintenance happens. This guide explains how a form's fields become an HTTP
request, and the safety net that keeps the form in sync with the backend.

## 7.1 The shape of a form

Both `PartnerReportForm` and `ReferenceReportForm` follow the same recipe (see
`src/forms/PartnerReportForm.tsx` and `ReferenceReportForm.tsx`):

1. **A `*FormValues` interface** declares exactly what the form collects. Every
   field has a type chosen to match the backend (`string`, `number | null`,
   `boolean | null`, arrays of enum literals, …).
2. **One `useState` object** holds all the values, seeded from `defaultValues`.
3. **A `setField` helper** produces a one-field setter (see
   [guide 6](./06-annotated-codebase-tour.md#the-forms) for the pattern).
4. **`@dhis2/ui` `<Card>`s** group the controls. Reusable controls
   (`DateField`, `NumberRangeField`, `OrganisationUnitMultiSelect`) and the enum
   lists from `enums.ts` keep each form readable.
5. **On submit**, `event.preventDefault()` stops the browser's native form post and
   `onSubmit?.(values)` hands the values to the page.

The forms hold *only* state and presentation. They do not call the network — that's
the page's job via `useReportRender`.

## 7.2 "No mixed mode" — conditional parameters

The backend rejects certain combinations of parameters, and the forms enforce that
up front so the user can't build an invalid request.

- **Partner report** has two data sources: `online` (pull live DHIS2 data) and
  `dataFile` (upload a JSON export). In `dataFile` mode the live-fetch filters
  (org units, period, weight/age, include-test/non-core) are *meaningless* — the
  backend ignores them. So the form only shows the "Scope" card in `online` mode,
  and `buildPartnerReportQuery` (`src/api/reports.ts:139-149`) only appends those
  params in `online` mode.
- **Reference report** can render against a *saved dataset* or compute reference
  data *live* from filters — never both. When a saved dataset is picked
  (`usingSavedDataset`), the form **disables** the live-fetch controls, and
  `buildReferenceReportQuery` (`src/api/reports.ts:93-104`) skips those params.

The doc comments in `reports.ts` cite the exact backend source lines that impose
each rule. When the backend's rules change, those are the references to re-check.

## 7.3 From form values to a request

`src/api/reports.ts` turns `*FormValues` into an HTTP request. Two ideas dominate.

### Dropping empty values

The `appendString/appendNumber/appendBool/appendArray` helpers add a query
parameter **only if** the value was actually provided:

```ts
const appendString = (qs, key, value) => {
    if (value !== '' && value !== null && value !== undefined) qs.append(key, value)
}                                              // src/api/reports.ts:28
```

This matters: an empty box must mean "I didn't specify this" (let the backend use
its default), *not* "set this to empty/zero." Note `appendString` treats `''` as
absent but `appendBool` does **not** drop `false` — `false` is a real choice. This
is exactly the `??`-vs-`||` distinction from
[the JS/TS guide §2.7](./02-javascript-and-typescript.md#27-optional-chaining--and-nullish-coalescing-).

### Choosing method and headers

- HTML vs PDF sets the `Accept` header (`ACCEPT_BY_FORMAT`) and, for HTML, adds
  `fragmentMode=true` so the backend returns a bare fragment (no `<html>` wrapper)
  suitable for `InlineHtmlReport`.
- Partner-report `dataFile` mode switches to `POST` with the file as the raw body;
  everything else is `GET`.

The response is decoded by `readRenderResult`: HTML → `await response.text()`;
PDF → `await response.blob()` plus a filename parsed from `Content-Disposition`.

## 7.4 The wire contract, and why it's fragile

The form's field names, the query-parameter names, and the **backend's accepted
parameters** must all agree. TypeScript checks the first two (they're in this repo)
but it **cannot** see the backend — `response.json() as SomeType` is an unchecked
assertion ([JS/TS guide §2.9](./02-javascript-and-typescript.md#as--type-assertions-use-sparingly)).
If the backend renames a parameter or adds a required one, nothing in the type
system notices; the report just silently breaks at runtime.

That gap is what the schema-drift guard closes.

## 7.5 The schema-drift guard

Three artefacts collaborate:

1. **The vendored schema snapshots** — `src/schemas/partner-report.json` and
   `reference-report.json`. Each lists every parameter the backend accepts, with
   its name, type, and (for enums) allowed values. These are *copies* of what the
   backend emits, checked into this repo.
2. **The form wire-field lists** — `src/forms/PartnerReportForm.spec.ts` and
   `ReferenceReportForm.spec.ts`. Each exports a tuple of the parameter names the
   form actually sends (`partnerReportWireFields`, `referenceReportWireFields`).
3. **The check script** — `scripts/check-schema-drift.mjs`, run automatically
   before every build by the `prebuild` npm script.

### Two layers of checking

**Compile-time (TypeScript), inside the `.spec.ts` files.** A type-level assertion
guarantees the hand-written wire-field tuple covers *exactly* the keys of
`*FormValues`, minus an explicit "non-wire" exclusion list (form-only state like
`outputFormat`, `mode`, `locale`):

```ts
const _wireFieldExhaustiveness: AssertEqual<
    (typeof partnerReportWireFields)[number],
    PartnerReportWireField
> = true                                       // src/forms/PartnerReportForm.spec.ts:56
```

If you add a field to `PartnerReportFormValues` but forget to list it (or exclude
it), this line stops compiling. It is a test written in the type system.

**Build-time (the script).** `check-schema-drift.mjs` compares the *names* in each
schema snapshot against the wire-field tuple and fails the build if either side has
a field the other lacks:

```
ok Partner Report: 19 fields in sync
error: Partner Report: schema has fields the form spec doesn't list: newParam
```

It parses the tuple with a small regex rather than booting a TypeScript compiler —
deliberately dependency-free (see the comment at the top of the script).

### The optional upstream diff

If you set the `NEOIPC_REPORTING_REPO` environment variable to a checkout of the
backend, the script *also* runs the backend's `--emit-schemas` command and diffs
its fresh output against the vendored snapshots — catching the case where the
snapshot itself has gone stale. Without that env var, this step is skipped (the
in-repo check still runs).

### What to do when the check fails

The failure tells you which side is out of date:

- **Backend added/renamed a parameter** → re-vendor the schema snapshot (run the
  backend's `--emit-schemas`), then update `enums.ts`, the `*FormValues` interface,
  the form UI, and the `.spec.ts` wire-field list — all in the same change. The
  doc comment in `enums.ts:1-19` spells out this sequence.
- **You changed the form** → make sure the new field is either listed in the
  wire-field tuple (if it's sent to the backend) or in the non-wire exclusion list
  (if it's form-only).

The whole mechanism exists because the most dangerous bug here is a *silent* one:
the type system can't watch the backend, so this guard watches it instead.

## 7.6 Keeping the enums in sync

`src/forms/enums.ts` vendors the backend's element/section/confidence-interval
enums. The wire identifiers (e.g. `'SecondaryBsiRateTable'`) must match the backend
exactly — they go straight onto the query string. The human-readable labels are a
separate concern, produced by the `*Label` functions for display only. The
schema-drift check covers the enum *values* too (the snapshots include the allowed
`values` arrays), so a renamed enum member trips the same guard.

---

Next: [Styling, i18n & authorities](./08-styling-i18n-and-authorities.md) — three
cross-cutting concerns that touch every file.
</content>
