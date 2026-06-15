import type { PublicReferenceDataMetadata } from '../AppContext'
import {
    cohortLabel,
    countriesLabel,
    formatBound,
    formatReportingPeriod,
    periodSortKey,
} from './referenceDataFormat'

const makeDataset = (
    over: Partial<PublicReferenceDataMetadata> = {}
): PublicReferenceDataMetadata => ({
    id: 'id',
    displayName: 'Dataset',
    includeTestUnits: false,
    includeNonCorePatients: false,
    createdAt: '2020-01-01T00:00:00Z',
    ...over,
})

describe('formatBound', () => {
    it('formats a closed range', () => {
        expect(formatBound(0, 1500, 'g')).toBe('0–1500 g')
    })
    it('formats an open-upper range', () => {
        expect(formatBound(1500, null, 'g')).toBe('≥ 1500 g')
    })
    it('formats an open-lower range', () => {
        expect(formatBound(null, 32, 'w')).toBe('≤ 32 w')
    })
    it('returns null when both bounds are absent', () => {
        expect(formatBound(null, undefined, 'g')).toBeNull()
    })
})

describe('formatReportingPeriod', () => {
    it('joins both bounds', () => {
        expect(formatReportingPeriod('2024-01-01', '2024-12-31')).toBe(
            '2024-01-01 – 2024-12-31'
        )
    })
    it('labels an unbounded period', () => {
        expect(formatReportingPeriod(undefined, undefined)).toBe('All periods')
    })
})

describe('cohortLabel', () => {
    it('omits unbounded weight/age clauses and always states core + test units', () => {
        const label = cohortLabel(
            makeDataset({
                birthWeightTo: 1500,
                includeNonCorePatients: false,
                includeTestUnits: false,
            })
        )
        expect(label).toContain('BW ≤ 1500 g')
        expect(label).not.toContain('GA')
        expect(label).toContain('core only')
        expect(label).toContain('no test units')
    })
    it('reflects all-patients and test-units flags', () => {
        const label = cohortLabel(
            makeDataset({
                gestationalAgeFrom: 32,
                includeNonCorePatients: true,
                includeTestUnits: true,
            })
        )
        expect(label).toContain('GA ≥ 32 w')
        expect(label).toContain('all patients')
        expect(label).toContain('incl. test units')
    })
})

describe('countriesLabel', () => {
    it('labels an empty list as global', () => {
        expect(countriesLabel([])).toBe('All countries')
        expect(countriesLabel(undefined)).toBe('All countries')
    })
    it('joins country codes', () => {
        expect(countriesLabel(['DE', 'FR'])).toBe('DE, FR')
    })
    it('maps codes to display names, falling back to the code', () => {
        expect(countriesLabel(['DE', 'XX'], { DE: 'Germany' })).toBe(
            'Germany, XX'
        )
    })
})

describe('periodSortKey', () => {
    it('prefers the period end, then start, then createdAt', () => {
        expect(
            periodSortKey(
                makeDataset({
                    reportingPeriodFrom: '2024-01-01',
                    reportingPeriodTo: '2024-12-31',
                })
            )
        ).toBe('2024-12-31')
        expect(
            periodSortKey(makeDataset({ reportingPeriodFrom: '2024-01-01' }))
        ).toBe('2024-01-01')
        expect(periodSortKey(makeDataset())).toBe('2020-01-01T00:00:00Z')
    })
})
