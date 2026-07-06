import i18n from '@dhis2/d2-i18n'
import type { PublicReferenceDataMetadata } from '../AppContext'

const has = (value: number | null | undefined): value is number =>
    value !== null && value !== undefined

/**
 * Format an open/closed numeric range with locale-neutral symbols:
 * `0–1500 g`, `≥ 1500 g`, `≤ 32 w`. Returns `null` when both bounds are
 * absent (the caller decides how to render "no bound").
 */
export const formatBound = (
    from: number | null | undefined,
    to: number | null | undefined,
    unit: string
): string | null => {
    if (!has(from) && !has(to)) return null
    if (has(from) && has(to)) return `${from}–${to} ${unit}`
    if (has(from)) return `≥ ${from} ${unit}`
    return `≤ ${to} ${unit}`
}

/**
 * Human label for a reference dataset's reporting period. The bounds are
 * ISO date strings (`YYYY-MM-DD`); shown verbatim since ISO is
 * unambiguous and already sorts chronologically.
 */
export const formatReportingPeriod = (
    from?: string,
    to?: string
): string => {
    if (from && to) return `${from} – ${to}`
    if (from) return i18n.t('from {{from}}', { from })
    if (to) return i18n.t('until {{to}}', { to })
    return i18n.t('All periods')
}

/**
 * Patient-scope part of the cohort — core-vs-all-patients and test-units —
 * always shown because it distinguishes otherwise-identical cohorts. Split out
 * so the reference-data card can put birth-weight / gestational-age on their
 * own rows (including "Any") and this on a dedicated cohort row, without
 * duplicating the bounds.
 */
export const patientCohortLabel = (
    dataset: PublicReferenceDataMetadata
): string =>
    [
        dataset.includeNonCorePatients
            ? i18n.t('all patients')
            : i18n.t('core only'),
        dataset.includeTestUnits
            ? i18n.t('incl. test units')
            : i18n.t('no test units'),
    ].join(' · ')

/**
 * One-line composite cohort label, e.g.
 * `BW 0–1500 g · GA <32 w · core only · no test units`. Birth-weight /
 * gestational-age clauses are omitted when unbounded (the reference-data card
 * shows those as dedicated "Any" rows instead); the patient-scope clauses are
 * always shown because they distinguish otherwise-identical cohorts.
 */
export const cohortLabel = (dataset: PublicReferenceDataMetadata): string => {
    const parts: string[] = []
    const bw = formatBound(
        dataset.birthWeightFrom,
        dataset.birthWeightTo,
        i18n.t('g')
    )
    if (bw) parts.push(i18n.t('BW {{range}}', { range: bw }))
    const ga = formatBound(
        dataset.gestationalAgeFrom,
        dataset.gestationalAgeTo,
        i18n.t('w')
    )
    if (ga) parts.push(i18n.t('GA {{range}}', { range: ga }))
    parts.push(patientCohortLabel(dataset))
    return parts.join(' · ')
}

/**
 * Human label for a dataset's country scope. An empty / absent country
 * list means the dataset spans every country (a global benchmark).
 * `names` maps country codes to display names (from `useOrgUnitNames`);
 * any code without a name falls back to the raw code.
 */
export const countriesLabel = (
    countries?: string[],
    names?: Record<string, string>
): string =>
    !countries || countries.length === 0
        ? i18n.t('All countries')
        : countries.map((code) => names?.[code] ?? code).join(', ')

/**
 * Comparable key for sorting datasets by recency of reporting period
 * (ISO strings sort chronologically). Falls back to the period start,
 * then the creation timestamp, so every dataset has a key. Sort
 * **descending** for latest-period-first.
 */
export const periodSortKey = (dataset: PublicReferenceDataMetadata): string =>
    dataset.reportingPeriodTo ??
    dataset.reportingPeriodFrom ??
    dataset.createdAt
