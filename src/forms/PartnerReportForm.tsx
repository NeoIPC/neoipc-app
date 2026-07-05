import i18n from '@dhis2/d2-i18n'
import {
    Button,
    Card,
    CheckboxField,
    FileInput,
    InputField,
    NoticeBox,
    Radio,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import React, { FC, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../AppContext'
import { useAuthorities } from '../authority/useAuthorities'
import {
    COUNTRY_GROUP_CODE,
    DEPARTMENT_GROUP_CODE,
    ELIGIBLE_PATIENTS_GROUP_CODE,
    TEST_UNITS_GROUP_CODE,
} from '../config/dhis2Constants'
import CollapsibleSection from './CollapsibleSection'
import DateField from './fields/DateField'
import NumberRangeField from './fields/NumberRangeField'
import OrganisationUnitMultiSelect from './fields/OrganisationUnitMultiSelect'
import {
    OrgUnitRow,
    ancestorCountryCodesForSelection,
    anySelectedInGroup,
} from './fields/orgUnits'
import { useOrgUnitNames } from './fields/useOrgUnitNames'
import PresetSelect, { CUSTOM_PRESET } from './PresetSelect'
import ReferenceDataCard from './ReferenceDataCard'
import ReferenceDataSelect from './ReferenceDataSelect'
import { matchReferenceData, BenchmarkMatch } from './referenceDataMatch'
import { governedKeys, resolvePresetValues } from './applyPreset'
import { languageLabel } from './languageLabel'
import { useReportConfig } from './useReportConfig'
import {
    ConfidenceIntervalMode,
    ConfidenceIntervalModeValues,
    confidenceIntervalModeLabel,
    includeElementKeys,
    includeElementLabel,
} from './enums'
import styles from './PartnerReportForm.module.css'

type PartnerReportMode = 'online' | 'dataFile'

/**
 * Mirrors the on-the-wire shape the Partner-Report endpoints accept,
 * minus the file body (carried separately in `dataFile` mode) and the
 * locale override (lives in {@link PartnerReportFormValues.locale}).
 *
 * Drift-checked against
 * `repos/NeoIPC-Reporting/src/NeoIPC.Reporting/PartnerReportApiParameters.cs`
 * by `scripts/check-schema-drift.mjs`.
 */
export interface PartnerReportFormValues {
    mode: PartnerReportMode
    /** dataFile mode only: JSON file body. `null` until the user picks one. */
    dataFile: File | null
    referenceDataFile: string
    /** online mode only: department orgUnit codes to aggregate. */
    unitCodes: string[]
    reportingPeriodFrom: string
    reportingPeriodTo: string
    birthWeightFrom: number | null
    birthWeightTo: number | null
    gestationalAgeFrom: number | null
    gestationalAgeTo: number | null
    includeNonCorePatients: boolean
    includeTestData: boolean
    sparseDataThreshold: number | null
    confidenceIntervals: ConfidenceIntervalMode | ''
    includeIntroductionTexts: boolean
    includeMethodsTexts: boolean
    includeOutlierInterpretation: boolean
    includeBirthWeightFigure: boolean
    includeGestationalAgeFigure: boolean
    includeIncidenceDensityTable: boolean
    includeDeviceAssociatedIncidenceDensityTable: boolean
    includeAgentPerInfectionRateTable: boolean
    includeInfectiousAgentDetectionRateTable: boolean
    includeRiskDensityRateTable: boolean
    includeAntibioticUtilisationTable: boolean
    includeSurgicalProcedureRateTable: boolean
    includeResistantPathogenInfectionRateTable: boolean
    includeOrganismResistanceRateTable: boolean
    includeAntibioticResistanceTestRateTable: boolean
    includeSecondaryBsiRateTable: boolean
    locale: string
    outputFormat: 'html' | 'pdf'
}

const defaultValues: PartnerReportFormValues = {
    mode: 'online',
    dataFile: null,
    referenceDataFile: '',
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
    includeOutlierInterpretation: false,
    includeBirthWeightFigure: true,
    includeGestationalAgeFigure: true,
    includeIncidenceDensityTable: true,
    includeDeviceAssociatedIncidenceDensityTable: true,
    includeAgentPerInfectionRateTable: true,
    includeInfectiousAgentDetectionRateTable: true,
    includeRiskDensityRateTable: true,
    includeAntibioticUtilisationTable: false,
    includeSurgicalProcedureRateTable: true,
    includeResistantPathogenInfectionRateTable: false,
    includeOrganismResistanceRateTable: false,
    includeAntibioticResistanceTestRateTable: false,
    includeSecondaryBsiRateTable: false,
    locale: '',
    outputFormat: 'html',
}

interface PartnerReportFormProps {
    onSubmit?: (values: PartnerReportFormValues) => void
    /** Disable the submit button and show a loading spinner on it. */
    submitting?: boolean
}

const PartnerReportForm: FC<PartnerReportFormProps> = ({
    onSubmit,
    submitting = false,
}) => {
    const { presets, locales } = useReportConfig('partner-report')
    const { referenceDataSets } = useAppContext()
    const { isAdmin } = useAuthorities()
    const countryNames = useOrgUnitNames(COUNTRY_GROUP_CODE)
    const [values, setValues] = useState<PartnerReportFormValues>(defaultValues)
    const [preset, setPreset] = useState<string>('default')
    // Benchmark selection: 'auto' derives the dataset from the partner's
    // settings; 'manual' opens the faceted picker for override.
    const [benchmarkMode, setBenchmarkMode] = useState<
        'auto' | 'manual' | 'none'
    >('auto')
    // Enriched department rows from the picker — used to derive the
    // selection's ancestor countries (Auto-match) and eligibility-group
    // membership (the non-core-patients gate) without a second query.
    const [deptRows, setDeptRows] = useState<OrgUnitRow[]>([])
    const [autoMatch, setAutoMatch] = useState<BenchmarkMatch | null>(null)

    const presetLocked = preset !== CUSTOM_PRESET
    // Only offer a language picker when there is a genuine choice. The
    // backend advertises only render-ready languages (its allowlist), so
    // today this is English alone and the picker is hidden; it reappears
    // automatically once a second language becomes render-ready.
    const hasLanguageChoice = (locales?.length ?? 0) > 1

    const deptCountryCodes = useMemo(
        () =>
            ancestorCountryCodesForSelection(
                deptRows,
                values.unitCodes,
                COUNTRY_GROUP_CODE
            ),
        [deptRows, values.unitCodes]
    )
    // Only departments in NEOIPC_ALL_PATIENTS_ELIGIBLE intentionally enrol
    // non-core patients, so the toggle is offered only then.
    const showNonCorePatients = useMemo(
        () =>
            anySelectedInGroup(
                deptRows,
                values.unitCodes,
                ELIGIBLE_PATIENTS_GROUP_CODE
            ),
        [deptRows, values.unitCodes]
    )
    // Test-unit departments (e.g. AT_TEST_TEST) are dropped by neoipcr
    // unless include_test_data is set, so the picker offers them only when
    // "Include test data" is checked — otherwise selecting one resolves to
    // an empty org-unit set and the render fails. Switching the box off
    // reconciles any already-selected test department out of the picker.
    const departmentExcludeGroups = useMemo(
        () => (values.includeTestData ? [] : [TEST_UNITS_GROUP_CODE]),
        [values.includeTestData]
    )

    const setField = <K extends keyof PartnerReportFormValues>(key: K) =>
        (value: PartnerReportFormValues[K]) =>
            setValues((prev) => ({ ...prev, [key]: value }))

    // The governed-content defaults (QMD defaults) a non-Custom preset
    // resets to before applying its overrides.
    const governedDefaults = useMemo<Record<string, boolean | string>>(
        () => Object.fromEntries(governedKeys.map((k) => [k, defaultValues[k]])),
        []
    )

    const applyPreset = (name: string): void => {
        setPreset(name)
        if (name === CUSTOM_PRESET) return
        const resolved = resolvePresetValues(presets?.[name] ?? {}, governedDefaults)
        setValues((prev) => ({
            ...prev,
            ...(resolved as Partial<PartnerReportFormValues>),
        }))
    }

    // In Auto mode, keep the benchmark dataset synced to the partner's
    // cohort + countries. Manual mode leaves `referenceDataFile` to the
    // picker (and seeds it from the last Auto pick). dataFile mode has no
    // cohort filters or departments to match on, so Auto is skipped there
    // and the form offers manual selection only.
    useEffect(() => {
        if (benchmarkMode !== 'auto' || values.mode !== 'online') return
        const match = matchReferenceData(referenceDataSets, {
            birthWeightFrom: values.birthWeightFrom,
            birthWeightTo: values.birthWeightTo,
            gestationalAgeFrom: values.gestationalAgeFrom,
            gestationalAgeTo: values.gestationalAgeTo,
            includeNonCorePatients: values.includeNonCorePatients,
            countryCodes: deptCountryCodes,
        })
        setAutoMatch(match)
        setValues((prev) => ({
            ...prev,
            referenceDataFile: match?.dataset.id ?? '',
        }))
    }, [
        benchmarkMode,
        values.mode,
        referenceDataSets,
        values.birthWeightFrom,
        values.birthWeightTo,
        values.gestationalAgeFrom,
        values.gestationalAgeTo,
        values.includeNonCorePatients,
        deptCountryCodes,
    ])

    // Content blocks shared by both layouts: in online mode they sit inside
    // "More options" (secondary to the data-fetch fields), in dataFile mode
    // the data-fetch fields are gone so these are promoted to top-level
    // cards. The section heading is supplied by the caller (an <h3> inside
    // "More options" vs the card's <h2>).
    const patientPopulationFilters = (
        <>
            <h3>{i18n.t('Patient population filters')}</h3>
            <div className={styles.rowTwo}>
                <NumberRangeField
                    name="birthWeight"
                    label={i18n.t('Birth weight (g)')}
                    fromValue={values.birthWeightFrom}
                    toValue={values.birthWeightTo}
                    onFromChange={setField('birthWeightFrom')}
                    onToChange={setField('birthWeightTo')}
                    min={0}
                    max={65535}
                />
                <NumberRangeField
                    name="gestationalAge"
                    label={i18n.t('Gestational age (weeks)')}
                    fromValue={values.gestationalAgeFrom}
                    toValue={values.gestationalAgeTo}
                    onFromChange={setField('gestationalAgeFrom')}
                    onToChange={setField('gestationalAgeTo')}
                    min={0}
                    max={52}
                />
            </div>
            {showNonCorePatients && (
                <CheckboxField
                    name="includeNonCorePatients"
                    label={i18n.t('Include non-core patients')}
                    helpText={i18n.t(
                        'A selected department enrols all neonates, not ' +
                            'just the core cohort. Include those non-core ' +
                            'patients in the report.'
                    )}
                    checked={values.includeNonCorePatients}
                    onChange={({ checked }) =>
                        setField('includeNonCorePatients')(checked)
                    }
                />
            )}
        </>
    )

    // dataFile mode has no cohort filters or departments' countries to
    // drive Auto-match (the client never parses the uploaded file), so it
    // offers manual dataset selection only.
    const benchmarkFields = (manualOnly: boolean) =>
        manualOnly ? (
            <ReferenceDataSelect
                datasets={referenceDataSets}
                value={values.referenceDataFile}
                // Keep benchmarkMode in step with the picked dataset. The
                // online view reads benchmarkMode to render its radios, so
                // without this a dataset picked here (dataFile mode, where the
                // radios aren't shown) could return to online still showing
                // "None" while referenceDataFile is set — submitting a
                // benchmark the visible control says is off.
                onChange={(id) => {
                    setField('referenceDataFile')(id)
                    setBenchmarkMode(id ? 'manual' : 'none')
                }}
                countryNames={countryNames}
                label={i18n.t('Benchmark dataset')}
                helpText={i18n.t(
                    'Optional. Pick a saved reference dataset to ' +
                        'compare the partner units against.'
                )}
            />
        ) : (
            <>
                <fieldset>
                    <legend>
                        {i18n.t('Reference dataset to compare against')}
                    </legend>
                    <Radio
                        name="benchmarkMode"
                        label={i18n.t(
                            'Automatic — best match for these settings'
                        )}
                        value="auto"
                        checked={benchmarkMode === 'auto'}
                        onChange={() => setBenchmarkMode('auto')}
                    />
                    <Radio
                        name="benchmarkMode"
                        label={i18n.t('Choose a dataset manually')}
                        value="manual"
                        checked={benchmarkMode === 'manual'}
                        onChange={() => setBenchmarkMode('manual')}
                    />
                    <Radio
                        name="benchmarkMode"
                        label={i18n.t('None — show only your data')}
                        value="none"
                        checked={benchmarkMode === 'none'}
                        onChange={() => {
                            setBenchmarkMode('none')
                            setField('referenceDataFile')('')
                        }}
                    />
                </fieldset>
                {benchmarkMode === 'none' ? (
                    <NoticeBox title={i18n.t('No benchmark')}>
                        {i18n.t(
                            'The report shows only your data, without a ' +
                                'reference comparison.'
                        )}
                    </NoticeBox>
                ) : benchmarkMode === 'auto' ? (
                    autoMatch ? (
                        <ReferenceDataCard
                            dataset={autoMatch.dataset}
                            approximate={!autoMatch.exact}
                            countryNames={countryNames}
                        />
                    ) : (
                        <NoticeBox title={i18n.t('No benchmark selected')}>
                            {i18n.t(
                                'No saved reference dataset is available to ' +
                                    'benchmark against. The report renders ' +
                                    'without a comparison.'
                            )}
                        </NoticeBox>
                    )
                ) : (
                    <ReferenceDataSelect
                        datasets={referenceDataSets}
                        value={values.referenceDataFile}
                        onChange={setField('referenceDataFile')}
                        countryNames={countryNames}
                        label={i18n.t('Benchmark dataset')}
                        helpText={i18n.t(
                            'Optional. Pick a saved reference dataset to ' +
                                'compare the partner units against.'
                        )}
                    />
                )}
            </>
        )

    const contentFields = (
        <>
            <PresetSelect
                presets={presets}
                value={preset}
                onChange={applyPreset}
            />
            <div className={styles.checkboxGrid}>
                {includeElementKeys.map((key) => (
                    <CheckboxField
                        key={key}
                        name={key}
                        label={includeElementLabel(key)}
                        checked={values[key]}
                        disabled={presetLocked}
                        onChange={({ checked }) => setField(key)(checked)}
                    />
                ))}
            </div>
            <SingleSelectField
                label={i18n.t('Confidence intervals')}
                helpText={i18n.t('Backend default if unset.')}
                selected={values.confidenceIntervals}
                disabled={presetLocked}
                onChange={({ selected }) =>
                    setField('confidenceIntervals')(
                        selected as ConfidenceIntervalMode | ''
                    )
                }
            >
                <SingleSelectOption
                    value=""
                    label={i18n.t('(backend default)')}
                />
                {ConfidenceIntervalModeValues.map((mode) => (
                    <SingleSelectOption
                        key={mode}
                        value={mode}
                        label={confidenceIntervalModeLabel(mode)}
                    />
                ))}
            </SingleSelectField>
            <CheckboxField
                name="includeIntroductionTexts"
                label={i18n.t('Include introduction texts')}
                checked={values.includeIntroductionTexts}
                disabled={presetLocked}
                onChange={({ checked }) =>
                    setField('includeIntroductionTexts')(checked)
                }
            />
            <CheckboxField
                name="includeMethodsTexts"
                label={i18n.t('Include methods texts')}
                checked={values.includeMethodsTexts}
                disabled={presetLocked}
                onChange={({ checked }) =>
                    setField('includeMethodsTexts')(checked)
                }
            />
        </>
    )

    const languageField = (
        <SingleSelectField
            label={i18n.t('Report language')}
            helpText={i18n.t(
                'Leave blank to use the locale from your DHIS2 user setting.'
            )}
            selected={
                values.locale === '' || (locales ?? []).includes(values.locale)
                    ? values.locale
                    : undefined
            }
            loading={locales === null}
            onChange={({ selected }) => setField('locale')(selected ?? '')}
        >
            <SingleSelectOption
                value=""
                label={i18n.t('(use DHIS2 user setting)')}
            />
            {(locales ?? []).map((loc) => (
                <SingleSelectOption
                    key={loc}
                    value={loc}
                    label={languageLabel(loc)}
                />
            ))}
        </SingleSelectField>
    )

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                onSubmit?.(values)
            }}
        >
            <Card>
                <fieldset>
                    <legend>{i18n.t('Output format')}</legend>
                    <Radio
                        name="outputFormat"
                        label={i18n.t('View as HTML')}
                        value="html"
                        checked={values.outputFormat === 'html'}
                        onChange={() => setField('outputFormat')('html')}
                    />
                    <Radio
                        name="outputFormat"
                        label={i18n.t('Download as PDF')}
                        value="pdf"
                        checked={values.outputFormat === 'pdf'}
                        onChange={() => setField('outputFormat')('pdf')}
                    />
                </fieldset>
                <fieldset>
                    <legend>{i18n.t('Data source')}</legend>
                    <Radio
                        name="mode"
                        label={i18n.t('Online — pull current DHIS2 data')}
                        value="online"
                        checked={values.mode === 'online'}
                        onChange={() => setField('mode')('online')}
                    />
                    <Radio
                        name="mode"
                        label={i18n.t('Upload partner data file (JSON)')}
                        value="dataFile"
                        checked={values.mode === 'dataFile'}
                        onChange={() => setField('mode')('dataFile')}
                    />
                    {values.mode === 'dataFile' && (
                        <FileInput
                            name="dataFile"
                            buttonLabel={i18n.t('Choose file')}
                            accept="application/json"
                            onChange={({ files }) =>
                                setField('dataFile')(files?.[0] ?? null)
                            }
                        />
                    )}
                </fieldset>
            </Card>

            {values.mode === 'online' && (
                <Card>
                    <h2>{i18n.t('Departments')}</h2>
                    <OrganisationUnitMultiSelect
                        name="unitCodes"
                        label={i18n.t('Departments')}
                        helpText={i18n.t(
                            'Pick one or more departments. The report ' +
                                'aggregates across the selected set.'
                        )}
                        groupCode={DEPARTMENT_GROUP_CODE}
                        excludeGroupCodes={departmentExcludeGroups}
                        showParentInLabel
                        selectedCodes={values.unitCodes}
                        onChange={setField('unitCodes')}
                        onRowsLoaded={setDeptRows}
                    />
                </Card>
            )}

            {values.mode === 'online' && (
                <Card>
                    <h2>{i18n.t('Reporting period')}</h2>
                    <div className={styles.rowTwo}>
                        <DateField
                            name="reportingPeriodFrom"
                            label={i18n.t('From')}
                            value={values.reportingPeriodFrom}
                            onChange={setField('reportingPeriodFrom')}
                        />
                        <DateField
                            name="reportingPeriodTo"
                            label={i18n.t('To')}
                            value={values.reportingPeriodTo}
                            onChange={setField('reportingPeriodTo')}
                        />
                    </div>
                </Card>
            )}

            {values.mode === 'online' ? (
                <CollapsibleSection title={i18n.t('More options')}>
                    {patientPopulationFilters}
                    <h3>{i18n.t('Benchmark')}</h3>
                    {benchmarkFields(false)}
                    <h3>{i18n.t('Content')}</h3>
                    {contentFields}
                    {hasLanguageChoice && (
                        <>
                            <h3>{i18n.t('Language')}</h3>
                            {languageField}
                        </>
                    )}
                </CollapsibleSection>
            ) : (
                <>
                    <Card>
                        <h2>{i18n.t('Benchmark')}</h2>
                        {benchmarkFields(true)}
                    </Card>
                    <Card>
                        <h2>{i18n.t('Content')}</h2>
                        {contentFields}
                    </Card>
                    {hasLanguageChoice && (
                        <Card>
                            <h2>{i18n.t('Language')}</h2>
                            {languageField}
                        </Card>
                    )}
                </>
            )}

            {isAdmin && (
                <CollapsibleSection title={i18n.t('Advanced (admins only)')}>
                    {values.mode === 'online' && (
                        <CheckboxField
                            name="includeTestData"
                            label={i18n.t('Include test data')}
                            checked={values.includeTestData}
                            onChange={({ checked }) =>
                                setField('includeTestData')(checked)
                            }
                        />
                    )}
                    <InputField
                        label={i18n.t('Sparse data threshold')}
                        name="sparseDataThreshold"
                        type="number"
                        value={
                            values.sparseDataThreshold === null
                                ? ''
                                : String(values.sparseDataThreshold)
                        }
                        onChange={({ value }) =>
                            setField('sparseDataThreshold')(
                                value === '' || value === undefined
                                    ? null
                                    : Number(value)
                            )
                        }
                    />
                    <CheckboxField
                        name="includeOutlierInterpretation"
                        label={i18n.t('Include outlier interpretation')}
                        checked={values.includeOutlierInterpretation}
                        onChange={({ checked }) =>
                            setField('includeOutlierInterpretation')(checked)
                        }
                    />
                </CollapsibleSection>
            )}

            <Button primary type="submit" disabled={submitting} loading={submitting}>
                {i18n.t('Generate')}
            </Button>
        </form>
    )
}

export default PartnerReportForm
