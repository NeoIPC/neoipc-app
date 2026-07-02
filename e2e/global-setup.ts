import { request } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { dhis2FormLogin } from './dhis2-login'
import {
    installApp,
    assertSeeded,
    orgUnitDisplayName,
    uploadReferenceData,
    writeState,
    isPlaceholderFixture,
    REFERENCE_DATA_FIXTURE,
    type E2EState,
} from './api'

/**
 * One-time, engine-independent setup, run once before all projects:
 *  1. install the built app bundle into DHIS2;
 *  2. assert the play seed (departments + report users) is present;
 *  3. resolve seeded department displayNames for the picker spec;
 *  4. upload the reference-dataset fixture (reference-report.spec consumes it;
 *     global teardown deletes it).
 *
 * All of it runs under one DHIS2 admin session. The DHIS2 root superuser
 * (`ALL`) satisfies both NeoIPC authority tiers (see NeoIPC-Reporting
 * `Program.cs`), so the same session installs the app *and* uploads via the
 * `F_NEOIPC_ADMIN`-gated `/neoipc` admin endpoint.
 */
async function globalSetup(): Promise<void> {
    const baseURL = process.env.DHIS2_BASE_URL ?? 'http://localhost:8080'

    // Safety gate: the suite mutates DHIS2 state (installs the app bundle,
    // uploads/deletes reference data, CRUDs the validation-exceptions singleton)
    // with default synthetic/demo credentials. Refuse a non-local target unless
    // explicitly opted in, so an errant DHIS2_BASE_URL can't drive destructive
    // setup against a shared or production stack.
    const { hostname } = new URL(baseURL)
    const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '[::1]'
    if (!isLocal && process.env.E2E_ALLOW_NONLOCAL !== 'true') {
        throw new Error(
            `Refusing to run the e2e suite against non-local DHIS2_BASE_URL ` +
                `"${baseURL}": it mutates state with default synthetic ` +
                `credentials. Set E2E_ALLOW_NONLOCAL=true to override.`
        )
    }

    const adminUser = process.env.DHIS2_ADMIN_USER ?? 'admin'
    const adminPass = process.env.DHIS2_ADMIN_PASS ?? 'district'

    const ctx = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
    try {
        await dhis2FormLogin(ctx, adminUser, adminPass)

        const appDir = path.resolve(__dirname, '..')
        const pkg = JSON.parse(
            fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')
        ) as { name: string; version: string }
        const bundlePath = path.join(
            appDir,
            'build',
            'bundle',
            `${pkg.name}-${pkg.version}.zip`
        )
        await installApp(ctx, bundlePath)

        await assertSeeded(ctx)

        const orgUnitDisplayNames = {
            AT_TEST_TEST: await orgUnitDisplayName(ctx, 'AT_TEST_TEST'),
            CH_TEST_TEST: await orgUnitDisplayName(ctx, 'CH_TEST_TEST'),
        }

        // Upload the reference-dataset fixture unless it is still a placeholder
        // (real datasets must be captured from a seeded stack — see
        // e2e/data/README.md); reference-report.spec skips when it is absent. A
        // per-run displayName keeps parallel/repeat runs from colliding.
        let referenceFixture: E2EState['referenceFixture'] = null
        if (!isPlaceholderFixture(REFERENCE_DATA_FIXTURE)) {
            const runId = Date.now().toString(36)
            const displayName = `e2e-reference-${runId}`
            const id = await uploadReferenceData(
                ctx,
                displayName,
                fs.readFileSync(REFERENCE_DATA_FIXTURE)
            )
            referenceFixture = { id, displayName }
        }

        writeState({ referenceFixture, orgUnitDisplayNames })
    } finally {
        await ctx.dispose()
    }
}

export default globalSetup
