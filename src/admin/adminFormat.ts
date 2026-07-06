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
