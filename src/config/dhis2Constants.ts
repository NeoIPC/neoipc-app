// LEARN: This is the ONLY place "magic" deployment values (UIDs, hierarchy levels,
// the reporting service path) are allowed to live. Import from here rather than
// hard-coding them elsewhere. When the DHIS2 deployment topology changes, this is
// the file to revisit. Referenced throughout; see docs/06 ("Config").

/**
 * NeoIPC DHIS2 deployment constants.
 *
 * Pinned identifiers and paths that the app depends on. The values
 * are deployment-specific; verify against
 * `repos/neoipc-dhis2/dhis_metadata/metadata.json` and
 * `repos/neoipc-dhis2/config/default.conf.template` when the
 * deployment topology changes.
 *
 * The orgUnit-level metadata entries in DHIS2 use misleading names
 * (level 3 is labelled "3"/"Station" but is semantically Hospital;
 * level 4 has no name but is semantically Department). The level
 * numbers are the stable contract — see
 * `tasks/neoipc-dhis2-rename-orgunit-levels.md` for the planned
 * metadata polish.
 */

/** UID of the NeoIPC core tracker program. */
export const NEOIPC_CORE_PROGRAM_UID = 'D8mSSpOpsKj'

/** OrgUnit hierarchy level for "Country" (id `iFJGSLdXYIi`). */
export const COUNTRY_LEVEL = 2

/** OrgUnit hierarchy level for "Hospital" (id `wb10bKLJpVj`). */
export const HOSPITAL_LEVEL = 3

/** OrgUnit hierarchy level for "Department" (id `zjgC9x4XmFO`). */
export const DEPARTMENT_LEVEL = 4

/**
 * Base path under which the new NeoIPC-Reporting service is mounted
 * in the DHIS2 deployment (see [`repos/neoipc-dhis2/config/default.conf.template`](../../../neoipc-dhis2/config/default.conf.template)).
 * Distinct from `/reporting/api` (legacy `neoipc-reporting-net`),
 * which keeps serving the legacy reportapp-js until end-of-2026.
 */
export const NEOIPC_REPORTING_BASE = '/neoipc/api'
