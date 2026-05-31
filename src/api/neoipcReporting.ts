// LEARN: ALL network calls in this app live under src/api/ — UI components never
// call fetch() directly. This file is the foundation for talking to the
// NeoIPC-Reporting service (a SEPARATE backend from DHIS2; docs/05 §5.6). Every
// other api/*.ts file builds on fetchNeoipcReporting below. `async`/`await` and
// Promises are explained in docs/02 §2.8.
import { NEOIPC_REPORTING_BASE } from '../config/dhis2Constants'

/**
 * Build an absolute URL to a NeoIPC-Reporting endpoint, scoped to the
 * DHIS2 base URL provided by `@dhis2/app-runtime`'s `useConfig()`.
 *
 * @param baseUrl  DHIS2 origin from `useConfig().baseUrl`
 * @param path     Endpoint path beginning with `/`
 *                 (e.g. `/reference-data`, `/admin/validation-exceptions`)
 */
export const neoipcReportingUrl = (baseUrl: string, path: string): string =>
    `${baseUrl.replace(/\/$/, '')}${NEOIPC_REPORTING_BASE}${path}`

/**
 * Error thrown by {@link fetchNeoipcReporting} when the response
 * status is outside 2xx. Carries the raw {@link Response} so callers
 * can read the body / headers for richer error UIs.
 */
export class NeoipcReportingError extends Error {
    constructor(public readonly response: Response) {
        super(
            `NeoIPC-Reporting ${response.status} ${response.statusText}`
        )
        this.name = 'NeoipcReportingError'
    }
}

/**
 * `fetch` wrapper for NeoIPC-Reporting endpoints: always sends the
 * DHIS2 session cookie via `credentials: 'include'`, throws
 * {@link NeoipcReportingError} on non-2xx responses, otherwise
 * returns the raw {@link Response} so callers choose how to decode
 * (`.json()`, `.blob()`, `.text()` for HTML fragments).
 */
export const fetchNeoipcReporting = async (
    baseUrl: string,
    path: string,
    init?: RequestInit
): Promise<Response> => {
    // LEARN: `credentials: 'include'` sends the DHIS2 session cookie so the
    // reporting service knows who we are (auth is inherited from DHIS2; docs/04 §4.1).
    // `...init` spreads the caller's options on top of our defaults (docs/02 §2.6).
    const response = await fetch(neoipcReportingUrl(baseUrl, path), {
        credentials: 'include',
        ...init,
    })
    if (!response.ok) {
        throw new NeoipcReportingError(response)
    }
    return response
}
