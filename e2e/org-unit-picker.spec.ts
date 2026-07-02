import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { readState } from './api'
import { gotoApp } from './report-actions'

/**
 * Per-user department-picker scoping. The picker query is scoped to the user's
 * data-view subtree (`withinUserHierarchy` in `src/forms/fields/orgUnits.ts`),
 * so each report user sees only their own country's department and not the
 * other's. **This is the spec the `withinUserHierarchy` regression breaks** —
 * drop that param and both users would see every `{CC}_TEST_TEST` department.
 *
 * The picker is visible in the form's default online mode; opening it renders
 * the (single, hierarchy-scoped) department option.
 */
test.describe('AT report user', () => {
    test.use({ storageState: userByKey('atReport').storageState })

    test('picker shows the AT department, not the CH department', async ({
        page,
    }) => {
        const { orgUnitDisplayNames } = readState()
        await gotoApp(page, '/reports/partner')
        await page.locator('[data-test="unitCodes"]').click()
        await expect(
            page.getByText(orgUnitDisplayNames.AT_TEST_TEST, { exact: false })
        ).toBeVisible()
        await expect(
            page.getByText(orgUnitDisplayNames.CH_TEST_TEST, { exact: false })
        ).toHaveCount(0)
    })
})

test.describe('CH report user', () => {
    test.use({ storageState: userByKey('chReport').storageState })

    test('picker shows the CH department, not the AT department', async ({
        page,
    }) => {
        const { orgUnitDisplayNames } = readState()
        await gotoApp(page, '/reports/partner')
        await page.locator('[data-test="unitCodes"]').click()
        await expect(
            page.getByText(orgUnitDisplayNames.CH_TEST_TEST, { exact: false })
        ).toBeVisible()
        await expect(
            page.getByText(orgUnitDisplayNames.AT_TEST_TEST, { exact: false })
        ).toHaveCount(0)
    })
})
