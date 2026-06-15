/**
 * Human-readable, locale-aware language name for a BCP 47 tag (e.g.
 * `en` → "English", `de` → "German" in an English UI / "Deutsch" in a
 * German UI), falling back to the raw tag when
 * {@link Intl.DisplayNames} can't resolve it or isn't available.
 */
export const languageLabel = (tag: string): string => {
    try {
        return new Intl.DisplayNames(undefined, { type: 'language' }).of(tag) ?? tag
    } catch {
        return tag
    }
}
