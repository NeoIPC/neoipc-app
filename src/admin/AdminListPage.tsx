import { useConfig } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    Button,
    Card,
    CircularLoader,
    DataTable,
    DataTableBody,
    DataTableCell,
    DataTableColumnHeader,
    DataTableHead,
    DataTableRow,
    FileInput,
    InputField,
    NoticeBox,
} from '@dhis2/ui'
import React, { FC, useCallback, useEffect, useState } from 'react'
import {
    AdminResourceMetadata,
    adminDelete,
    adminDownloadUrl,
    adminList,
    adminUpload,
} from '../api/admin'
import { NeoipcReportingError } from '../api/neoipcReporting'
import { AdminResourceType } from './AdminResourceType'

interface AdminListPageProps<T extends AdminResourceMetadata> {
    resource: AdminResourceType<T>
}

/**
 * Generic list+upload+delete page for an admin-managed resource
 * family. Drop a new resource family in by adding an
 * {@link AdminResourceType} config and routing to `<AdminListPage
 * resource={config} />`.
 *
 * Always-on flow:
 *   1. Mount triggers `adminList` against `/admin/<segment>`.
 *   2. Upload form (file + displayName) calls `adminUpload`; on 201
 *      the returned metadata is prepended to the list locally rather
 *      than re-fetching, so the new row appears immediately.
 *   3. Per-row Delete button calls `adminDelete`; on success removes
 *      the row locally.
 *
 * Errors surface inline as `<NoticeBox>` and are non-blocking — the
 * existing list stays visible so the operator can keep working.
 */
// LEARN: ONE generic component renders BOTH admin screens. The differences
// (URL segment, labels, accepted file types, extra columns) come in as the
// `resource` config object — see src/admin/AdminResourceType.ts and the two
// concrete configs. Adding a third admin resource = write one more config, no new
// page code. This is the payoff of generics (docs/02 §2.9, docs/05 §5.5).
function AdminListPage<T extends AdminResourceMetadata>({
    resource,
}: AdminListPageProps<T>): ReturnType<FC> {
    const { baseUrl } = useConfig()
    const [items, setItems] = useState<T[] | null>(null)
    const [loadError, setLoadError] = useState<Error | null>(null)
    const [actionError, setActionError] = useState<Error | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [displayName, setDisplayName] = useState('')
    const [uploading, setUploading] = useState(false)

    const reload = useCallback(async () => {
        setLoadError(null)
        try {
            const list = await adminList<T>(baseUrl, resource.segment)
            setItems(list)
        } catch (err) {
            setLoadError(await enrichError(err))
            setItems([])
        }
    }, [baseUrl, resource.segment])

    useEffect(() => {
        void reload()
    }, [reload])

    const onUpload = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!file) return
        setUploading(true)
        setActionError(null)
        try {
            const created = await adminUpload<T>(
                baseUrl,
                resource.segment,
                file,
                displayName,
                resource.uploadContentType
            )
            setItems((prev) => (prev === null ? [created] : [created, ...prev]))
            setFile(null)
            setDisplayName('')
        } catch (err) {
            setActionError(await enrichError(err))
        } finally {
            setUploading(false)
        }
    }

    const onDelete = async (item: T) => {
        setPendingId(item.id)
        setActionError(null)
        try {
            await adminDelete(baseUrl, resource.segment, item.id)
            setItems((prev) =>
                prev === null ? prev : prev.filter((i) => i.id !== item.id)
            )
        } catch (err) {
            setActionError(await enrichError(err))
        } finally {
            setPendingId(null)
        }
    }

    return (
        <>
            <h1>{resource.title()}</h1>

            <Card>
                <h2>{i18n.t('Upload')}</h2>
                {actionError && (
                    <NoticeBox error title={i18n.t('Action failed')}>
                        {actionError.message}
                    </NoticeBox>
                )}
                <form onSubmit={onUpload}>
                    <InputField
                        name="displayName"
                        label={i18n.t('Display name')}
                        helpText={
                            resource.displayNameHelp?.() ??
                            i18n.t('Optional; blank uses a timestamp-based default.')
                        }
                        value={displayName}
                        onChange={({ value }) => setDisplayName(value ?? '')}
                    />
                    <FileInput
                        name="file"
                        accept={resource.accept}
                        onChange={({ files }) =>
                            setFile(files?.[0] ?? null)
                        }
                        disabled={uploading}
                    />
                    <Button
                        primary
                        type="submit"
                        disabled={file === null || uploading}
                        loading={uploading}
                    >
                        {i18n.t('Upload')}
                    </Button>
                </form>
            </Card>

            <Card>
                <h2>{resource.plural()}</h2>
                {loadError && (
                    <NoticeBox error title={i18n.t('Failed to load list')}>
                        {loadError.message}
                    </NoticeBox>
                )}
                {items === null ? (
                    <CircularLoader />
                ) : items.length === 0 ? (
                    <p>{i18n.t('No items.')}</p>
                ) : (
                    <DataTable>
                        <DataTableHead>
                            <DataTableRow>
                                <DataTableColumnHeader>
                                    {i18n.t('Display name')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader>
                                    {i18n.t('ID')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader>
                                    {i18n.t('Size')}
                                </DataTableColumnHeader>
                                <DataTableColumnHeader>
                                    {i18n.t('Uploaded')}
                                </DataTableColumnHeader>
                                {resource.extraColumns.map((col) => (
                                    <DataTableColumnHeader key={col.id}>
                                        {col.label()}
                                    </DataTableColumnHeader>
                                ))}
                                <DataTableColumnHeader>
                                    {i18n.t('Actions')}
                                </DataTableColumnHeader>
                            </DataTableRow>
                        </DataTableHead>
                        <DataTableBody>
                            {items.map((item) => (
                                <DataTableRow key={item.id}>
                                    <DataTableCell>
                                        <a
                                            href={adminDownloadUrl(
                                                baseUrl,
                                                resource.segment,
                                                item.id
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {item.displayName}
                                        </a>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <code>{item.id}</code>
                                    </DataTableCell>
                                    <DataTableCell>
                                        {formatBytes(item.sizeBytes)}
                                    </DataTableCell>
                                    <DataTableCell>
                                        {formatDate(item.createdAt)}
                                    </DataTableCell>
                                    {resource.extraColumns.map((col) => (
                                        <DataTableCell key={col.id}>
                                            {col.render(item)}
                                        </DataTableCell>
                                    ))}
                                    <DataTableCell>
                                        <Button
                                            small
                                            destructive
                                            disabled={pendingId === item.id}
                                            loading={pendingId === item.id}
                                            onClick={() => onDelete(item)}
                                        >
                                            {i18n.t('Delete')}
                                        </Button>
                                    </DataTableCell>
                                </DataTableRow>
                            ))}
                        </DataTableBody>
                    </DataTable>
                )}
            </Card>
        </>
    )
}

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (iso: string): string => {
    try {
        return new Date(iso).toISOString().slice(0, 19).replace('T', ' ')
    } catch {
        return iso
    }
}

const enrichError = async (err: unknown): Promise<Error> => {
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

export default AdminListPage
