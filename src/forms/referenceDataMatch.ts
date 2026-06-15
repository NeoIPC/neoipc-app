import type { PublicReferenceDataMetadata } from '../AppContext'
import { periodSortKey } from './referenceDataFormat'

/**
 * The partner-side settings the benchmark Auto-match compares against
 * the saved reference datasets. Birth-weight / gestational-age bounds
 * and the non-core flag define the comparable *cohort*; `countryCodes`
 * are the ancestor-country codes of the selected departments (empty =
 * no country constraint).
 */
export interface BenchmarkCriteria {
    birthWeightFrom: number | null
    birthWeightTo: number | null
    gestationalAgeFrom: number | null
    gestationalAgeTo: number | null
    includeNonCorePatients: boolean
    countryCodes: string[]
}

/**
 * Result of {@link matchReferenceData}. `exact` is `true` when the chosen
 * dataset matches the cohort exactly *and* its country scope covers the
 * partner's countries; `false` when it's the nearest fallback (shown to
 * the user as an approximate match they can override).
 */
export interface BenchmarkMatch {
    dataset: PublicReferenceDataMetadata
    exact: boolean
}

const boundEq = (
    a: number | null | undefined,
    b: number | null | undefined
): boolean => (a ?? null) === (b ?? null)

const cohortExact = (
    dataset: PublicReferenceDataMetadata,
    criteria: BenchmarkCriteria
): boolean =>
    boundEq(dataset.birthWeightFrom, criteria.birthWeightFrom) &&
    boundEq(dataset.birthWeightTo, criteria.birthWeightTo) &&
    boundEq(dataset.gestationalAgeFrom, criteria.gestationalAgeFrom) &&
    boundEq(dataset.gestationalAgeTo, criteria.gestationalAgeTo) &&
    dataset.includeNonCorePatients === criteria.includeNonCorePatients

/**
 * Whether the dataset's country scope covers all of the partner's
 * countries. An empty dataset country list is a *global* benchmark and
 * covers everyone; an empty criteria list imposes no constraint.
 */
const countryCovers = (
    dataset: PublicReferenceDataMetadata,
    criteria: BenchmarkCriteria
): boolean => {
    const datasetCountries = dataset.countries ?? []
    if (datasetCountries.length === 0) return true
    return criteria.countryCodes.every((code) =>
        datasetCountries.includes(code)
    )
}

const cohortMismatches = (
    dataset: PublicReferenceDataMetadata,
    criteria: BenchmarkCriteria
): number => {
    let count = 0
    if (!boundEq(dataset.birthWeightFrom, criteria.birthWeightFrom)) count++
    if (!boundEq(dataset.birthWeightTo, criteria.birthWeightTo)) count++
    if (!boundEq(dataset.gestationalAgeFrom, criteria.gestationalAgeFrom))
        count++
    if (!boundEq(dataset.gestationalAgeTo, criteria.gestationalAgeTo)) count++
    if (dataset.includeNonCorePatients !== criteria.includeNonCorePatients)
        count++
    return count
}

const countryPenalty = (
    dataset: PublicReferenceDataMetadata,
    criteria: BenchmarkCriteria
): number => {
    if (countryCovers(dataset, criteria)) return 0
    const datasetCountries = dataset.countries ?? []
    const overlaps = criteria.countryCodes.some((code) =>
        datasetCountries.includes(code)
    )
    return overlaps ? 1 : 2
}

/** Coarse closeness score (lower is closer); only used for the fallback. */
const distance = (
    dataset: PublicReferenceDataMetadata,
    criteria: BenchmarkCriteria
): number => cohortMismatches(dataset, criteria) + countryPenalty(dataset, criteria)

/**
 * Pick the reference dataset that best benchmarks a partner with the
 * given {@link BenchmarkCriteria}, for the Partner Report's automatic
 * benchmark selection.
 *
 * Strategy:
 *  1. Prefer datasets whose cohort matches **exactly** and whose country
 *     scope **covers** the partner's countries; among those, the one
 *     with the most recent reporting period wins (`exact: true`).
 *  2. If none qualify, fall back to the **nearest** dataset by a coarse
 *     score (count of differing cohort dimensions, plus a country
 *     penalty), tie-broken by most recent period (`exact: false`).
 *
 * Returns `null` only when there are no datasets at all. This is a
 * best-effort heuristic — finer numeric proximity isn't attempted; the
 * UI surfaces the match (and whether it's approximate) and offers a
 * manual override.
 */
export const matchReferenceData = (
    datasets: PublicReferenceDataMetadata[],
    criteria: BenchmarkCriteria
): BenchmarkMatch | null => {
    if (datasets.length === 0) return null

    const exactMatches = datasets.filter(
        (dataset) =>
            cohortExact(dataset, criteria) && countryCovers(dataset, criteria)
    )
    const isExact = exactMatches.length > 0
    const pool = isExact ? exactMatches : datasets

    let best: PublicReferenceDataMetadata | null = null
    let bestScore = Number.POSITIVE_INFINITY
    let bestPeriod = ''
    for (const dataset of pool) {
        const score = isExact ? 0 : distance(dataset, criteria)
        const period = periodSortKey(dataset)
        if (score < bestScore || (score === bestScore && period > bestPeriod)) {
            best = dataset
            bestScore = score
            bestPeriod = period
        }
    }

    return best ? { dataset: best, exact: isExact } : null
}
