// LEARN: A tiny API module. `response.json() as PublicReferenceDataMetadata[]`
// asserts the decoded JSON's shape — TypeScript trusts us here with no runtime
// check (docs/02 §2.9). This is run once at startup by App.tsx.
import type { PublicReferenceDataMetadata } from '../AppContext'
import { fetchNeoipcReporting } from './neoipcReporting'

/**
 * Fetch the public reference-data listing — the set of saved reference
 * datasets a partner can pick when rendering the Reference Report.
 * Maps to `GET /neoipc/api/reference-data` on the deployed instance.
 */
export const loadReferenceDataSets = async (
    baseUrl: string
): Promise<PublicReferenceDataMetadata[]> => {
    const response = await fetchNeoipcReporting(baseUrl, '/reference-data')
    return (await response.json()) as PublicReferenceDataMetadata[]
}
