import { expect, type Page, type Locator, type Download } from '@playwright/test'
import { appUrl } from './api'

/** Generous ceiling for a backend (Quarto/R) render. */
export const RENDER_TIMEOUT = 12 * 60 * 1000

/**
 * Wait for an HTML render to finish, failing fast (and clearly) if the app shows
 * the "Report rendering failed" panel instead of the report fragment — otherwise
 * a render error hangs the spec until the full render timeout. Returns the report
 * container on success.
 */
export async function expectRenderedReport(
    page: Page,
    timeout = RENDER_TIMEOUT
): Promise<Locator> {
    const report = page.locator('#neoipc-rendered-report')
    const failure = page.getByText('Report rendering failed')
    const which = await Promise.race([
        report
            .waitFor({ state: 'visible', timeout })
            .then(() => 'report' as const)
            .catch(() => 'timeout' as const),
        failure
            .waitFor({ state: 'visible', timeout })
            .then(() => 'failed' as const)
            .catch(() => 'timeout' as const),
    ])
    if (which === 'failed') {
        throw new Error(
            'Report render failed — the app showed the "Report rendering failed" panel.'
        )
    }
    if (which === 'timeout') {
        throw new Error('Report render did not complete within the timeout.')
    }
    return report
}

/**
 * Trigger a PDF render and return the download, failing fast if the app shows the
 * "Report rendering failed" panel instead of firing a download.
 */
export async function expectPdfDownload(
    page: Page,
    trigger: () => Promise<void>,
    timeout = RENDER_TIMEOUT
): Promise<Download> {
    const failure = page.getByText('Report rendering failed')
    const downloadPromise = page.waitForEvent('download', { timeout })
    await trigger()
    const outcome = await Promise.race([
        downloadPromise
            .then((download) => ({ kind: 'download' as const, download }))
            .catch(() => ({ kind: 'timeout' as const })),
        failure
            .waitFor({ state: 'visible', timeout })
            .then(() => ({ kind: 'failed' as const }))
            .catch(() => ({ kind: 'timeout' as const })),
    ])
    if (outcome.kind === 'failed') {
        throw new Error(
            'PDF render failed — the app showed the "Report rendering failed" panel.'
        )
    }
    if (outcome.kind === 'timeout') {
        throw new Error('PDF download did not fire within the timeout.')
    }
    return outcome.download
}

/**
 * Navigate to an in-app HashRouter route (on the installed bundle) and wait
 * for the shell to mount — the left-nav renders once the `me` query and
 * reference metadata resolve. All e2e personas hold NeoIPC access, so at least
 * one menu item is always present.
 */
export async function gotoApp(page: Page, route: string): Promise<void> {
    await page.goto(appUrl(route))
    await expect(page.getByRole('menuitem').first()).toBeVisible()
}

/** Set the Partner-Report output format radio (`html` | `pdf`). */
export async function setOutputFormat(
    page: Page,
    format: 'html' | 'pdf'
): Promise<void> {
    await page.locator(`input[name="outputFormat"][value="${format}"]`).check()
}

/** Set the Partner-Report data-source radio (`online` | `dataFile`). */
export async function setDataSource(
    page: Page,
    mode: 'online' | 'dataFile'
): Promise<void> {
    await page.locator(`input[name="mode"][value="${mode}"]`).check()
}

/**
 * Set a `DateField` (which wraps `@dhis2/ui`'s `CalendarInput`) to an ISO
 * `YYYY-MM-DD` date and commit it to form state.
 *
 * `CalendarInput` only calls `onDateSelect` — the callback that flows into the
 * form via `DateField` — on blur, a calendar-cell pick, or Clear; typing (or a
 * raw `fill()`) updates the widget's internal `partialDate` only. So the fill
 * must be followed by a blur, or the form value stays empty and the period
 * filter is silently dropped from the request. The blur also closes the calendar
 * overlay (CalendarInput's own `setOpen(false)`), so each field commits
 * independently without relying on the next field's focus.
 */
export async function setDateField(
    page: Page,
    name: string,
    isoDate: string
): Promise<void> {
    const input = page.locator(`input[name="${name}"]`)
    await input.fill(isoDate)
    await input.blur()
}

/**
 * Open the department multiselect (`data-test="unitCodes"`) and select the
 * option carrying `deptDisplayName` (matched as a substring, since the option
 * label is "Hospital — Department" when `showParentInLabel` is set).
 */
export async function selectDepartment(
    page: Page,
    deptDisplayName: string
): Promise<void> {
    await page.locator('[data-test="unitCodes"]').click()
    await page
        .getByText(deptDisplayName, { exact: false })
        .first()
        .click()
    await page.keyboard.press('Escape')
}

/** Submit the report form via its primary Generate button. */
export async function clickGenerate(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Generate' }).click()
}

/**
 * Ensure the reference-dataset select (`data-test="referenceDataId"`) shows the
 * dataset carrying `displayName` (its label is "displayName — period", so a
 * substring text match identifies it).
 *
 * The form preselects the first saved dataset *asynchronously*, so the wanted one
 * usually surfaces on its own (in the select's value display and its summary
 * card). Wait for it — a retrying `waitFor`, not a point-in-time check, so the
 * decision doesn't race preselection — and return without touching the picker:
 * re-picking an already-selected `@dhis2/ui` option is a no-op that leaves the
 * menu (and its click-blocking backdrop) open, which then swallows the next
 * click. Only when a *different* dataset was preselected (the wanted label never
 * appears) do we open the menu and pick it. The option is matched inside
 * `#dhis2-portal-root`, where the open menu renders: `@dhis2/ui`'s
 * `SingleSelectOption` is a plain `<div>`, not an ARIA `option` (so
 * `getByRole('option')` never resolves), and scoping to the portal avoids
 * matching the value display, which sits behind the backdrop while the menu is
 * open. The trailing `Escape` guarantees the menu is closed even if the pick ever
 * lands on an already-selected option.
 */
export async function selectReferenceDataset(
    page: Page,
    displayName: string
): Promise<void> {
    const preselected = await page
        .getByText(displayName, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false)
    if (preselected) return
    await page.locator('[data-test="referenceDataId"]').click()
    await page
        .locator('#dhis2-portal-root')
        .getByText(displayName, { exact: false })
        .first()
        .click()
    await page.keyboard.press('Escape')
}
