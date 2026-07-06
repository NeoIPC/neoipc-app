import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import React, { FC, useEffect, useRef } from 'react'

/**
 * Container id the backend's fragment-mode transformer prefix-scopes
 * the report's CSS to (see
 * `tasks/neoipc-reporting-html-fragment-mode.md`). Has to match the
 * `container` parameter the backend emits in `Content-Type:
 * text/html; profile="neoipc-fragment"; container="#neoipc-rendered-report"`.
 */
export const REPORT_CONTAINER_ID = 'neoipc-rendered-report'

interface InlineHtmlReportProps {
    fragmentHtml: string
}

/**
 * Typeset the LaTeX math the report emits as literal `$$…$$` text.
 *
 * The math originates in gt table footnotes (`md("$$…$$")`), which gt passes
 * through as raw text — and Quarto's `minimal` HTML ships no math renderer of
 * its own (its MathJax loader lives in the stripped `<head>`), so the app
 * renders it here with bundled KaTeX: no CDN, CSP-safe. Only `$$`/`\[`/`\(`
 * delimiters are recognised (not bare `$`) to avoid mis-parsing stray dollar
 * signs in the report body. `throwOnError: false` renders a malformed formula
 * as its source rather than aborting the whole pass.
 */
const typesetMath = (container: HTMLElement): void => {
    try {
        renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false },
            ],
            throwOnError: false,
        })
    } catch (err) {
        console.error('Failed to typeset report math', err)
    }
}

/**
 * Render an HTML fragment returned by `fragmentMode=true` from the
 * NeoIPC-Reporting backend. The fragment has no `<html>`/`<head>`/
 * `<body>` wrappers and any `<style>` blocks are already prefix-scoped
 * to `#${REPORT_CONTAINER_ID}`.
 *
 * Two operations the backend can't do for us:
 *
 *   1. Inject the markup. We use `innerHTML` rather than React tree
 *      mounting because the fragment is opaque Quarto output — its
 *      tags / attribute names aren't React-compatible (`class` vs
 *      `className`, `tabindex` vs `tabIndex`, custom widget elements,
 *      etc.) and React would refuse to mount it.
 *   2. Re-execute scripts. Browsers don't execute `<script>` tags
 *      inserted via `innerHTML`; htmlwidgets (plotly, leaflet, DT)
 *      need their bootstraps to run, so we replace each with a fresh
 *      element. External `src` scripts get a load gate so subsequent
 *      inline scripts see their globals.
 *
 * If a future report ships interactive widgets that misbehave outside
 * their original document context, the fix is to wrap the container
 * in a Shadow DOM root — this component is the boundary.
 */
const InlineHtmlReport: FC<InlineHtmlReportProps> = ({ fragmentHtml }) => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let cancelled = false
        container.innerHTML = fragmentHtml
        typesetMath(container)

        const reExecute = async () => {
            const scripts = Array.from(container.querySelectorAll('script'))
            for (const original of scripts) {
                if (cancelled) return
                await replaceScript(original)
            }
        }

        reExecute().catch((err) => {
            console.error('Failed re-executing report scripts', err)
        })

        return () => {
            cancelled = true
            container.innerHTML = ''
        }
    }, [fragmentHtml])

    return <div id={REPORT_CONTAINER_ID} ref={containerRef} />
}

const replaceScript = (original: HTMLScriptElement): Promise<void> => {
    const replacement = document.createElement('script')
    for (const { name, value } of Array.from(original.attributes)) {
        replacement.setAttribute(name, value)
    }
    replacement.text = original.text

    const isExternal = original.hasAttribute('src')
    const gate = isExternal
        ? new Promise<void>((resolve) => {
              const settle = () => resolve()
              replacement.addEventListener('load', settle, { once: true })
              replacement.addEventListener('error', settle, { once: true })
          })
        : Promise.resolve()

    original.parentNode?.replaceChild(replacement, original)
    return gate
}

export default InlineHtmlReport
