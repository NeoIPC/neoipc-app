import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { gotoApp } from './report-actions'

/**
 * Authority-driven left-nav filtering (`visibleCategories` in
 * `src/menu/categories.tsx`): the two report items require `F_NEOIPC_REPORT`,
 * the two admin items require `F_NEOIPC_ADMIN`. A Superuser (`ALL`) sees all
 * four; a report-only user sees the two report items and neither admin item.
 */

const ALL_ITEMS = [
    'Partner Report',
    'Reference Report',
    'Reference data',
    'Validation exceptions',
]

test.describe('superadmin', () => {
    test.use({ storageState: userByKey('superadmin').storageState })

    test('sees all four nav categories', async ({ page }) => {
        await gotoApp(page, '/reports/partner')
        for (const name of ALL_ITEMS) {
            await expect(page.getByRole('menuitem', { name })).toBeVisible()
        }
    })
})

test.describe('report-only user', () => {
    test.use({ storageState: userByKey('atReport').storageState })

    test('sees the two report items and neither admin item', async ({
        page,
    }) => {
        await gotoApp(page, '/reports/partner')
        await expect(
            page.getByRole('menuitem', { name: 'Partner Report' })
        ).toBeVisible()
        await expect(
            page.getByRole('menuitem', { name: 'Reference Report' })
        ).toBeVisible()
        await expect(
            page.getByRole('menuitem', { name: 'Reference data' })
        ).toHaveCount(0)
        await expect(
            page.getByRole('menuitem', { name: 'Validation exceptions' })
        ).toHaveCount(0)
    })
})
