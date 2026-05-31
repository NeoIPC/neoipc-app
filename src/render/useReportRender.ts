// LEARN: This custom hook is the shared "brain" of both report pages. It owns the
// whole submit → loading → result/error lifecycle so the pages stay tiny. It's a
// good tour of the less-common hooks: useRef (a value that survives renders without
// causing one — here a timer id) and useCallback (a stable function identity).
// Walk-through: docs/06 ("The render layer"); hooks recap: docs/03 §3.5.
import { useConfig } from '@dhis2/app-runtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NeoipcReportingError } from '../api/neoipcReporting'
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
 * UX in the result panel uses it to reassure the user that a 5–10
 * minute render is still alive.
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
                // LEARN: `rendered` is a discriminated union (docs/02 §2.9). After
                // this `=== 'pdf'` check TypeScript KNOWS `rendered` has .blob and
                // .suggestedFileName; in the else branch it knows .fragmentHtml.
                if (rendered.format === 'pdf') {
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

/**
 * Read the `Response` body of a {@link NeoipcReportingError} and fold
 * it into a richer `Error` message. The backend emits RFC 7807
 * `application/problem+json` with `title` + `detail` fields; falls
 * back to the raw text or the original error if the body can't be
 * parsed.
 */
const enrichError = async (err: unknown): Promise<Error> => {
    if (!(err instanceof NeoipcReportingError)) {
        return err instanceof Error ? err : new Error(String(err))
    }
    try {
        const contentType = err.response.headers.get('content-type') ?? ''
        if (contentType.includes('json')) {
            const body = (await err.response.json()) as {
                title?: string
                detail?: string
            }
            const parts = [body.title, body.detail].filter(Boolean)
            if (parts.length > 0) {
                return new Error(
                    `${err.response.status} ${err.response.statusText}: ${parts.join(' — ')}`
                )
            }
        } else {
            const text = await err.response.text()
            if (text) {
                return new Error(
                    `${err.response.status} ${err.response.statusText}: ${text.slice(0, 500)}`
                )
            }
        }
    } catch {
        // Falls through to the bare status-line error below.
    }
    return err
}
