import { NeoipcReportingError } from '../api/neoipcReporting'

/** Human-readable byte size (B / KB / MB) for the admin metadata tables. */
export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** ISO timestamp → `YYYY-MM-DD HH:MM:SS`, falling back to the raw string. */
export const formatDate = (iso: string): string => {
    try {
        return new Date(iso).toISOString().slice(0, 19).replace('T', ' ')
    } catch {
        return iso
    }
}

/**
 * Turn a thrown value into a user-facing {@link Error}. For a
 * {@link NeoipcReportingError} carrying a ProblemDetails JSON body, the
 * message becomes `<status> <statusText>: <title> — <detail>`; otherwise
 * the original error (or a string-wrapped value) is returned.
 */
export const enrichError = async (err: unknown): Promise<Error> => {
    if (!(err instanceof NeoipcReportingError)) {
        return err instanceof Error ? err : new Error(String(err))
    }
    try {
        const contentType = err.response.headers.get('content-type') ?? ''
        if (contentType.includes('json')) {
            const body = (await err.response.json()) as {
                title?: string
                detail?: string
            }
            const parts = [body.title, body.detail].filter(Boolean)
            if (parts.length > 0) {
                return new Error(
                    `${err.response.status} ${err.response.statusText}: ${parts.join(' — ')}`
                )
            }
        }
    } catch {
        // Falls through to the generic status-line message below.
    }
    return err
}
