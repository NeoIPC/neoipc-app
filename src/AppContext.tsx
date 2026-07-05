import React, { useContext } from 'react'

/**
 * Pre-fetched DHIS2 `/api/me` shape, scoped to the fields the app
 * actually consumes.
 */
export interface MeData {
    id: string
    authorities: string[]
}

/**
 * Public listing entry for a reference dataset, returned by
 * `GET /neoipc/api/reference-data`. Mirrors
 * `NeoIPC.Reporting.Resources.PublicReferenceDataMetadata` (camelCased
 * by the backend's `JsonNamingPolicy.CamelCase`).
 */
export interface PublicReferenceDataMetadata {
    id: string
    displayName: string
    reportingPeriodFrom?: string
    reportingPeriodTo?: string
    birthWeightFrom?: number
    birthWeightTo?: number
    gestationalAgeFrom?: number
    gestationalAgeTo?: number
    countries?: string[]
    includeTestUnits: boolean
    includeNonCorePatients: boolean
    createdAt: string
}

export interface AppContextValue {
    me: MeData
    referenceDataSets: PublicReferenceDataMetadata[]
    /**
     * Re-fetch the public reference-dataset listing and update the shared
     * value. The list is otherwise fetched once at startup, so call this after
     * an admin upload/delete to keep the report forms' benchmark pickers in
     * sync without a full app reload.
     */
    reloadReferenceDataSets: () => Promise<void>
}

const AppContext = React.createContext<AppContextValue | null>(null)

export const AppContextProvider = AppContext.Provider

/**
 * Consume the top-level pre-fetched data. Throws if used outside the
 * provider — the provider is mounted by `App` once the gating fetches
 * have resolved, so any descendant accessing this hook is guaranteed
 * to see populated data.
 */
export const useAppContext = (): AppContextValue => {
    const value = useContext(AppContext)
    if (value === null) {
        throw new Error(
            'useAppContext must be used inside <AppContextProvider>'
        )
    }
    return value
}
