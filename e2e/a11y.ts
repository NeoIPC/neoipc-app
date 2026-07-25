import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASELINE_PATH = path.join(__dirname, 'a11y-baseline.json')

/**
 * Triaged accessibility baseline: axe rule ids that are known @dhis2/ui vendor
 * issues the app renders but does not own. A violation of a listed rule is
 * tolerated; anything else fails the gate.
 */
interface A11yBaseline {
    ignoredRules: string[]
}

function loadBaseline(): A11yBaseline {
    if (!fs.existsSync(BASELINE_PATH)) return { ignoredRules: [] }
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline
}

/**
 * Run axe-core (WCAG 2.1 level A + AA) against the current page state and fail
 * only on violations whose rule id is NOT in the triaged baseline. The baseline
 * exists because much of the rendered DOM comes from `@dhis2/ui` vendor
 * components the app does not control — their rule ids are triaged in once, so
 * the gate catches only NEW, in-our-control regressions rather than drowning in
 * vendor noise. The complete violation set is attached to the test as
 * `axe-<label>` for review regardless of pass/fail.
 *
 * On a fresh baseline (`ignoredRules: []`) the first run is expected to fail and
 * list every current violation — that output is the triage worklist: fix what is
 * ours, and move genuine vendor rule ids into `e2e/a11y-baseline.json`.
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

    const { ignoredRules } = loadBaseline()
    const unexpected = violations
        .filter((v) => !ignoredRules.includes(v.id))
        .map((v) => `${v.id} [${v.impact}] ${v.nodes.length} node(s): ${v.help}`)

    expect(
        unexpected,
        `New WCAG 2.1 AA violation(s) on ${label}. Fix them; if a rule is a ` +
            `@dhis2/ui vendor issue outside the app's control, triage its id into ` +
            `e2e/a11y-baseline.json (ignoredRules) with a justifying note.`
    ).toEqual([])
}
