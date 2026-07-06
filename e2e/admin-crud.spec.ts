import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { userByKey } from './users'
import {
    NEOIPC_BASE,
    REFERENCE_DATA_FIXTURE,
    REFERENCE_DATA_CRUD_FIXTURE,
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
            isPlaceholderFixture(REFERENCE_DATA_CRUD_FIXTURE),
            'needs a real reference-data-crud.json fixture — see e2e/fixtures/README.md'
        )
        // Upload the distinct-content fixture, not `reference-data.json`: the seed
        // / global setup already stored those exact bytes, which the reporting
        // service dedups (the 409 case is its own test below).
        const displayName = `e2e-refdata-${Date.now().toString(36)}`
        await gotoApp(page, '/admin/reference-data')
        try {
            await page.locator('input[name="displayName"]').fill(displayName)
            await page
                .locator('input[name="file"]')
                .setInputFiles(REFERENCE_DATA_CRUD_FIXTURE)
            await page.getByRole('button', { name: 'Upload' }).click()

            const row = page.getByRole('row').filter({ hasText: displayName })
            await expect(row).toBeVisible()
            await row.getByRole('button', { name: 'Delete' }).click()
            await expect(
                page.getByRole('row').filter({ hasText: displayName })
            ).toHaveCount(0)
        } finally {
            // The fixture has fixed content; if the test dies between upload and
            // delete, the reporting service's content dedup would 409 every later
            // run's upload of the same bytes. Best-effort delete by this run's
            // displayName so a failed run still cleans up after itself.
            const list = await page.request.get(`${NEOIPC_BASE}/reference-data`)
            if (list.ok()) {
                const sets = (await list.json()) as {
                    id: string
                    displayName: string
                }[]
                for (const d of sets.filter(
                    (s) => s.displayName === displayName
                )) {
                    await page.request.delete(
                        `${NEOIPC_BASE}/admin/reference-data/${encodeURIComponent(
                            d.id
                        )}`
                    )
                }
            }
        }
    })

    test('reference-data upload rejects a byte-identical duplicate (409)', async ({
        page,
    }) => {
        test.skip(
            isPlaceholderFixture(REFERENCE_DATA_FIXTURE),
            'needs a real reference-data.json fixture — see e2e/fixtures/README.md'
        )
        // `reference-data.json`'s exact bytes are already stored (the seed's
        // benchmark, or the global-setup upload on an empty stack), so the
        // reporting service must reject re-uploading them. Driven at the API layer
        // via the page's authenticated request context — the dedup contract is
        // server-side, independent of the upload form's rendering.
        const res = await page.request.post(
            `${NEOIPC_BASE}/admin/reference-data`,
            {
                params: { displayName: `e2e-dup-${Date.now().toString(36)}` },
                headers: { 'Content-Type': 'application/json' },
                data: fs.readFileSync(REFERENCE_DATA_FIXTURE),
            }
        )
        expect(res.status()).toBe(409)
        expect((await res.json()).code).toBe('duplicate-reference-data')
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
