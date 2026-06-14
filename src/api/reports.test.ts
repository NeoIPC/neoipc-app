import type { PartnerReportFormValues } from '../forms/PartnerReportForm'
import type { ReferenceReportFormValues } from '../forms/ReferenceReportForm'
import {
    buildPartnerReportQuery,
    buildReferenceReportQuery,
    renderPartnerReport,
    renderReferenceReport,
} from './reports'

const partnerValues = (
    overrides: Partial<PartnerReportFormValues> = {}
): PartnerReportFormValues => ({
    mode: 'online',
    dataFile: null,
    referenceDataFile: '',
    profile: '',
    validationExceptionFile: '',
    enabledElements: [],
    disabledElements: [],
    unitCodes: [],
    reportingPeriodFrom: '',
    reportingPeriodTo: '',
    birthWeightFrom: null,
    birthWeightTo: null,
    gestationalAgeFrom: null,
    gestationalAgeTo: null,
    includeNonCorePatients: false,
    includeTestData: false,
    sparseDataThreshold: null,
    confidenceIntervals: '',
    includeIntroductionTexts: true,
    includeMethodsTexts: true,
    includeOutlierInterpretation: true,
    locale: '',
    outputFormat: 'html',
    ...overrides,
})

const referenceValues = (
    overrides: Partial<ReferenceReportFormValues> = {}
): ReferenceReportFormValues => ({
    referenceDataId: '',
    profile: '',
    validationExceptionFile: '',
    enabledElements: [],
    disabledElements: [],
    enabledSectionTexts: [],
    disabledSectionTexts: [],
    reportingPeriodFrom: '',
    reportingPeriodTo: '',
    birthWeightFrom: null,
    birthWeightTo: null,
    gestationalAgeFrom: null,
    gestationalAgeTo: null,
    countryFilter: [],
    hospitalFilter: [],
    testUnitFilter: null,
    defaultPatientFilter: null,
    sparseDataThreshold: null,
    confidenceIntervals: '',
    includeIntroductionTexts: true,
    includeMethodsTexts: true,
    locale: '',
    outputFormat: 'html',
    ...overrides,
})

describe('buildPartnerReportQuery', () => {
    it('online mode: includes live-fetch filters and drops empty/null values', () => {
        const qs = buildPartnerReportQuery(
            partnerValues({
                mode: 'online',
                unitCodes: ['DEP_A', 'DEP_B'],
                reportingPeriodFrom: '2025-01-01',
                reportingPeriodTo: '2025-12-31',
                birthWeightFrom: 500,
                includeTestData: true,
            }),
            'pdf'
        )

        expect(qs.getAll('unitCodes')).toEqual(['DEP_A', 'DEP_B'])
        expect(qs.get('reportingPeriodFrom')).toBe('2025-01-01')
        expect(qs.get('reportingPeriodTo')).toBe('2025-12-31')
        expect(qs.get('birthWeightFrom')).toBe('500')
        // birthWeightTo stayed null → dropped, not sent as an empty sentinel
        expect(qs.has('birthWeightTo')).toBe(false)
        // empty strings dropped
        expect(qs.has('referenceDataFile')).toBe(false)
        expect(qs.has('profile')).toBe(false)
        // booleans are always emitted, including `false`
        expect(qs.get('includeTestData')).toBe('true')
        expect(qs.get('includeNonCorePatients')).toBe('false')
        expect(qs.get('includeIntroductionTexts')).toBe('true')
    })

    it('dataFile mode: omits the live-fetch filters even when populated', () => {
        const qs = buildPartnerReportQuery(
            partnerValues({
                mode: 'dataFile',
                referenceDataFile: 'ref-123',
                unitCodes: ['DEP_A'],
                reportingPeriodFrom: '2025-01-01',
                birthWeightFrom: 500,
                includeTestData: true,
            }),
            'html'
        )

        // base params still present
        expect(qs.get('referenceDataFile')).toBe('ref-123')
        // the backend ignores these in dataFile mode → never sent
        expect(qs.has('unitCodes')).toBe(false)
        expect(qs.has('reportingPeriodFrom')).toBe(false)
        expect(qs.has('birthWeightFrom')).toBe(false)
        expect(qs.has('includeTestData')).toBe(false)
        expect(qs.has('includeNonCorePatients')).toBe(false)
    })

    it('appends one query entry per array element', () => {
        const qs = buildPartnerReportQuery(
            partnerValues({
                enabledElements: ['BirthWeightFigure', 'IncidenceDensityTable'],
                disabledElements: ['SecondaryBsiRateTable'],
            }),
            'pdf'
        )

        expect(qs.getAll('enabledElements')).toEqual([
            'BirthWeightFigure',
            'IncidenceDensityTable',
        ])
        expect(qs.getAll('disabledElements')).toEqual(['SecondaryBsiRateTable'])
    })

    it('drops confidenceIntervals when unset, includes it when chosen', () => {
        expect(
            buildPartnerReportQuery(partnerValues(), 'pdf').has(
                'confidenceIntervals'
            )
        ).toBe(false)
        expect(
            buildPartnerReportQuery(
                partnerValues({ confidenceIntervals: 'rate' }),
                'pdf'
            ).get('confidenceIntervals')
        ).toBe('rate')
    })

    it('emits a numeric zero rather than dropping it as falsy', () => {
        const qs = buildPartnerReportQuery(
            partnerValues({ sparseDataThreshold: 0 }),
            'pdf'
        )
        expect(qs.get('sparseDataThreshold')).toBe('0')
    })

    it('appends fragmentMode only for the html format', () => {
        expect(
            buildPartnerReportQuery(partnerValues(), 'html').get('fragmentMode')
        ).toBe('true')
        expect(
            buildPartnerReportQuery(partnerValues(), 'pdf').has('fragmentMode')
        ).toBe(false)
    })
})

