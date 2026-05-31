// LEARN: A "custom hook" — a function whose name starts with `use` that composes
// other hooks. This one reads the current user's authorities (permission strings
// from DHIS2) out of context and returns a `has(authority)` predicate the UI uses
// to gate features. Authorities are explained in docs/08 §8.3.
import { useAppContext } from '../AppContext'
import type { AppAuthority } from './Authority'

/** DHIS2 superuser authority — implicitly grants every NeoIPC-specific gate. */
const ALL_AUTHORITY = 'ALL'

/**
 * Accessor for the current user's authority set, pre-fetched at app
 * startup. Returns a `has(authority)` predicate that treats DHIS2
 * superusers (`ALL`) as holding every NeoIPC-specific authority.
 */
export const useAuthorities = (): { has: (authority: AppAuthority) => boolean } => {
    const { me } = useAppContext()
    const authorities = me.authorities
    return {
        has: (authority) =>
            authorities.includes(ALL_AUTHORITY) || authorities.includes(authority),
    }
}
