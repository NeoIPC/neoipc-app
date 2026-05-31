import i18n from '@dhis2/d2-i18n'
import { Center, CircularLoader, NoticeBox } from '@dhis2/ui'
import React, { FC } from 'react'
// LEARN: A purely "presentational" component — it holds no state and contains no
// logic beyond choosing what to show: a spinner while loading, an error box, the
// rendered HTML, or nothing (the PDF case is a download handled elsewhere). It
// receives everything it needs as props from the page. docs/06 ("The render layer").
import InlineHtmlReport from './InlineHtmlReport'

interface ReportResultPanelProps {
    loading: boolean
    elapsedSeconds: number
    fragmentHtml: string | null
    error: Error | null
}

/**
 * Render the result region under a report form. While a request is
 * in flight we show a centred {@link CircularLoader} plus an elapsed
 * counter (renders can take 5–10 minutes, so a static spinner reads
 * as "frozen" without the counter). On error we show a
 * {@link NoticeBox} with the enriched message from
 * {@link useReportRender}. On success-with-fragment we mount
 * {@link InlineHtmlReport}; PDF success is handled out-of-band as a
 * browser download and does not surface in this panel.
 */
const ReportResultPanel: FC<ReportResultPanelProps> = ({
    loading,
    elapsedSeconds,
    fragmentHtml,
    error,
}) => {
    if (loading) {
        return (
            <Center>
                <div>
                    <CircularLoader />
                    <p>
                        {i18n.t(
                            'Rendering report... (elapsed {{seconds}}s — can take up to 10 minutes)',
                            { seconds: elapsedSeconds }
                        )}
                    </p>
                </div>
            </Center>
        )
    }
    if (error) {
        return (
            <NoticeBox error title={i18n.t('Report rendering failed')}>
                {error.message}
            </NoticeBox>
        )
    }
    if (fragmentHtml !== null) {
        return <InlineHtmlReport fragmentHtml={fragmentHtml} />
    }
    return null
}

export default ReportResultPanel
