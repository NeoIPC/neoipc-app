import i18n from '@dhis2/d2-i18n'
import React, { FC, useEffect } from 'react'
import { useAppContext } from '../../AppContext'
import { renderPartnerReport } from '../../api/reports'
import PartnerReportForm, {
    PartnerReportFormValues,
} from '../../forms/PartnerReportForm'
import ReportResultPanel from '../../render/ReportResultPanel'
import { useReportRender } from '../../render/useReportRender'

const PartnerReportPage: FC = () => {
    const render = useReportRender<PartnerReportFormValues>(renderPartnerReport)
    const { reloadReferenceDataSets } = useAppContext()
    // Refresh the benchmark listing on entry so datasets uploaded out of band
    // (the play seed, another admin's session) appear without a full reload —
    // AppContext otherwise fetches the list once at startup.
    useEffect(() => {
        void reloadReferenceDataSets().catch(() => {})
    }, [reloadReferenceDataSets])
    return (
        <>
            <h1>{i18n.t('Partner Report')}</h1>
            <PartnerReportForm
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

export default PartnerReportPage
