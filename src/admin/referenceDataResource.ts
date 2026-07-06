import i18n from '@dhis2/d2-i18n'
import type { AdminResourceMetadata } from '../api/admin'
import type { AdminResourceType } from './AdminResourceType'

/**
 * Backend wire shape from
 * {@link NeoIPC.Reporting.Resources.AdminReferenceDataMetadata}.
 * Camel-cased by the backend's `JsonNamingPolicy.CamelCase`.
 */
export interface AdminReferenceDataMetadata extends AdminResourceMetadata {
    reportingPeriodFrom?: string
    reportingPeriodTo?: string
    birthWeightFrom?: number
    birthWeightTo?: number
    gestationalAgeFrom?: number
    gestationalAgeTo?: number
    countries?: string[]
    includeTestUnits: boolean
    includeNonCorePatients: boolean
}

const formatPeriod = (item: AdminReferenceDataMetadata): string => {
    if (!item.reportingPeriodFrom && !item.reportingPeriodTo) return ''
    const from = item.reportingPeriodFrom ?? '?'
    const to = item.reportingPeriodTo ?? '?'
    return `${from} – ${to}`
}

export const referenceDataResource: AdminResourceType<AdminReferenceDataMetadata> =
    {
        segment: 'reference-data',
        title: () => i18n.t('Reference data'),
        singular: () => i18n.t('reference dataset'),
        plural: () => i18n.t('Reference datasets'),
        accept: 'application/json',
        uploadContentType: 'application/json',
        refreshesAppReferenceData: true,
        displayNameHelp: () =>
            i18n.t(
                'Operator-facing label that appears in the picker on the Reference Report form.'
            ),
        extraColumns: [
            {
                id: 'reportingPeriod',
                label: () => i18n.t('Reporting period'),
                render: formatPeriod,
            },
            {
                id: 'countries',
                label: () => i18n.t('Countries'),
                render: (item) =>
                    item.countries && item.countries.length > 0
                        ? item.countries.join(', ')
                        : i18n.t('(any)'),
            },
        ],
    }
