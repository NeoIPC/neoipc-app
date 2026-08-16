import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { userByKey } from './users'
import { readState } from './api'
import {
    gotoApp,
    setDataSource,
    setOutputFormat,
    setDateField,
    selectDepartment,
    clickGenerate,
    expectRenderedReport,
    expectDownload,
} from './report-actions'

/**
 * Partner report, JSON output: the department dataset the report is computed
 * from, downloadable so a partner can produce it now and render it later, or
 * render it somewhere without access to this instance.
 *
 * The round trip is the test. A download that merely arrives proves only that
 * bytes moved; what the feature claims is that those exact bytes are what the
 * upload path consumes, and the only way to establish that is to feed them
 * back and get a report out. It is also the one assertion that would catch the
 * two producers drifting apart — the JSON comes from the R script and the
 * rendered report from Quarto, so nothing else here compares them.
 *
 * Runs as the AT report user against synthetic patients seeded into
 * AT_TEST_TEST, with a 2020–2030 period that overlaps the seeded events.
 */
test.describe('partner report — JSON output', () => {
    test.use({ storageState: userByKey('atReport').storageState })

    test('downloads the dataset, which renders when uploaded back', async ({
        page,
    }, testInfo) => {
        const { orgUnitDisplayNames } = readState()

        await gotoApp(page, '/reports/partner')
        await selectDepartment(page, orgUnitDisplayNames.AT_TEST_TEST)
        await setDateField(page, 'reportingPeriodFrom', '2020-01-01')
        await setDateField(page, 'reportingPeriodTo', '2030-12-31')
        await setOutputFormat(page, 'json')

        // Selecting JSON forces online mode, so the upload source must now be
        // refused rather than merely hidden — that coupling is what keeps the
        // form from asking for a pairing the service declines.
        await expect(
            page.locator('input[name="mode"][value="dataFile"]')
        ).toBeDisabled()

        const [request, download] = await Promise.all([
            page.waitForRequest(
                (req) =>
                    req.url().includes('/partner-report') &&
                    req.method() === 'GET'
            ),
            expectDownload(page, () => clickGenerate(page)),
        ])
        expect(request.headers()['accept']).toContain('application/json')

        const downloaded = testInfo.outputPath('partner-data.json')
        await download.saveAs(downloaded)

        // Parse before re-uploading: a truncated or error-page body would still
        // upload, and the failure would then surface as an opaque render error
        // pointing at the wrong half of the round trip.
        const raw = await readFile(downloaded, 'utf8')
        expect(() => JSON.parse(raw) as unknown).not.toThrow()

        // Back to a rendered format first: the upload source stays disabled
        // while JSON is selected, and a same-URL goto only changes the hash, so
        // the form is still holding the choice made above. Re-selecting HTML is
        // also the path a user takes, and it exercises the coupling releasing
        // as well as engaging.
        await gotoApp(page, '/reports/partner')
        await setOutputFormat(page, 'html')
        await setDataSource(page, 'dataFile')
        await page.locator('input[name="dataFile"]').setInputFiles(downloaded)
        await clickGenerate(page)

        const report = await expectRenderedReport(page)
        await expect(report.locator('table').first()).toBeVisible()
    })
})
