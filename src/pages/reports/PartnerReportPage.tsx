import i18n from '@dhis2/d2-i18n'
import React, { FC } from 'react'
import { renderPartnerReport } from '../../api/reports'
import PartnerReportForm, {
    PartnerReportFormValues,
} from '../../forms/PartnerReportForm'
import ReportResultPanel from '../../render/ReportResultPanel'
import { useReportRender } from '../../render/useReportRender'

// LEARN: Notice how THIN a page is. All the messy work — submit, loading state,
// timing, downloads, errors — lives in the useReportRender hook, and the fields
// live in the form. The page just wires them together. The Reference report page
// is the same shape. This split is why we have a hook; see docs/05 §5.4.
const PartnerReportPage: FC = () => {
    // LEARN: useReportRender returns { submit, loading, result, error, ... }.
    // We pass the per-report API function (renderPartnerReport) into it.
    const render = useReportRender<PartnerReportFormValues>(renderPartnerReport)
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
