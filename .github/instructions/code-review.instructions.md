---
applyTo: "**"
---

# `neoipc-app` — code review instructions

Read these before generating review comments on this repository. The points below cover (a) review-process discipline that has been a recurring problem in past reviews, and (b) domain / API facts that have caused false-positive findings.

## Review-process discipline

- **One comment per finding.** Do NOT post multiple comments for the same finding — neither at the same `(file, line)` nor at different occurrences of the same pattern. If the same construct appears at multiple lines, raise it ONCE and list the additional lines in that single comment.
- **Continue the conversation on existing threads.** If a finding has already been raised on this PR in an earlier review, do NOT create a new comment for it. Reply on the existing thread instead — even if the line number has shifted or the surrounding diff has changed.
- **Respect resolved threads.** If a previously-raised finding was marked resolved (either because it was fixed in a commit, accepted as a false positive with reasoning, or explicitly deferred to a later PR), do NOT raise the same finding again in subsequent reviews of the same PR. The maintainer's resolution is authoritative.
- **Trust maintainer rebuttals.** When a maintainer replies to a finding with a reasoned rebuttal, accept the rebuttal and do not re-raise the same finding in any later review of the same PR.
- **Before raising a finding, check the file's full context.** Many false positives have come from looking at a single line in isolation when surrounding lines (imports, prior validations, helper definitions) would have shown why the construct is correct.

## Project context

This is a **DHIS2 App Platform** application built with `@dhis2/cli-app-scripts`, written in TypeScript + React. It is the operator-facing frontend that drives the `NeoIPC-Reporting` .NET service. The app runs inside the DHIS2 shell (via `@dhis2/app-shell`) and consumes the DHIS2 user/auth context.

## Library / API conventions

### `@dhis2/d2-i18n` (translation extractor)

- The extractor scans source for **literal `i18n.t('...')` calls only**. Dynamic arguments like `i18n.t(someVar)` are NOT extracted into `i18n/en.pot` — the strings would never reach translators. When user-facing labels live in config objects (resource definitions, enum value maps, etc.), wrap them in thunks (e.g. `label: () => i18n.t('Label text')`) so each `i18n.t` call is a literal at definition site and the lookup happens at render time.
- Module-level `i18n.t('...')` calls are extractable but the lookup may run before the catalog is loaded; thunks are the safer pattern for non-component code.

### `@dhis2/ui` form components

- `CalendarInput` calls its `onDateSelect` callback with `null` for "cleared" or an object `{ calendarDateString: 'YYYY-MM-DD' }` for a selection. The property name is `calendarDateString` (camelCase, calendar first). Do not flag uses of `payload.calendarDateString` as typos.

### Backend wire compatibility

- The vendored backend schemas under `src/schemas/*.json` are the source of truth for the wire shape of `/partner-report` and `/reference-report` query parameters. Any enum value that ends up on the wire MUST match the JSON schema's `values` array verbatim, including casing. The C# backend binds these enum query parameters via ASP.NET Core **minimal-API** parameter binding (`Enum.TryParse`, no `ignoreCase` argument → **case-sensitive**); a casing mismatch fails to bind at request time. The handler params carry `[FromQuery]`, but in a minimal API that attribute only marks the binding *source* — it does not invoke the MVC model binder.
- The schema-drift check script (`scripts/check-schema-drift.mjs`) compares field NAMES but not VALUE casings, so casing mismatches between TS enum constants and the JSON schemas pass the script but fail at runtime. Worth flagging case-mismatches in `src/forms/enums.ts` against the matching schema's `values` block.

### TypeScript / React

- `node_modules` is typically not present in code-review checkouts of this repo. Diagnostics like "Cannot find module '@dhis2/ui'" or implicit `any` inferred from missing type packages are environmental and not real issues — do not flag them.
- Project uses strict TypeScript (`tsconfig.json`'s `"strict": true`).
