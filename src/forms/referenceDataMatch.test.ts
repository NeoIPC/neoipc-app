import type { PublicReferenceDataMetadata } from '../AppContext'
import {
    BenchmarkCriteria,
    matchReferenceData,
} from './referenceDataMatch'

const makeDataset = (
    over: Partial<PublicReferenceDataMetadata> = {}
): PublicReferenceDataMetadata => ({
    id: 'id',
    displayName: 'Dataset',
    reportingPeriodFrom: undefined,
    reportingPeriodTo: undefined,
    birthWeightFrom: undefined,
    birthWeightTo: undefined,
    gestationalAgeFrom: undefined,
    gestationalAgeTo: undefined,
    countries: undefined,
    includeTestUnits: false,
    includeNonCorePatients: false,
    createdAt: '2020-01-01T00:00:00Z',
    ...over,
})

const makeCriteria = (
    over: Partial<BenchmarkCriteria> = {}
): BenchmarkCriteria => ({
    birthWeightFrom: null,
    birthWeightTo: null,
    gestationalAgeFrom: null,
    gestationalAgeTo: null,
    includeNonCorePatients: false,
    countryCodes: [],
    ...over,
})

describe('matchReferenceData', () => {
    it('returns null when there are no datasets', () => {
        expect(matchReferenceData([], makeCriteria())).toBeNull()
    })

    it('prefers an exact cohort + covering-country match', () => {
        const a = makeDataset({ id: 'a', birthWeightTo: 1500, countries: ['DE'] })
        const result = matchReferenceData(
            [a],
            makeCriteria({ birthWeightTo: 1500, countryCodes: ['DE'] })
        )
        expect(result).toEqual({ dataset: a, exact: true })
    })

    it('among exact matches picks the most recent reporting period', () => {
        const older = makeDataset({
            id: 'older',
            birthWeightTo: 1500,
            countries: ['DE'],
            reportingPeriodTo: '2023-12-31',
        })
        const newer = makeDataset({
            id: 'newer',
            birthWeightTo: 1500,
            countries: ['DE'],
            reportingPeriodTo: '2024-12-31',
        })
        const result = matchReferenceData(
            [older, newer],
            makeCriteria({ birthWeightTo: 1500, countryCodes: ['DE'] })
        )
        expect(result?.dataset.id).toBe('newer')
        expect(result?.exact).toBe(true)
    })

    it('treats a global (no-countries) dataset as covering any country', () => {
        const global = makeDataset({ id: 'g', birthWeightTo: 1500 })
        const result = matchReferenceData(
            [global],
            makeCriteria({ birthWeightTo: 1500, countryCodes: ['DE'] })
        )
        expect(result).toEqual({ dataset: global, exact: true })
    })

    it('imposes no country constraint when criteria has no countries', () => {
        const a = makeDataset({ id: 'a', birthWeightTo: 1500, countries: ['DE'] })
        const result = matchReferenceData(
            [a],
            makeCriteria({ birthWeightTo: 1500, countryCodes: [] })
        )
        expect(result).toEqual({ dataset: a, exact: true })
    })

    it('falls back to the nearest dataset (approximate) when none match exactly', () => {
        const off = makeDataset({ id: 'off', birthWeightTo: 2000 })
        const result = matchReferenceData(
            [off],
            makeCriteria({ birthWeightTo: 1500 })
        )
        expect(result).toEqual({ dataset: off, exact: false })
    })

    it('a covering-country near-cohort beats an exact-cohort wrong-country', () => {
        const exactWrongCountry = makeDataset({
            id: 'ewc',
            birthWeightTo: 1500,
            countries: ['FR'],
        })
        const nearRightCountry = makeDataset({
            id: 'nrc',
            birthWeightTo: 2000,
            countries: ['DE'],
        })
        const result = matchReferenceData(
            [exactWrongCountry, nearRightCountry],
            makeCriteria({ birthWeightTo: 1500, countryCodes: ['DE'] })
        )
        expect(result?.dataset.id).toBe('nrc')
        expect(result?.exact).toBe(false)
    })

    it('a non-core mismatch alone prevents an exact match', () => {
        const allPatients = makeDataset({
            id: 'all',
            includeNonCorePatients: true,
        })
        const result = matchReferenceData(
            [allPatients],
            makeCriteria({ includeNonCorePatients: false })
        )
        expect(result).toEqual({ dataset: allPatients, exact: false })
    })

    it('prefers a test-unit-free dataset over one including test units', () => {
        const withTestUnits = makeDataset({
            id: 'with',
            birthWeightTo: 1500,
            includeTestUnits: true,
            reportingPeriodTo: '2024-12-31',
        })
        const clean = makeDataset({
            id: 'clean',
            birthWeightTo: 1500,
            includeTestUnits: false,
            reportingPeriodTo: '2023-12-31',
        })
        // The clean dataset wins despite being older — test-unit exclusion
        // is preferred ahead of period recency.
        const result = matchReferenceData(
            [withTestUnits, clean],
            makeCriteria({ birthWeightTo: 1500 })
        )
        expect(result?.dataset.id).toBe('clean')
        expect(result?.exact).toBe(true)
    })

    it('falls back to most recent period once test-unit status is equal', () => {
        const older = makeDataset({
            id: 'older',
            birthWeightTo: 1500,
            includeTestUnits: false,
            reportingPeriodTo: '2023-12-31',
        })
        const newer = makeDataset({
            id: 'newer',
            birthWeightTo: 1500,
            includeTestUnits: false,
            reportingPeriodTo: '2024-12-31',
        })
        const result = matchReferenceData(
            [older, newer],
            makeCriteria({ birthWeightTo: 1500 })
        )
        expect(result?.dataset.id).toBe('newer')
    })

    it('breaks fallback ties by most recent period', () => {
        const older = makeDataset({
            id: 'older',
            birthWeightTo: 2000,
            reportingPeriodTo: '2022-12-31',
        })
        const newer = makeDataset({
            id: 'newer',
            birthWeightTo: 2000,
            reportingPeriodTo: '2024-12-31',
        })
        const result = matchReferenceData(
            [older, newer],
            makeCriteria({ birthWeightTo: 1500 })
        )
        expect(result?.dataset.id).toBe('newer')
        expect(result?.exact).toBe(false)
    })
})
