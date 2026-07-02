import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { PARTNER_DATA_FIXTURE, isPlaceholderFixture } from './api'
import {
    gotoApp,
    setDataSource,
    setOutputFormat,
    clickGenerate,
    expectRenderedReport,
    expectPdfDownload,
} from './report-actions'

/**
 * Partner report, data-file mode: render from an uploaded partner-data JSON (no
 * org unit / period needed — the file is the data). Both output formats. Skipped
 * until a real `partner-data.json` is captured (see e2e/data/README.md).
 */
test.describe('partner report — data-file mode', () => {
    test.use({ storageState: userByKey('atReport').storageState })
    test.skip(
        isPlaceholderFixture(PARTNER_DATA_FIXTURE),
        'needs a real partner-data.json fixture — see e2e/data/README.md'
    )

    test('HTML output from an uploaded data file mounts a report fragment', async ({
        page,
    }) => {
        await gotoApp(page, '/reports/partner')
        await setDataSource(page, 'dataFile')
        await page
            .locator('input[name="dataFile"]')
            .setInputFiles(PARTNER_DATA_FIXTURE)
        await setOutputFormat(page, 'html')
        await clickGenerate(page)

        const report = await expectRenderedReport(page)
        await expect(report.locator('table').first()).toBeVisible()
    })

    test('PDF output from an uploaded data file triggers a download', async ({
        page,
    }) => {
        await gotoApp(page, '/reports/partner')
        await setDataSource(page, 'dataFile')
        await page
            .locator('input[name="dataFile"]')
            .setInputFiles(PARTNER_DATA_FIXTURE)
        await setOutputFormat(page, 'pdf')

        const download = await expectPdfDownload(page, () => clickGenerate(page))
        expect(download.suggestedFilename()).toMatch(
            /^NeoIPC-Surveillance-Partner-Report_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.pdf$/
        )
    })
})
