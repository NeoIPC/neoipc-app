import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import {
    REFERENCE_DATA_FIXTURE,
    VALIDATION_EXCEPTIONS_FIXTURE,
    isPlaceholderFixture,
} from './api'
import { gotoApp } from './report-actions'

/**
 * Admin CRUD as the superadmin (`ALL` satisfies `F_NEOIPC_ADMIN`). Two resource
 * models:
 *  - reference-data is a **list** (`AdminListPage`): upload prepends a row,
 *    per-row Delete removes it;
 *  - validation-exceptions is a **singleton** (`AdminSingletonPage`): upload
 *    shows a "Current file" card, Remove restores the empty state.
 */
test.describe('admin CRUD', () => {
    test.use({ storageState: userByKey('superadmin').storageState })

    test('reference-data list: upload adds a row, delete removes it', async ({
        page,
    }) => {
        test.skip(
            isPlaceholderFixture(REFERENCE_DATA_FIXTURE),
            'needs a real reference-data.json fixture — see e2e/fixtures/README.md'
        )
        const displayName = `e2e-refdata-${Date.now().toString(36)}`
        await gotoApp(page, '/admin/reference-data')
        await page.locator('input[name="displayName"]').fill(displayName)
        await page
            .locator('input[name="file"]')
            .setInputFiles(REFERENCE_DATA_FIXTURE)
        await page.getByRole('button', { name: 'Upload' }).click()

        const row = page.getByRole('row').filter({ hasText: displayName })
        await expect(row).toBeVisible()
        await row.getByRole('button', { name: 'Delete' }).click()
        await expect(
            page.getByRole('row').filter({ hasText: displayName })
        ).toHaveCount(0)
    })

    test('validation-exceptions singleton: upload shows the file, remove clears it', async ({
        page,
    }) => {
        const displayName = `e2e-valex-${Date.now().toString(36)}`
        await gotoApp(page, '/admin/validation-exceptions')
        await page.locator('input[name="displayName"]').fill(displayName)
        await page
            .locator('input[name="file"]')
            .setInputFiles(VALIDATION_EXCEPTIONS_FIXTURE)
        // Button reads "Upload" (no current file) or "Replace" (one already
        // exists from a prior run) — either way it submits the upload form.
        await page.getByRole('button', { name: /^(Upload|Replace)$/ }).click()

        await expect(page.getByText(displayName)).toBeVisible()
        await page.getByRole('button', { name: 'Remove' }).click()
        await expect(
            page.getByText('No validation exception file uploaded.')
        ).toBeVisible()
    })
})
