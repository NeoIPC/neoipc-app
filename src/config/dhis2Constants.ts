/**
 * NeoIPC DHIS2 deployment constants.
 *
 * Pinned identifiers and paths that the app depends on. The values
 * are deployment-specific; verify against
 * `repos/neoipc-dhis2/dhis_metadata/metadata.json` and
 * `repos/neoipc-dhis2/config/default.conf.template` when the
 * deployment topology changes.
 *
 * The three NeoIPC org-unit roles (Country / Hospital / Department) are
 * identified by **org-unit group code**, not by hierarchy *level*. The
 * level numbers are not a stable contract — the DHIS2
 * `organisationUnitLevels` are partly unnamed/auto-named (level 5 is
 * literally named "5", level 1 is "Reference Centre"), and a department
 * need not sit at a fixed depth (test or hospital-less deployments can
 * place one higher up). neoipcr — the normative data layer — selects
 * departments by `organisationUnitGroups.code:eq:NEO_DEPARTMENT` with no
 * level filter, and the analogous `COUNTRY` / `HOSPITAL` groups identify
 * the other two roles. The pickers and Auto-match mirror that.
 */

/** Org-unit group code for "Country" (id `V9axyIuqqs6`). */
export const COUNTRY_GROUP_CODE = 'COUNTRY'

/** Org-unit group code for "Hospital" (id `OuU4pHxMRe1`). */
export const HOSPITAL_GROUP_CODE = 'HOSPITAL'

/** Org-unit group code for "Department" (id `aYhPCaHuOnT`, "Neonatology Department"). */
export const DEPARTMENT_GROUP_CODE = 'NEO_DEPARTMENT'

/**
 * Code of the org-unit group (UID `H1frxxJMCb4`, "NeoIPC All patients
 * eligible") whose member departments have the birth-weight /
 * gestational-age eligibility criteria disabled — i.e. they
 * intentionally enrol *all* neonates, not just the core
 * very-low-birth-weight / very-preterm cohort. Non-core patients are
 * therefore a meaningful, intentional population only in these
 * departments, so the Partner Report's "include non-core patients"
 * toggle is offered only when at least one selected department belongs
 * to this group (the same `d2:inOrgUnitGroup('NEOIPC_ALL_PATIENTS_ELIGIBLE')`
 * predicate the DHIS2 program rules use).
 */
export const ELIGIBLE_PATIENTS_GROUP_CODE = 'NEOIPC_ALL_PATIENTS_ELIGIBLE'

/**
 * Code of the org-unit group whose members are the synthetic test
 * hierarchy (e.g. `AT_TEST`, `AT_TEST_TEST`). neoipcr drops these units
 * from the metadata *before* it applies any department filter unless
 * `include_test_data` is set (`dhis2-metadata.R`), so a department that
 * is a `TEST_UNITS` member selected while test data is excluded resolves
 * to an empty org-unit set and the render fails with an opaque DHIS2
 * error. The department picker therefore offers `TEST_UNITS` departments
 * only when "Include test data" is on, keying on direct `TEST_UNITS`
 * group membership to match neoipcr's metadata filtering.
 */
export const TEST_UNITS_GROUP_CODE = 'TEST_UNITS'

/**
 * Base path under which the new NeoIPC-Reporting service is mounted
 * in the DHIS2 deployment (see [`repos/neoipc-dhis2/config/default.conf.template`](../../../neoipc-dhis2/config/default.conf.template)).
 * Distinct from `/reporting/api` (legacy `neoipc-reporting-net`),
 * which keeps serving the legacy reportapp-js until end-of-2026.
 */
export const NEOIPC_REPORTING_BASE = '/neoipc/api'