describe('buildReferenceReportQuery', () => {
    it('live mode (no referenceDataId): includes the live-fetch filters', () => {
        const qs = buildReferenceReportQuery(
            referenceValues({
                reportingPeriodFrom: '2025-01-01',
                birthWeightFrom: 500,
                countryFilter: ['DE', 'FR'],
                testUnitFilter: false,
            }),
            'pdf'
        )

        expect(qs.get('reportingPeriodFrom')).toBe('2025-01-01')
        expect(qs.get('birthWeightFrom')).toBe('500')
        expect(qs.getAll('countryFilter')).toEqual(['DE', 'FR'])
        expect(qs.get('testUnitFilter')).toBe('false')
        // defaultPatientFilter stayed null → dropped (backend default)
        expect(qs.has('defaultPatientFilter')).toBe(false)
    })

    it('saved-dataset mode (referenceDataId set): skips live-fetch filters but keeps element toggles', () => {
        const qs = buildReferenceReportQuery(
            referenceValues({
                referenceDataId: 'DS123',
                reportingPeriodFrom: '2025-01-01',
                birthWeightFrom: 500,
                countryFilter: ['DE'],
                hospitalFilter: ['H1'],
                testUnitFilter: true,
                defaultPatientFilter: true,
                enabledElements: ['IncidenceDensityTable'],
            }),
            'pdf'
        )

        expect(qs.get('referenceDataId')).toBe('DS123')
        // no mixed mode: live-fetch filters are suppressed
        expect(qs.has('reportingPeriodFrom')).toBe(false)
        expect(qs.has('birthWeightFrom')).toBe(false)
        expect(qs.has('countryFilter')).toBe(false)
        expect(qs.has('hospitalFilter')).toBe(false)
        expect(qs.has('testUnitFilter')).toBe(false)
        expect(qs.has('defaultPatientFilter')).toBe(false)
        // element toggles are not live-fetch filters → still sent
        expect(qs.getAll('enabledElements')).toEqual(['IncidenceDensityTable'])
    })

    it('appends section-text arrays and fragmentMode for html', () => {
        const qs = buildReferenceReportQuery(
            referenceValues({
                enabledSectionTexts: ['PatientPopulation', 'Surgery'],
                disabledSectionTexts: ['Nosocomial'],
            }),
            'html'
        )

        expect(qs.getAll('enabledSectionTexts')).toEqual([
            'PatientPopulation',
            'Surgery',
        ])
        expect(qs.getAll('disabledSectionTexts')).toEqual(['Nosocomial'])
        expect(qs.get('fragmentMode')).toBe('true')
    })
})

describe('renderPartnerReport', () => {
    const realFetch = global.fetch
    afterEach(() => {
        global.fetch = realFetch
        jest.restoreAllMocks()
    })

    it('rejects in dataFile mode when no file was selected, without calling fetch', async () => {
        const fetchMock = jest.fn()
        global.fetch = fetchMock as unknown as typeof fetch

        await expect(
            renderPartnerReport(
                'https://dhis.example',
                partnerValues({ mode: 'dataFile', dataFile: null })
            )
        ).rejects.toThrow(/data file/i)
        expect(fetchMock).not.toHaveBeenCalled()
    })
})

describe('renderReferenceReport', () => {
    const realFetch = global.fetch
    afterEach(() => {
        global.fetch = realFetch
        jest.restoreAllMocks()
    })

    it('GETs the fragment endpoint and returns the decoded html on the html path', async () => {
        const htmlResponse = {
            ok: true,
            status: 200,
            text: async () => '<h1>Report</h1>',
        } as unknown as Response
        const fetchMock = jest.fn().mockResolvedValue(htmlResponse)
        global.fetch = fetchMock as unknown as typeof fetch

        const result = await renderReferenceReport(
            'https://dhis.example',
            referenceValues({ outputFormat: 'html' })
        )

        expect(result).toEqual({ format: 'html', fragmentHtml: '<h1>Report</h1>' })
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toContain('https://dhis.example/neoipc/api/reference-report?')
        expect(url).toContain('fragmentMode=true')
        expect(init).toMatchObject({ method: 'GET' })
    })
})
