import type { APIRequest, APIRequestContext } from '@playwright/test'

/**
 * Establish an authenticated DHIS2 session and return the `APIRequestContext`
 * that carries it, so its `JSESSIONID` can drive further admin calls or be
 * captured as a browser `storageState`.
 *
 * The login endpoint is version-dependent: DHIS2 2.41+ authenticate JSON
 * credentials at `POST /api/auth/login`; 2.40 has only the legacy Struts
 * form-login at `POST /dhis-web-commons-security/login.action` (removed by the
 * 2.42 "strutsless" migration, and its session is no longer honoured by the
 * `/api/**` chain on 2.41 — hence the modern endpoint is required there). We try
 * the modern endpoint first and fall back to the legacy form, so one helper
 * spans the supported range. **Each attempt runs in its own fresh context**, so a
 * dead session from a failed attempt cannot linger into the next, and any error
 * is contained to that attempt before falling through to the fallback.
 *
 * DHIS2 hands out a `JSESSIONID` whether or not the credentials were accepted, so
 * the only proof of authentication is `GET /api/me` resolving to the expected
 * `username`. That proof sends `X-Requested-With: XMLHttpRequest` (and does not
 * follow redirects): an *unauthenticated* `/api/me` then answers a clean 401
 * instead of 302-redirecting to the login page (HTTP 200 HTML), which would
 * otherwise read back as a false success and crash `.json()` on the HTML body. On
 * 2.40 the absent `/api/auth/login` likewise 302s to that HTML (followed to a
 * 200), so gating on this proof — not on the modern POST's own status — is what
 * makes the legacy fallback actually run.
 *
 * Why a credential login and not Basic auth: the reporting `/neoipc` mount
 * authenticates only by validating the `JSESSIONID` against DHIS2
 * (`Dhis2SessionAuthenticationHandler`), so an auth-bearing session cookie is
 * mandatory and must come from a real login.
 *
 * @param request  A Playwright `APIRequest` (e.g. the top-level `request` import
 *   or a test's `playwright.request`) used to mint the per-attempt contexts.
 * @param baseURL  DHIS2 origin the requests resolve against.
 * @returns The authenticated context (caller owns it and must `dispose()` it).
 * @throws If neither endpoint authenticates the given credentials.
 */
export async function dhis2Login(
    request: APIRequest,
    baseURL: string,
    username: string,
    password: string
): Promise<APIRequestContext> {
    const diagnostics: string[] = []
    for (const modern of [true, false]) {
        // ignoreHTTPSErrors: local DHIS2 stacks commonly serve a self-signed cert
        // on https, so the login round-trip must tolerate it.
        const ctx = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
        const label = modern ? 'modern POST /api/auth/login' : 'legacy form-login'
        try {
            const loginStatus = modern
                ? await tryModernLogin(ctx, username, password)
                : await tryLegacyLogin(ctx, username, password)
            const proof = await proveSession(ctx, username)
            diagnostics.push(`${label}: login HTTP ${loginStatus}, /api/me ${proof.detail}`)
            // The /api/me proof is decisive; `loginStatus < 400` is a secondary
            // guard. On 2.40 the absent /api/auth/login 302s to the login page
            // (followed to HTTP 200), so status alone can't distinguish it — but a
            // login that actively errored (4xx/5xx) while a stray session read as
            // authenticated must not score a success.
            if (proof.authenticated && loginStatus < 400) return ctx
        } catch (err) {
            // A transport-level failure (timeout, ECONNRESET, connection refused)
            // rejects the login POST/storageState; record it and fall through to
            // the next endpoint rather than aborting the whole helper.
            diagnostics.push(`${label}: threw ${err instanceof Error ? err.message : String(err)}`)
        }
        await ctx.dispose()
    }
    throw new Error(`DHIS2 login failed for ${username} (${diagnostics.join('; ')})`)
}

/**
 * Attempt the modern JSON login (`POST /api/auth/login`, DHIS2 2.41+) on `ctx`,
 * with the SPA CSRF handshake when CSRF is enabled. Returns the login POST's HTTP
 * status (the caller re-proves authentication via `/api/me`).
 */
async function tryModernLogin(
    ctx: APIRequestContext,
    username: string,
    password: string
): Promise<number> {
    // Prime the CSRF token: on DHIS2 2.42+ with `http.security.csrf.enabled=on`,
    // `CsrfCookieFilter` runs before the authorization check, so an anonymous GET
    // obtains the readable `XSRF-TOKEN` cookie. It MUST be anonymous — a Basic-auth
    // prime would mint an authenticated session that masks a failed login. On
    // 2.40/2.41 CSRF is disabled, no cookie is issued, and this is a no-op;
    // X-Requested-With keeps the unauthenticated prime a clean 401 (nothing to
    // follow), and maxRedirects:0 returns any stray redirect as-is rather than
    // following it to login HTML.
    try {
        await ctx.get('/api/me', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            maxRedirects: 0,
        })
    } catch {
        // The prime only matters for its Set-Cookie side-effect; a transport error
        // here just means no token, which the POST below tolerates.
    }
    const xsrf = (await ctx.storageState()).cookies.find(
        (c) => c.name === 'XSRF-TOKEN'
    )?.value

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
    const res = await ctx.post('/api/auth/login', {
        headers,
        data: { username, password },
    })
    return res.status()
}

/**
 * Attempt the legacy Struts form-login (`POST /dhis-web-commons-security/login.action`,
 * DHIS2 2.40) on `ctx`. Returns the login POST's HTTP status (the caller re-proves
 * authentication via `/api/me`).
 */
async function tryLegacyLogin(
    ctx: APIRequestContext,
    username: string,
    password: string
): Promise<number> {
    const res = await ctx.post('/dhis-web-commons-security/login.action', {
        form: { j_username: username, j_password: password },
    })
    return res.status()
}

/**
 * Prove `ctx` carries an authenticated session for `username` via `GET /api/me`.
 * Uses `X-Requested-With: XMLHttpRequest` + `maxRedirects: 0` so an unauthenticated
 * read is a clean 401 — or, on a version that 302s anyway, a non-200 returned
 * as-is (never a followed login-page HTML body that would read as a false success).
 */
async function proveSession(
    ctx: APIRequestContext,
    username: string
): Promise<{ authenticated: boolean; detail: string }> {
    try {
        const me = await ctx.get('/api/me', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            params: { fields: 'username' },
            maxRedirects: 0,
        })
        if (me.status() !== 200) return { authenticated: false, detail: `HTTP ${me.status()}` }
        const body = (await me.json()) as { username?: string }
        if (body.username === username) return { authenticated: true, detail: 'HTTP 200' }
        return {
            authenticated: false,
            detail: `HTTP 200, username ${body.username ?? '(none)'} != ${username}`,
        }
    } catch {
        // A transport error, or a non-JSON body, means we cannot prove the session
        // — treat as unauthenticated rather than crashing the run.
        return { authenticated: false, detail: 'unproven (transport/parse error)' }
    }
}
