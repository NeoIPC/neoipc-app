import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { readState } from './api'
import {
    gotoApp,
    setDataSource,
    setOutputFormat,
    selectDepartment,
    clickGenerate,
    expectRenderedReport,
    expectPdfDownload,
} from './report-actions'

/**
 * Partner report, online mode (pulls current DHIS2 data): HTML output mounts the
 * inline Quarto fragment; PDF output triggers a blob download. Runs as the AT
 * report user against synthetic patients seeded into AT_TEST_TEST.
 *
 * The reporting period is deliberately wide so it overlaps the seeded events.
 * first-run: narrow it (and confirm the CalendarInput accepts a typed ISO date)
 * once the demo-data date range is known — see scripts/Build-Dhis2DemoData.ps1.
 */
test.describe('partner report — online mode', () => {
    test.use({ storageState: userByKey('atReport').storageState })

    test('HTML output mounts an inline report fragment with a table', async ({
        page,
    }) => {
        const { orgUnitDisplayNames } = readState()
        await gotoApp(page, '/reports/partner')
        await setDataSource(page, 'online')
        await selectDepartment(page, orgUnitDisplayNames.AT_TEST_TEST)
        await page.locator('input[name="reportingPeriodFrom"]').fill('2020-01-01')
        await page.locator('input[name="reportingPeriodTo"]').fill('2030-12-31')
        await setOutputFormat(page, 'html')
        await clickGenerate(page)

        const report = await expectRenderedReport(page)
        await expect(report.locator('table').first()).toBeVisible()
    })

    test('PDF output triggers a PDF download', async ({ page }) => {
        const { orgUnitDisplayNames } = readState()
        await gotoApp(page, '/reports/partner')
        await setDataSource(page, 'online')
        await selectDepartment(page, orgUnitDisplayNames.AT_TEST_TEST)
        await page.locator('input[name="reportingPeriodFrom"]').fill('2020-01-01')
        await page.locator('input[name="reportingPeriodTo"]').fill('2030-12-31')
        await setOutputFormat(page, 'pdf')

        const download = await expectPdfDownload(page, () => clickGenerate(page))
        // Backend Content-Disposition: NeoIPC-Surveillance-<report>_<yyyy-MM-dd_HH-mm-ss>.pdf
        // (ExternalProcessReportProducer.GetFileDownloadName) — not the app's fallback name.
        expect(download.suggestedFilename()).toMatch(
            /^NeoIPC-Surveillance-Partner-Report_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.pdf$/
        )
    })
})
