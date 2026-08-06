import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { readState } from './api'
import { gotoApp } from './report-actions'

/**
 * Per-user department scoping. The org-unit query is scoped to the user's
 * data-view subtree (`withinUserHierarchy` in `src/forms/fields/orgUnits.ts`),
 * so each report user reaches only their own country's department and not the
 * other's. **This is the spec the `withinUserHierarchy` regression breaks** —
 * drop that param and both users would reach every `{CC}_TEST_TEST` department.
 *
 * Each of these users has exactly one department, so the form states it as a
 * value rather than offering a picker. Asserting the collapsed value is a
 * *stronger* guard than opening a picker was: losing the scoping takes the
 * pickable count from one to many, which brings the multi-select back, so the
 * regression fails these tests on the control's very shape before any option
 * is inspected.
 */
const expectSoleDepartment = async (
    page: import('@playwright/test').Page,
    own: string,
    other: string
): Promise<void> => {
    const value = page.locator('[data-test="unitCodes-single"]')
    await expect(value).toBeVisible()
    await expect(value).toContainText(own)
    // Nowhere on the page, not merely absent from the value: an unscoped query
    // would surface the other country's department in a picker, and asserting
    // only on the value would miss it.
    await expect(page.getByText(other, { exact: false })).toHaveCount(0)
    // The multi-select is the shape a scoping regression produces.
    await expect(page.locator('[data-test="unitCodes"]')).toHaveCount(0)
}

test.describe('AT report user', () => {
    test.use({ storageState: userByKey('atReport').storageState })

    test('reports on the AT department, and cannot reach the CH one', async ({
        page,
    }) => {
        const { orgUnitDisplayNames } = readState()
        await gotoApp(page, '/reports/partner')
        await expectSoleDepartment(
            page,
            orgUnitDisplayNames.AT_TEST_TEST,
            orgUnitDisplayNames.CH_TEST_TEST
        )
    })
})

test.describe('CH report user', () => {
    test.use({ storageState: userByKey('chReport').storageState })

    test('reports on the CH department, and cannot reach the AT one', async ({
        page,
    }) => {
        const { orgUnitDisplayNames } = readState()
        await gotoApp(page, '/reports/partner')
        await expectSoleDepartment(
            page,
            orgUnitDisplayNames.CH_TEST_TEST,
            orgUnitDisplayNames.AT_TEST_TEST
        )
    })
})
