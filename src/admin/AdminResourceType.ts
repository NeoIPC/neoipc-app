import type { ReactNode } from 'react'
import type { AdminResourceMetadata } from '../api/admin'

/**
 * Configuration for one admin-managed resource family. Drives the
 * generic {@link AdminListPage} component so a new resource family
 * (e.g. signature images, certificate templates) can be added by
 * dropping in another config — no per-resource page component
 * needed.
 *
 * User-facing strings (`title`, `singular`, `plural`, `displayNameHelp`,
 * `extraColumns[].label`) are declared as `() => string` thunks rather
 * than plain strings so each call site can use a literal
 * `i18n.t('...')` invocation that the `@dhis2/d2-i18n` extractor
 * picks up into `i18n/en.pot`. Passing the strings as variables to
 * `i18n.t` at render time would defeat the extractor.
 */
export interface AdminResourceType<
    T extends AdminResourceMetadata = AdminResourceMetadata,
> {
    /** URL segment under `/neoipc/api/admin/` (e.g. `reference-data`). */
    segment: string
    /** Page heading. */
    title: () => string
    /** Singular label for snackbars: "reference dataset", "validation exception file". */
    singular: () => string
    /** Plural label for headings / counts: "reference datasets". */
    plural: () => string
    /** `accept` attribute on the file input (`application/json`, `text/csv`, …). */
    accept: string
    /**
     * `Content-Type` to send on upload. `null` uses the File's own MIME
     * — appropriate when the backend records and replays the type
     * (validation-exceptions). Reference-data **requires** an explicit
     * `application/json` per the backend.
     */
    uploadContentType: string | null
    /** Help text for the displayName input, if any. */
    displayNameHelp?: () => string
    /**
     * When `true`, a successful upload/delete of this resource re-fetches the
     * app-level `referenceDataSets` (via {@link AppContextValue.reloadReferenceDataSets})
     * so the report forms' benchmark pickers reflect the change immediately.
     * Set only on the reference-data resource — the forms read no other admin
     * resource.
     */
    refreshesAppReferenceData?: boolean
    /** Resource-specific columns rendered after the standard ones. */
    extraColumns: ReadonlyArray<AdminResourceColumn<T>>
}

export interface AdminResourceColumn<T extends AdminResourceMetadata> {
    /** Stable identifier for React keys (locale-independent). */
    id: string
    /** Column header. */
    label: () => string
    /** Cell renderer; returns React-renderable content. */
    render: (item: T) => ReactNode
}
