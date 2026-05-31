import {
    fetchNeoipcReporting,
    neoipcReportingUrl,
    NeoipcReportingError,
} from './neoipcReporting'

/**
 * Fields every admin-listed resource exposes. Backend equivalents:
 *  - {@link NeoIPC.Reporting.Resources.AdminReferenceDataMetadata}
 *  - {@link NeoIPC.Reporting.Resources.AdminValidationExceptionMetadata}
 *
 * Resource-specific fields are layered on top via a generic `T` in
 * {@link AdminResourceType}.
 */
export interface AdminResourceMetadata {
    id: string
    displayName: string
    sizeBytes: number
    contentType: string
    uploaderUserId: string | null
    createdAt: string
}

const adminPath = (segment: string, id?: string): string => {
    const base = `/admin/${segment}`
    return id ? `${base}/${encodeURIComponent(id)}` : base
}

/**
 * `GET /admin/<segment>` — full admin listing including upload-
 * bookkeeping fields (size, content type, uploader). The backend's
 * {@link camelCase} JSON naming policy maps cleanly onto `T`.
 */
// LEARN: `<T extends AdminResourceMetadata>` is a GENERIC — read it as "T is some
// type that has at least the AdminResourceMetadata fields, maybe more." This one
// function correctly types the result whether the caller asks for reference-data
// rows or validation-exception rows. It's why there's ONE generic admin page
// instead of two near-identical ones. Generics are explained in docs/02 §2.9.
export const adminList = async <T extends AdminResourceMetadata>(
    baseUrl: string,
    segment: string
): Promise<T[]> => {
    const response = await fetchNeoipcReporting(baseUrl, adminPath(segment), {
        method: 'GET',
        headers: { Accept: 'application/json' },
    })
    return (await response.json()) as T[]
}

/**
 * `POST /admin/<segment>?displayName=<encoded>` — stages the file body,
 * runs the resource-specific metadata extractor on the backend, and
 * (on success) returns 201 with the new {@link T} metadata.
 *
 * `contentType` overrides the file's auto-detected MIME — required for
 * reference-data, which the backend rejects unless the request carries
 * `Content-Type: application/json` per
 * [ReferenceDataEndpoints.cs:73-77](repos/NeoIPC-Reporting/src/NeoIPC.Reporting/Resources/ReferenceDataEndpoints.cs#L73-L77).
 * Pass `null` to let the browser send the file's own type
 * (validation-exceptions accepts anything per
 * [ValidationExceptionEndpoints.cs:52-54](repos/NeoIPC-Reporting/src/NeoIPC.Reporting/Resources/ValidationExceptionEndpoints.cs#L52-L54)).
 */
export const adminUpload = async <T extends AdminResourceMetadata>(
    baseUrl: string,
    segment: string,
    file: File,
    displayName: string,
    contentType: string | null
): Promise<T> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': contentType ?? (file.type || 'application/octet-stream'),
    }
    const qs = new URLSearchParams()
    if (displayName !== '') qs.append('displayName', displayName)
    const suffix = qs.toString() === '' ? '' : `?${qs.toString()}`
    const response = await fetchNeoipcReporting(
        baseUrl,
        `${adminPath(segment)}${suffix}`,
        {
            method: 'POST',
            headers,
            body: file,
        }
    )
    return (await response.json()) as T
}

/**
 * `DELETE /admin/<segment>/<id>`. 204 on success; 404 if the id was
 * already gone (we treat 404 as success on delete to keep the listing
 * UX idempotent against stale clicks).
 */
export const adminDelete = async (
    baseUrl: string,
    segment: string,
    id: string
): Promise<void> => {
    try {
        await fetchNeoipcReporting(baseUrl, adminPath(segment, id), {
            method: 'DELETE',
        })
    } catch (err) {
        if (err instanceof NeoipcReportingError && err.response.status === 404) {
            return
        }
        throw err
    }
}

/**
 * Open the admin download URL for a resource in a new browser tab.
 * The backend streams the raw stored file with the recorded content
 * type, and the session cookie carries over automatically.
 */
export const adminDownloadUrl = (
    baseUrl: string,
    segment: string,
    id: string
): string => neoipcReportingUrl(baseUrl, adminPath(segment, id))
