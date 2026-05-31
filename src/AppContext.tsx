// LEARN: This file sets up a React "Context" — a way to share data (here: the
// current user + reference datasets, fetched once in App.tsx) with any component
// in the tree without passing it through every layer as props. The interfaces
// below also document the exact JSON shapes the backend sends. See docs/03 §3.6.
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
