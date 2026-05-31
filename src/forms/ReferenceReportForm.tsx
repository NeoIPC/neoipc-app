import i18n from '@dhis2/d2-i18n'
import {
    Button,
    Card,
    CheckboxField,
    InputField,
    MultiSelectField,
    MultiSelectOption,
    Radio,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import React, { FC, useState } from 'react'
import { useAppContext } from '../AppContext'
import { COUNTRY_LEVEL, HOSPITAL_LEVEL } from '../config/dhis2Constants'
import DateField from './fields/DateField'
import NumberRangeField from './fields/NumberRangeField'
import OrganisationUnitMultiSelect from './fields/OrganisationUnitMultiSelect'
import {
    ConfidenceIntervalMode,
    ConfidenceIntervalModeValues,
    confidenceIntervalModeLabel,
    ReferenceReportElement,
    ReferenceReportElementValues,
    referenceReportSectionTextLabel,
    ReferenceReportSectionText,
    ReferenceReportSectionTextValues,
    reportElementLabel,
} from './enums'

/**
 * Mirrors the on-the-wire shape the Reference-Report endpoint
 * accepts. Drift-checked against
 * `repos/NeoIPC-Reporting/src/NeoIPC.Reporting/ReferenceReportApiParameters.cs`
 * by `scripts/check-schema-drift.mjs`.
 */
export interface ReferenceReportFormValues {
    /** UID of a saved reference dataset (from {@link useAppContext}).
     *  When set, the live-fetch filters are disabled and the report
     *  consumes the pre-computed dataset. */
    referenceDataId: string
    profile: string
    validationExceptionFile: string
    enabledElements: ReferenceReportElement[]
    disabledElements: ReferenceReportElement[]
    enabledSectionTexts: ReferenceReportSectionText[]
    disabledSectionTexts: ReferenceReportSectionText[]
    reportingPeriodFrom: string
    reportingPeriodTo: string
    birthWeightFrom: number | null
    birthWeightTo: number | null
    gestationalAgeFrom: number | null
    gestationalAgeTo: number | null
    countryFilter: string[]
    hospitalFilter: string[]
    /** `null` = backend default. */
    testUnitFilter: boolean | null
    /** `null` = backend default. */
    defaultPatientFilter: boolean | null
    sparseDataThreshold: number | null
    confidenceIntervals: ConfidenceIntervalMode | ''
    includeIntroductionTexts: boolean
    includeMethodsTexts: boolean
    locale: string
    outputFormat: 'html' | 'pdf'
}

const defaultValues: ReferenceReportFormValues = {
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
}

interface ReferenceReportFormProps {
    onSubmit?: (values: ReferenceReportFormValues) => void
    /** Disable the submit button and show a loading spinner on it. */
    submitting?: boolean
}

const ReferenceReportForm: FC<ReferenceReportFormProps> = ({
    onSubmit,
    submitting = false,
}) => {
    const { referenceDataSets } = useAppContext()
    const [values, setValues] = useState<ReferenceReportFormValues>(
        defaultValues
    )

    const setField = <K extends keyof ReferenceReportFormValues>(key: K) =>
        (value: ReferenceReportFormValues[K]) =>
            setValues((prev) => ({ ...prev, [key]: value }))

    // LEARN: When a saved dataset is chosen, the live-fetch filters below are
    // DISABLED (not hidden) — the backend forbids mixing the two ("no mixed mode").
    // This derived boolean drives the `disabled` prop on those fields. docs/07 §7.2.
    const usingSavedDataset = values.referenceDataId !== ''

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
            </Card>

            <Card>
                <h2>{i18n.t('Data source')}</h2>
                <SingleSelectField
                    label={i18n.t('Reference dataset')}
                    helpText={i18n.t(
                        'Pick a pre-computed dataset to render against, ' +
                            'or leave empty to compute reference data live ' +
                            'from the filters below.'
                    )}
                    selected={values.referenceDataId}
                    onChange={({ selected }) =>
                        setField('referenceDataId')(selected ?? '')
                    }
                >
                    <SingleSelectOption
                        value=""
                        label={i18n.t('(none — use live-fetch filters)')}
                    />
                    {referenceDataSets.map((dataset) => (
                        <SingleSelectOption
                            key={dataset.id}
                            value={dataset.id}
                            label={dataset.displayName}
                        />
                    ))}
                </SingleSelectField>
            </Card>

            <Card>
                <h2>{i18n.t('Live-fetch filters')}</h2>
                <p>
                    {usingSavedDataset
                        ? i18n.t(
                              'Disabled — a saved dataset is selected above.'
                          )
                        : i18n.t(
                              'Used when no saved reference dataset is selected.'
                          )}
                </p>
                <OrganisationUnitMultiSelect
                    name="countryFilter"
                    label={i18n.t('Countries')}
                    level={COUNTRY_LEVEL}
                    selectedCodes={values.countryFilter}
                    onChange={setField('countryFilter')}
                    disabled={usingSavedDataset}
                />
                <OrganisationUnitMultiSelect
                    name="hospitalFilter"
                    label={i18n.t('Hospitals')}
                    level={HOSPITAL_LEVEL}
                    selectedCodes={values.hospitalFilter}
                    onChange={setField('hospitalFilter')}
                    disabled={usingSavedDataset}
                />
                <SingleSelectField
                    label={i18n.t('Test units')}
                    selected={
                        values.testUnitFilter === null
                            ? ''
                            : values.testUnitFilter
                              ? 'true'
                              : 'false'
                    }
                    onChange={({ selected }) =>
                        setField('testUnitFilter')(
                            selected === '' ? null : selected === 'true'
                        )
                    }
                    disabled={usingSavedDataset}
                >
                    <SingleSelectOption value="" label={i18n.t('(backend default)')} />
                    <SingleSelectOption value="true" label={i18n.t('Include')} />
                    <SingleSelectOption value="false" label={i18n.t('Exclude')} />
                </SingleSelectField>
                <SingleSelectField
                    label={i18n.t('Default patient filter')}
                    selected={
                        values.defaultPatientFilter === null
                            ? ''
                            : values.defaultPatientFilter
                              ? 'true'
                              : 'false'
                    }
                    onChange={({ selected }) =>
                        setField('defaultPatientFilter')(
                            selected === '' ? null : selected === 'true'
                        )
                    }
                    disabled={usingSavedDataset}
                >
                    <SingleSelectOption value="" label={i18n.t('(backend default)')} />
                    <SingleSelectOption value="true" label={i18n.t('Apply')} />
                    <SingleSelectOption value="false" label={i18n.t('Skip')} />
                </SingleSelectField>
            </Card>

            <Card>
                <h2>{i18n.t('Reporting period')}</h2>
                <DateField
                    name="reportingPeriodFrom"
                    label={i18n.t('From')}
                    value={values.reportingPeriodFrom}
                    onChange={setField('reportingPeriodFrom')}
                    disabled={usingSavedDataset}
                />
                <DateField
                    name="reportingPeriodTo"
                    label={i18n.t('To')}
                    value={values.reportingPeriodTo}
                    onChange={setField('reportingPeriodTo')}
                    disabled={usingSavedDataset}
                />
            </Card>

            <Card>
                <h2>{i18n.t('Patient population filters')}</h2>
                <NumberRangeField
                    name="birthWeight"
                    label={i18n.t('Birth weight (g)')}
                    fromValue={values.birthWeightFrom}
                    toValue={values.birthWeightTo}
                    onFromChange={setField('birthWeightFrom')}
                    onToChange={setField('birthWeightTo')}
                    min={0}
                    max={65535}
                    disabled={usingSavedDataset}
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
                    disabled={usingSavedDataset}
                />
            </Card>

            <Card>
                <h2>{i18n.t('Output options')}</h2>
                <InputField
                    label={i18n.t('Quarto profile')}
                    name="profile"
                    helpText={i18n.t(
                        'Optional. Leave blank for the default profile.'
                    )}
                    value={values.profile}
                    onChange={({ value }) =>
                        setField('profile')(value ?? '')
                    }
                />
                <InputField
                    label={i18n.t('Validation exception file ID')}
                    name="validationExceptionFile"
                    helpText={i18n.t(
                        'Optional. Pick from the admin-managed list ' +
                            '(picker UI lands in a later commit).'
                    )}
                    value={values.validationExceptionFile}
                    onChange={({ value }) =>
                        setField('validationExceptionFile')(value ?? '')
                    }
                />
                <SingleSelectField
                    label={i18n.t('Confidence intervals')}
                    helpText={i18n.t('Backend default if unset.')}
                    selected={values.confidenceIntervals}
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
                    name="includeIntroductionTexts"
                    label={i18n.t('Include introduction texts')}
                    checked={values.includeIntroductionTexts}
                    onChange={({ checked }) =>
                        setField('includeIntroductionTexts')(checked)
                    }
                />
                <CheckboxField
                    name="includeMethodsTexts"
                    label={i18n.t('Include methods texts')}
                    checked={values.includeMethodsTexts}
                    onChange={({ checked }) =>
                        setField('includeMethodsTexts')(checked)
                    }
                />
            </Card>

            <Card>
                <h2>{i18n.t('Element toggles')}</h2>
                <MultiSelectField
                    label={i18n.t('Enabled elements (override defaults)')}
                    helpText={i18n.t(
                        'Leave empty to use the backend defaults.'
                    )}
                    selected={values.enabledElements}
                    onChange={({ selected }) =>
                        setField('enabledElements')(
                            selected as ReferenceReportElement[]
                        )
                    }
                >
                    {ReferenceReportElementValues.map((element) => (
                        <MultiSelectOption
                            key={element}
                            value={element}
                            label={reportElementLabel(element)}
                        />
                    ))}
                </MultiSelectField>
                <MultiSelectField
                    label={i18n.t('Disabled elements (override defaults)')}
                    selected={values.disabledElements}
                    onChange={({ selected }) =>
                        setField('disabledElements')(
                            selected as ReferenceReportElement[]
                        )
                    }
                >
                    {ReferenceReportElementValues.map((element) => (
                        <MultiSelectOption
                            key={element}
                            value={element}
                            label={reportElementLabel(element)}
                        />
                    ))}
                </MultiSelectField>
            </Card>

            <Card>
                <h2>{i18n.t('Section text toggles')}</h2>
                <MultiSelectField
                    label={i18n.t('Enabled section texts')}
                    selected={values.enabledSectionTexts}
                    onChange={({ selected }) =>
                        setField('enabledSectionTexts')(
                            selected as ReferenceReportSectionText[]
                        )
                    }
                >
                    {ReferenceReportSectionTextValues.map((section) => (
                        <MultiSelectOption
                            key={section}
                            value={section}
                            label={referenceReportSectionTextLabel(section)}
                        />
                    ))}
                </MultiSelectField>
                <MultiSelectField
                    label={i18n.t('Disabled section texts')}
                    selected={values.disabledSectionTexts}
                    onChange={({ selected }) =>
                        setField('disabledSectionTexts')(
                            selected as ReferenceReportSectionText[]
                        )
                    }
                >
                    {ReferenceReportSectionTextValues.map((section) => (
                        <MultiSelectOption
                            key={section}
                            value={section}
                            label={referenceReportSectionTextLabel(section)}
                        />
                    ))}
                </MultiSelectField>
            </Card>

            <Card>
                <h2>{i18n.t('Locale')}</h2>
                <SingleSelectField
                    label={i18n.t('Report locale')}
                    helpText={i18n.t(
                        'Leave blank to use the locale from your DHIS2 user setting.'
                    )}
                    selected={values.locale}
                    onChange={({ selected }) =>
                        setField('locale')(selected ?? '')
                    }
                >
                    <SingleSelectOption
                        value=""
                        label={i18n.t('(use DHIS2 user setting)')}
                    />
                    {['en', 'de'].map((loc) => (
                        <SingleSelectOption
                            key={loc}
                            value={loc}
                            label={loc}
                        />
                    ))}
                </SingleSelectField>
            </Card>

            <Button primary type="submit" disabled={submitting} loading={submitting}>
                {i18n.t('Generate')}
            </Button>
        </form>
    )
}

export default ReferenceReportForm
