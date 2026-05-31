// LEARN: These string lists are COPIES of enums defined in the backend; the values
// (e.g. 'SecondaryBsiRateTable') go straight onto the HTTP request, so they must
// match exactly — the drift check (docs/07) guards that. The *Label functions turn
// each wire value into a human label using a big `switch` of literal i18n.t('...')
// calls, which is required for translation extraction (docs/08 §8.2). Note
// `as const` below, which lets the *type* be derived from the array (docs/02 §2.9).
import i18n from '@dhis2/d2-i18n'

/**
 * Vendored copies of the backend's report-parameter enums. Kept in
 * sync with the corresponding C# enums in
 * `repos/NeoIPC-Reporting/src/NeoIPC.Reporting/`:
 *
 *   - {@link PartnerReportElementValues}: `PartnerReportElement.cs`
 *   - {@link ReferenceReportElementValues}: `ReferenceReportElement.cs`
 *   - {@link ReferenceReportSectionTextValues}: `ReferenceReportElement.cs`
 *   - {@link ConfidenceIntervalModeValues}: `ConfidenceIntervalMode.cs`
 *
 * The schema-as-contract drift check (`scripts/check-schema-drift.mjs`)
 * verifies these lists against the vendored
 * `src/schemas/*-report.json` snapshots and against the backend's
 * compiled `<Report>ApiParameters.Schema` arrays. Backend rename or
 * insert: schema-drift check fails, this file gets updated, form
 * spec updated, all in the same change.
 */

export const PartnerReportElementValues = [
    'BirthWeightFigure',
    'GestationalAgeFigure',
    'IncidenceDensityTable',
    'DeviceAssociatedIncidenceDensityTable',
    'AgentPerInfectionRateTable',
    'InfectiousAgentDetectionRateTable',
    'RiskDensityRateTable',
    'AntibioticUtilisationTable',
    'SurgicalProcedureRateTable',
    'ResistantPathogenInfectionRateTable',
    'OrganismResistanceRateTable',
    'AntibioticResistanceTestRateTable',
    'SecondaryBsiRateTable',
] as const

export type PartnerReportElement = (typeof PartnerReportElementValues)[number]

export const ReferenceReportElementValues = [
    'BirthWeightFigure',
    'GestationalAgeFigure',
    'IncidenceDensityTable',
    'DeviceAssociatedIncidenceDensityTable',
    'AgentPerInfectionRateTable',
    'ResistantPathogenInfectionRateTable',
    'OrganismResistanceRateTable',
    'InfectiousAgentDetectionRateTable',
    'AntibioticResistanceTestRateTable',
    'RiskDensityRateTable',
    'AntibioticUtilisationTable',
    'SurgicalProcedureRateTable',
    'SecondaryBsiRateTable',
] as const

export type ReferenceReportElement = (typeof ReferenceReportElementValues)[number]

export const ReferenceReportSectionTextValues = [
    'PatientPopulation',
    'Nosocomial',
    'InfectiousAgents',
    'RiskFactors',
    'Surgery',
] as const

export type ReferenceReportSectionText =
    (typeof ReferenceReportSectionTextValues)[number]

/**
 * Wire values for the `confidenceIntervals` query parameter. The backend
 * (`ConfidenceIntervalMode.cs` and the vendored `partner-report.json` /
 * `reference-report.json` schemas) declares the accepted values as
 * lowercase tokens, so these strings go directly onto the wire.
 *
 * Use {@link confidenceIntervalModeLabel} to render a localised
 * title-cased label for UI display.
 */
export const ConfidenceIntervalModeValues = ['all', 'rate', 'none'] as const

export type ConfidenceIntervalMode = (typeof ConfidenceIntervalModeValues)[number]

/**
 * Localised display label for a {@link ConfidenceIntervalMode}. Uses a
 * switch with literal `i18n.t('...')` calls so the d2-i18n extractor
 * picks the strings up into `i18n/en.pot`; passing `mode` directly to
 * `i18n.t` would be a dynamic argument that the extractor skips.
 */
export const confidenceIntervalModeLabel = (
    mode: ConfidenceIntervalMode
): string => {
    switch (mode) {
        case 'all':
            return i18n.t('All')
        case 'rate':
            return i18n.t('Rate')
        case 'none':
            return i18n.t('None')
    }
}

/**
 * Localised display label for a {@link PartnerReportElement} or
 * {@link ReferenceReportElement}. The wire identifiers are PascalCase
 * C# enum names; the labels here are the operator-facing sentence-case
 * strings that appear in the report-element selector. Mapped per value
 * (rather than computed by splitting PascalCase) so each label is a
 * literal `i18n.t('...')` call that the d2-i18n extractor picks up,
 * and so individual labels can be copyedited or abbreviated
 * independently of the wire identifiers (e.g. capitalising acronyms
 * like `BSI`).
 *
 * `PartnerReportElement` and `ReferenceReportElement` currently share
 * the same set of values, so one helper covers both.
 */
export const reportElementLabel = (
    element: PartnerReportElement | ReferenceReportElement
): string => {
    switch (element) {
        case 'BirthWeightFigure':
            return i18n.t('Birth weight figure')
        case 'GestationalAgeFigure':
            return i18n.t('Gestational age figure')
        case 'IncidenceDensityTable':
            return i18n.t('Incidence density table')
        case 'DeviceAssociatedIncidenceDensityTable':
            return i18n.t('Device-associated incidence density table')
        case 'AgentPerInfectionRateTable':
            return i18n.t('Agent per infection rate table')
        case 'InfectiousAgentDetectionRateTable':
            return i18n.t('Infectious agent detection rate table')
        case 'RiskDensityRateTable':
            return i18n.t('Risk density rate table')
        case 'AntibioticUtilisationTable':
            return i18n.t('Antibiotic utilisation table')
        case 'SurgicalProcedureRateTable':
            return i18n.t('Surgical procedure rate table')
        case 'ResistantPathogenInfectionRateTable':
            return i18n.t('Resistant pathogen infection rate table')
        case 'OrganismResistanceRateTable':
            return i18n.t('Organism resistance rate table')
        case 'AntibioticResistanceTestRateTable':
            return i18n.t('Antibiotic resistance test rate table')
        case 'SecondaryBsiRateTable':
            return i18n.t('Secondary BSI rate table')
    }
}

/**
 * Localised display label for a {@link ReferenceReportSectionText}.
 * Same pattern as {@link reportElementLabel}: literal `i18n.t('...')`
 * per value so the strings extract into `i18n/en.pot`.
 */
export const referenceReportSectionTextLabel = (
    section: ReferenceReportSectionText
): string => {
    switch (section) {
        case 'PatientPopulation':
            return i18n.t('Patient population')
        case 'Nosocomial':
            return i18n.t('Nosocomial')
        case 'InfectiousAgents':
            return i18n.t('Infectious agents')
        case 'RiskFactors':
            return i18n.t('Risk factors')
        case 'Surgery':
            return i18n.t('Surgery')
    }
}
