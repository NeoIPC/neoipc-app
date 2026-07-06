import i18n from '@dhis2/d2-i18n'
import { Center, CircularLoader, NoticeBox } from '@dhis2/ui'
import React, { FC } from 'react'
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
 * counter (a large dataset can take a little while, so a static spinner
 * would read as "frozen" without the counter). On error we show a
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
                        {i18n.t('Rendering report... (elapsed {{seconds}}s)', {
                            seconds: elapsedSeconds,
                        })}
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
