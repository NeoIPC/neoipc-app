import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASELINE_PATH = path.join(__dirname, 'a11y-baseline.json')

/**
 * One tolerated accessibility violation: an axe rule that fails inside a
 * specific third-party component, identified by that component's own stable
 * `data-test` hook — not by page region, and not by the offending element's own
 * selector.
 *
 * Anchoring to the component keeps the tolerance narrow in both directions. It
 * survives the app rendering another instance of the component (a new nav entry
 * hits the very same vendor defect, so the gate does not turn red merely for
 * adding a menu item), while any *other* rule on that component — and every rule
 * everywhere else on the page, including the app's own chrome inside `<header>`
 * and `<nav>` — still fails.
 */
interface ToleratedVendorNode {
    /** axe rule id, e.g. `button-name`. */
    rule: string
    /** CSS selector of the vendor component the offending node is, or sits in. */
    within: string
    /** Which component is at fault, and why the app cannot fix it. */
    note: string
}

interface A11yBaseline {
    ignored: ToleratedVendorNode[]
}

function loadBaseline(): A11yBaseline {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline
}

/**
 * The single CSS selector axe used to point at a violating node, or `null` when
 * the node cannot be addressed by one — axe reports a node reached through an
 * iframe or a shadow root as a multi-step selector path. `null` never matches a
 * baseline entry, so an un-addressable node fails the gate instead of slipping
 * through it.
 */
function selectorFor(target: readonly unknown[]): string | null {
    return target.length === 1 && typeof target[0] === 'string'
        ? target[0]
        : null
}

/**
 * Run axe-core (WCAG 2.1 level A + AA) over the **whole page** and fail on every
 * violation node except those the baseline attributes to a known `@dhis2/ui`
 * component defect. No region is excluded from the scan: the shell chrome the app
 * owns — the hamburger button, the `<nav>` wrapper, anything later added beside
 * them — is audited like the page content, so an app-introduced regression is
 * caught wherever it lands. Tolerance is granted per vendor component (see
 * {@link ToleratedVendorNode}), never per rule and never per region.
 *
 * Scope caveat: axe can only see the DOM as it stands when this runs. Markup that
 * is *absent* rather than hidden — a collapsed `CollapsibleSection` renders
 * `{open && children}`, a dialog that has not been opened, a menu that has not
 * been expanded — is not audited. Callers are responsible for bringing the state
 * they care about into the DOM first; `a11y.spec.ts` expands every disclosure
 * before calling. Unexercised states (validation-error rendering, calendar
 * overlays, select popovers) remain uncovered.
 *
 * The complete violation set is attached as `axe-<label>` for review regardless
 * of pass or fail.
 *
 * @param label stable identifier for the checked view (the route) — used as the
 *   attachment name and in the failure message.
 */
export async function expectNoNewA11yViolations(
    page: Page,
    testInfo: TestInfo,
    label: string
): Promise<void> {
    const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

    await testInfo.attach(`axe-${label}`, {
        body: JSON.stringify(violations, null, 2),
        contentType: 'application/json',
    })

    const { ignored } = loadBaseline()
    const nodes = violations.flatMap((violation) =>
        violation.nodes.map((node) => ({
            rule: violation.id,
            impact: violation.impact,
            help: violation.help,
            selector: selectorFor(node.target),
        }))
    )

    // Ask the page which of the baseline's vendor components each violating node
    // sits inside. Read-only observation — querySelector and closest inspect the
    // DOM axe just scanned without altering it.
    const containedBy = await page.evaluate(
        ({ selectors, containers }) =>
            selectors.map((selector) => {
                if (selector === null) return []
                let element: Element | null = null
                try {
                    element = document.querySelector(selector)
                } catch {
                    return []
                }
                if (element === null) return []
                const found = element
                return containers.filter(
                    (container) => found.closest(container) !== null
                )
            }),
        {
            selectors: nodes.map((node) => node.selector),
            containers: [...new Set(ignored.map((entry) => entry.within))],
        }
    )

    const offending = nodes
        .filter(
            (node, index) =>
                !ignored.some(
                    (entry) =>
                        entry.rule === node.rule &&
                        containedBy[index].includes(entry.within)
                )
        )
        .map(
            (node) =>
                `${node.rule} [${node.impact}] ` +
                `${node.selector ?? '<node not addressable by a single selector>'}` +
                ` — ${node.help}`
        )

    expect(
        offending,
        `WCAG 2.1 AA violation(s) on ${label} not covered by the baseline. Fix ` +
            `them in the app's markup; only if a node is a @dhis2/ui component ` +
            `defect outside the app's control, add a { rule, within, note } entry ` +
            `to e2e/a11y-baseline.json, where "within" is that component's own ` +
            `data-test selector.`
    ).toEqual([])
}
