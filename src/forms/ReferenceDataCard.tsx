import i18n from '@dhis2/d2-i18n'
import { Card, NoticeBox } from '@dhis2/ui'
import React, { FC } from 'react'
import type { PublicReferenceDataMetadata } from '../AppContext'
import {
    countriesLabel,
    formatBound,
    formatReportingPeriod,
    patientCohortLabel,
} from './referenceDataFormat'

interface ReferenceDataCardProps {
    dataset: PublicReferenceDataMetadata
    /** When `true`, prepend an "approximate Auto-match" warning. */
    approximate?: boolean
    /** Country code → display-name map; codes are shown raw without it. */
    countryNames?: Record<string, string>
}

/**
 * Always-visible summary of a selected reference dataset — its period,
 * birth-weight and gestational-age bounds, cohort, and country scope. Shared
 * by {@link ReferenceDataSelect}'s manual picker and the Partner Report's
 * Auto-benchmark display so both render the dataset identically. Birth-weight
 * and gestational-age get their own rows (showing "Any" when unbounded) since
 * their absence is itself a meaningful attribute of the benchmark cohort.
 */
const ReferenceDataCard: FC<ReferenceDataCardProps> = ({
    dataset,
    approximate = false,
    countryNames,
}) => (
    <Card>
        {approximate && (
            <NoticeBox warning title={i18n.t('Approximate match')}>
                {i18n.t(
                    'No dataset matched your cohort and country exactly; the closest available was chosen. Switch to manual selection to override.'
                )}
            </NoticeBox>
        )}
        <h4>{dataset.displayName}</h4>
        <p>
            <strong>{i18n.t('Period')}:</strong>{' '}
            {formatReportingPeriod(
                dataset.reportingPeriodFrom,
                dataset.reportingPeriodTo
            )}
        </p>
        <p>
            <strong>{i18n.t('Birth weight')}:</strong>{' '}
            {formatBound(
                dataset.birthWeightFrom,
                dataset.birthWeightTo,
                i18n.t('g')
            ) ?? i18n.t('Any')}
        </p>
        <p>
            <strong>{i18n.t('Gestational age')}:</strong>{' '}
            {formatBound(
                dataset.gestationalAgeFrom,
                dataset.gestationalAgeTo,
                i18n.t('w')
            ) ?? i18n.t('Any')}
        </p>
        <p>
            <strong>{i18n.t('Cohort')}:</strong> {patientCohortLabel(dataset)}
        </p>
        <p>
            <strong>{i18n.t('Countries')}:</strong>{' '}
            {countriesLabel(dataset.countries, countryNames)}
        </p>
    </Card>
)

export default ReferenceDataCard
