import { test } from '@playwright/test'
import { userByKey } from './users'
import { gotoApp } from './report-actions'
import { expectNoNewA11yViolations } from './a11y'

/**
 * Accessibility gate: axe-core (WCAG 2.1 A + AA) over the app's main routes, per
 * persona (routes are authority-scoped, so the admin covers the admin views the
 * report user cannot reach). Fails only on violations not in the triaged vendor
 * baseline (see `e2e/a11y.ts` + `a11y-baseline.json`), so it catches regressions
 * in the app's own markup without drowning in `@dhis2/ui` vendor noise.
 */
test.describe('accessibility — axe / WCAG 2.1 AA', () => {
    // axe evaluates the rendered DOM, which is identical across the three engine
    // cores — so run these once (chromium) rather than redundantly per engine.
    test.skip(
        ({ browserName }) => browserName !== 'chromium',
        'a11y is engine-independent; runs once on chromium'
    )

    test.describe('report user (play.at.report1)', () => {
        test.use({ storageState: userByKey('atReport').storageState })
        for (const route of ['/reports/partner', '/reports/reference']) {
            test(`no new violations: ${route}`, async ({ page }, testInfo) => {
                await gotoApp(page, route)
                await expectNoNewA11yViolations(page, testInfo, route)
            })
        }
    })

    test.describe('admin user (play.admin)', () => {
        test.use({ storageState: userByKey('superadmin').storageState })
        for (const route of [
            '/reports/partner',
            '/reports/reference',
            '/admin/reference-data',
            '/admin/validation-exceptions',
        ]) {
            test(`no new violations: ${route}`, async ({ page }, testInfo) => {
                await gotoApp(page, route)
                await expectNoNewA11yViolations(page, testInfo, route)
            })
        }
    })
})
