import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { setUiLocale, clearUiLocale } from './api'
import { gotoApp } from './report-actions'

/**
 * DHIS2 UI-locale switch. Changing the user's `keyUiLocale` and reloading makes
 * the app shell re-read it (`useLocale`) and `i18n.changeLanguage`, so the one
 * translated nav label ("Partner Report" → "Partner-Auswertung", the single
 * `de.po` entry) flips. The setting is read at app load, hence the reload.
 */
test.describe('UI locale switch', () => {
    test.use({ storageState: userByKey('atReport').storageState })

    // Restore the instance default so reruns start from English.
    test.afterEach(async ({ request }) => {
        await clearUiLocale(request)
    })

    test('German locale translates the Partner Report nav label', async ({
        page,
        request,
    }) => {
        await gotoApp(page, '/reports/partner')
        await expect(
            page.getByRole('menuitem', { name: 'Partner Report' })
        ).toBeVisible()

        await setUiLocale(request, 'de')
        await page.reload()

        await expect(
            page.getByRole('menuitem', { name: 'Partner-Auswertung' })
        ).toBeVisible()
        await expect(
            page.getByRole('menuitem', { name: 'Partner Report' })
        ).toHaveCount(0)
    })
})
