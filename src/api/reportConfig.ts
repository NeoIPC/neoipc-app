import { fetchNeoipcReporting } from './neoipcReporting'

/**
 * The report URL segments the config endpoints are mounted under
 * (`/<report>/presets`, `/<report>/locales`).
 */
export type ReportSegment = 'partner-report' | 'reference-report'

/**
 * A preset's content overrides: a map of param name → value. Values are
 * the `includeX` figure/table booleans, the two `includeXTexts`
 * booleans, and the confidence-interval token (under the QMD param key
 * `includeConfidenceIntervals`). Each preset lists **only** the params
 * that differ from the QMD defaults — the effective set is
 * `defaults ⊕ overrides`.
 */
export type PresetOverrides = Record<string, boolean | string>

/** Named presets: preset name → its {@link PresetOverrides}. */
export type PresetMap = Record<string, PresetOverrides>

/**
 * Fetch a report's content presets from `GET /<report>/presets`. The
 * backend reads these at runtime from the Surveillance-Toolkit's
 * `presets.json`, so they change with the report without an app release.
 */
export const loadPresets = async (
    baseUrl: string,
    report: ReportSegment
): Promise<PresetMap> => {
    const response = await fetchNeoipcReporting(baseUrl, `/${report}/presets`)
    return (await response.json()) as PresetMap
}

/**
 * Fetch a report's supported locale tags from `GET /<report>/locales`
 * (the language codes for which a `{Report}.<lang>.qmd` wrapper exists).
 * The app renders human-readable language names client-side; the wire
 * value stays the tag.
 */
export const loadLocales = async (
    baseUrl: string,
    report: ReportSegment
): Promise<string[]> => {
    const response = await fetchNeoipcReporting(baseUrl, `/${report}/locales`)
    return (await response.json()) as string[]
}
