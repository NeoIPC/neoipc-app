# e2e fixtures

Input files uploaded by the e2e suite.

| File | Used by | State |
|------|---------|-------|
| `validation-exceptions.csv` | `admin-crud.spec.ts` (singleton upload/remove) | **Real.** Content is not parsed on upload, so a trivial CSV suffices. |
| `reference-data.json` | global setup (reference upload), `reference-report.spec.ts`, `admin-crud.spec.ts` (reference-data list) | **Placeholder.** Needs a real capture. |
| `partner-data.json` | `partner-report-data-file.spec.ts` | **Placeholder.** Needs a real capture. |

## Why the two datasets are placeholders

`reference-data.json` and `partner-data.json` are the JSON payloads neoipcr
produces — a reference (benchmark) dataset and a partner (department) dataset.
The reference-data upload **derives its metadata from the content** (reporting
period, countries), and the reports **render** from these payloads, so a stub
cannot stand in: the render would fail. They are therefore captured from a
seeded stack rather than committed blind.

While a file still contains the `__placeholder__` sentinel, the suite degrades
gracefully instead of failing opaquely:

- global setup **skips** the reference-data upload (records no fixture);
- `reference-report.spec.ts` and the reference-data test in `admin-crud.spec.ts`
  **skip** with a pointer here;
- `partner-report-data-file.spec.ts` **skips**.

The other specs (nav-authority, org-unit-picker, partner-report-online,
locale-switch, and the validation-exceptions half of admin-crud) run regardless.

## How to capture the real fixtures

Against a seeded stack (see the workspace testing guide / `Invoke-PlaywrightTests.ps1`):

1. **`partner-data.json`** — the payload the Partner Report's data-file mode
   accepts: a neoipcr-serialised department dataset. Obtain one by exporting a
   department's data through neoipcr's JSON serialisation, or by capturing the
   request body a real "Upload partner data file" submission sends.
2. **`reference-data.json`** — the payload the admin Reference-data upload
   accepts: a neoipcr-serialised reference (benchmark) dataset. Obtain one by
   capturing the body of a real admin upload, or from neoipcr's reference-data
   serialisation for a cohort.

Drop each real file in place of the placeholder (removing the `__placeholder__`
key). The dependent specs then run automatically.

**Do not** commit real patient-derived content here — capture only synthetic
(play-package) data, consistent with the workspace data guardrails.
