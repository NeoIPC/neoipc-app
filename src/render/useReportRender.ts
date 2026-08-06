import { useConfig } from '@dhis2/app-runtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { enrichError } from '../api/problemDetails'
import { downloadBlob, RenderResult } from '../api/reports'

interface UseReportRenderState {
    loading: boolean
    elapsedSeconds: number
    result: Extract<RenderResult, { format: 'html' }> | null
    error: Error | null
}

interface UseReportRender<TValues> extends UseReportRenderState {
    submit: (values: TValues) => Promise<void>
    reset: () => void
}

/**
 * Shared submit / loading / result / error orchestration for the
 * report pages. Wraps the per-report `render*Report` from
 * `src/api/reports.ts`:
 *
 *   - PDF responses are routed straight into a browser download via
 *     {@link downloadBlob} and never surface as `result`.
 *   - HTML responses are stored in `result` so the page can render
 *     them via `<InlineHtmlReport>`.
 *   - Errors are stored in `error` for inline display. `Response`
 *     bodies on `NeoipcReportingError` are read to enrich the
 *     message — the backend uses RFC 7807 `application/problem+json`
 *     so the body is short and human-friendly.
 *
 * `elapsedSeconds` ticks every second while loading; the long-poll
 * UX in the result panel uses it to reassure the user that a slow
 * render (a large dataset) is still alive.
 */
export const useReportRender = <TValues>(
    render: (baseUrl: string, values: TValues) => Promise<RenderResult>
): UseReportRender<TValues> => {
    const { baseUrl } = useConfig()
    const [state, setState] = useState<UseReportRenderState>({
        loading: false,
        elapsedSeconds: 0,
        result: null,
        error: null,
    })
    const intervalRef = useRef<number | null>(null)

    const stopTimer = useCallback(() => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }, [])

    useEffect(() => stopTimer, [stopTimer])

    const submit = useCallback(
        async (values: TValues) => {
            stopTimer()
            const start = Date.now()
            setState({
                loading: true,
                elapsedSeconds: 0,
                result: null,
                error: null,
            })
            intervalRef.current = window.setInterval(() => {
                setState((s) =>
                    s.loading
                        ? {
                              ...s,
                              elapsedSeconds: Math.floor(
                                  (Date.now() - start) / 1000
                              ),
                          }
                        : s
                )
            }, 1000)

            try {
                const rendered = await render(baseUrl, values)
                stopTimer()
                if (rendered.format !== 'html') {
                    downloadBlob(rendered.blob, rendered.suggestedFileName)
                    setState({
                        loading: false,
                        elapsedSeconds: 0,
                        result: null,
                        error: null,
                    })
                } else {
                    setState({
                        loading: false,
                        elapsedSeconds: 0,
                        result: rendered,
                        error: null,
                    })
                }
            } catch (err) {
                stopTimer()
                setState({
                    loading: false,
                    elapsedSeconds: 0,
                    result: null,
                    error: await enrichError(err),
                })
            }
        },
        [baseUrl, render, stopTimer]
    )

    const reset = useCallback(() => {
        stopTimer()
        setState({
            loading: false,
            elapsedSeconds: 0,
            result: null,
            error: null,
        })
    }, [stopTimer])

    return { ...state, submit, reset }
}
