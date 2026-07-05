import i18n from '@dhis2/d2-i18n'
import React, { FC, useEffect } from 'react'
import { useAppContext } from '../../AppContext'
import { renderReferenceReport } from '../../api/reports'
import ReferenceReportForm, {
    ReferenceReportFormValues,
} from '../../forms/ReferenceReportForm'
import ReportResultPanel from '../../render/ReportResultPanel'
import { useReportRender } from '../../render/useReportRender'

const ReferenceReportPage: FC = () => {
    const render = useReportRender<ReferenceReportFormValues>(
        renderReferenceReport
    )
    const { reloadReferenceDataSets } = useAppContext()
    // Refresh the benchmark listing on entry so datasets uploaded out of band
    // (the play seed, another admin's session) appear without a full reload —
    // AppContext otherwise fetches the list once at startup.
    useEffect(() => {
        void reloadReferenceDataSets().catch(() => {})
    }, [reloadReferenceDataSets])
    return (
        <>
            <h1>{i18n.t('Reference Report')}</h1>
            <ReferenceReportForm
                onSubmit={render.submit}
                submitting={render.loading}
            />
            <ReportResultPanel
                loading={render.loading}
                elapsedSeconds={render.elapsedSeconds}
                fragmentHtml={render.result?.fragmentHtml ?? null}
                error={render.error}
            />
        </>
    )
}

export default ReferenceReportPage
