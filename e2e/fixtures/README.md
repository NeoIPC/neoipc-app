# e2e fixtures

Input files uploaded by the e2e suite.

| File | Used by | State |
|------|---------|-------|
| `validation-exceptions.csv` | `admin-crud.spec.ts` (singleton upload/remove) | **Real.** Content is not parsed on upload, so a trivial CSV suffices. |
| `reference-data.json` | global setup (reference upload), `reference-report.spec.ts`, `admin-crud.spec.ts` (reference-data list) | **Real.** A synthetic multi-department network benchmark captured from a seeded stack. |
| `partner-data.json` | `partner-report-data-file.spec.ts` | **Real.** A synthetic department dataset captured from a seeded stack. |

## The two report datasets

`reference-data.json` and `partner-data.json` are the JSON payloads neoipcr
produces — a reference (benchmark) dataset and a partner (department) dataset.
The reference-data upload **derives its metadata from the content** (reporting
period, countries), and the reports **render** from these payloads, so a stub
cannot stand in: the render would fail. They are therefore **captured from a
seeded stack** — only synthetic play-package data, never real patient content.

The suite keeps a graceful-degrade fallback: if either file is reset to the
`__placeholder__` sentinel, the dependent specs **skip** instead of failing
opaquely —

- global setup **skips** the reference-data upload (records no fixture);
- `reference-report.spec.ts` and the reference-data test in `admin-crud.spec.ts`
  **skip** with a pointer here;
- `partner-report-data-file.spec.ts` **skips**.

The other specs (nav-authority, org-unit-picker, partner-report-online,
locale-switch, and the validation-exceptions half of admin-crud) run regardless.

## How to re-capture

Against a seeded stack, over an admin DHIS2 session (the neoipcr JSON output is
locale-independent, so any served `Accept-Language` works):

1. **`reference-data.json`** — the neoipcr-serialised reference (benchmark)
   dataset: `GET /neoipc/api/reference-report` with `Accept: application/json`
   (ad-hoc admin mode). The default excludes test units, so it aggregates the
   seeded **non-test** departments into the network benchmark; seed enough of
   them (≥ 5) that the cross-department quartiles are not degenerate.
2. **`partner-data.json`** — the neoipcr-serialised department dataset the
   Partner Report's data-file mode accepts:
   `GET /neoipc/api/partner-report?unitCodes=<code>&includeTestData=true` with
   `Accept: application/json` (the synthetic departments are test units, hence
   `includeTestData=true`).

Drop each captured file in place (removing the `__placeholder__` key). The
dependent specs then run automatically.

**Do not** commit real patient-derived content here — capture only synthetic
(play-package) data.
