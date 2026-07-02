import { test as setup } from '@playwright/test'
import fs from 'node:fs'
import { USERS, PLAY_USER_PASSWORD, AUTH_DIR } from './users'
import { dhis2FormLogin } from './dhis2-login'

/**
 * The `setup` project (see `playwright.config.ts`). One test per persona logs
 * that user in via DHIS2 form login and saves the resulting JSESSIONID session
 * as `storageState`; every engine project depends on this, so specs simply
 * point `test.use({ storageState })` at the right file.
 */
for (const user of USERS) {
    setup(`authenticate ${user.username}`, async ({ playwright, baseURL }) => {
        fs.mkdirSync(AUTH_DIR, { recursive: true })
        const ctx = await playwright.request.newContext({ baseURL })
        try {
            await dhis2FormLogin(ctx, user.username, PLAY_USER_PASSWORD)
            await ctx.storageState({ path: user.storageState })
        } finally {
            await ctx.dispose()
        }
    })
}
