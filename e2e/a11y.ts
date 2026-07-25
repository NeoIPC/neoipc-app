import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASELINE_PATH = path.join(__dirname, 'a11y-baseline.json')

/**
 * One tolerated violation *node*: a specific axe rule failing on a specific
 * element, identified by a distinctive substring of that node's target selector.
 * Keyed per node (not per rule) on purpose — ignoring a whole rule id would
 * silence it for all future markup too, whereas this tolerates only the exact
 * known element and still fails the gate on any new violation, including the
 * same rule on a different node.
 */
interface IgnoredNode {
    /** axe rule id, e.g. "button-name". */
    rule: string
    /** Substring that must appear in the node's target selector to match. */
    selector: string
    /** Why this node is tolerated (which vendor component, and why unfixable here). */
    note: string
}

interface A11yBaseline {
    ignored: IgnoredNode[]
}

function loadBaseline(): A11yBaseline {
    if (!fs.existsSync(BASELINE_PATH)) return { ignored: [] }
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline
}

/**
 * Run axe-core (WCAG 2.1 level A + AA) and fail on any violation node not covered
 * by the triaged baseline. Everything is audited except the two `@dhis2/ui` shell
 * regions whose a11y is fixable only in the component library — the HeaderBar
 * (`<header>`) and the left-nav `<Menu>` (`<nav>`); the app's own chrome (the
 * hamburger button) and page content stay in scope, so an app-introduced
 * regression is caught. The `ignored` baseline is a secondary, per-node net (rule
 * id + distinctive selector substring) for a residual vendor node — kept per node,
 * never per rule, so it never silences a rule for future markup. The complete
 * violation set is attached as `axe-<label>` for review regardless of pass/fail.
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
        // Exclude the two @dhis2/ui shell regions whose a11y is fixable only in the
        // component library: the HeaderBar (<header>) and the left-nav <Menu> (<nav>).
        // Everything else — the app's own hamburger button and the page content —
        // stays audited, so a new app-introduced violation still fails the gate.
        .exclude('header')
        .exclude('nav')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

    await testInfo.attach(`axe-${label}`, {
        body: JSON.stringify(violations, null, 2),
        contentType: 'application/json',
    })

    const { ignored } = loadBaseline()
    const offending: string[] = []
    for (const v of violations) {
        for (const node of v.nodes) {
            const target = (node.target ?? []).join(' ')
            const tolerated = ignored.some(
                (e) => e.rule === v.id && target.includes(e.selector)
            )
            if (!tolerated) {
                offending.push(`${v.id} [${v.impact}] ${target} — ${v.help}`)
            }
        }
    }

    expect(
        offending,
        `WCAG 2.1 AA violation(s) on ${label} not in the baseline. Fix them in the ` +
            `app's markup; only if a node is a @dhis2/ui vendor issue outside the ` +
            `app's control, add a { rule, selector, note } entry to ` +
            `e2e/a11y-baseline.json (ignored) targeting that exact node.`
    ).toEqual([])
}
