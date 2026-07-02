import type { APIRequestContext } from '@playwright/test'

/**
 * Establish an authenticated DHIS2 session on `ctx` via **form login**, the
 * way the DHIS2 web UI does.
 *
 * Why form login and not Basic auth: DHIS2's API security is stateless
 * (`SessionCreationPolicy.NEVER`), so a Basic-auth API call never mints an
 * auth-bearing `JSESSIONID`. The NeoIPC-Reporting `/neoipc` mount
 * authenticates *only* by validating that cookie against DHIS2
 * (`Dhis2SessionAuthenticationHandler`), so a session is mandatory and it
 * must come from the same endpoint the UI posts to. On success DHIS2 sets an
 * authenticated `JSESSIONID` on `ctx`'s cookie jar; `ctx.storageState()`
 * then captures it for reuse as a browser `storageState`.
 *
 * The POST may 302 through the post-login redirect; the authoritative proof
 * the session authenticated is `/api/me` resolving as `username` (requested
 * as JSON so a *failed* login yields 401 rather than a redirect to the login
 * page).
 */
export async function dhis2FormLogin(
    ctx: APIRequestContext,
    username: string,
    password: string
): Promise<void> {
    await ctx.post('/dhis-web-commons-security/login.action', {
        form: { j_username: username, j_password: password },
    })
    const me = await ctx.get('/api/me', {
        headers: { Accept: 'application/json' },
        params: { fields: 'username' },
    })
    if (me.status() !== 200) {
        throw new Error(
            `DHIS2 form login failed for ${username}: /api/me returned ${me.status()}`
        )
    }
    const body = (await me.json()) as { username?: string }
    if (body.username !== username) {
        throw new Error(
            `DHIS2 session identity mismatch: expected ${username}, got ${body.username}`
        )
    }
}
