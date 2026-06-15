import { useAppContext } from '../AppContext'
import type { AppAuthority } from './Authority'

/** DHIS2 superuser authority — implicitly grants every NeoIPC-specific gate. */
const ALL_AUTHORITY = 'ALL'

/**
 * Accessor for the current user's authority set, pre-fetched at app
 * startup. Returns a `has(authority)` predicate that treats DHIS2
 * superusers (`ALL`) as holding every NeoIPC-specific authority, plus
 * an `isAdmin` convenience (holds `F_NEOIPC_ADMIN`, or `ALL`) for gating
 * admin-only form fields.
 */
export const useAuthorities = (): {
    has: (authority: AppAuthority) => boolean
    isAdmin: boolean
} => {
    const { me } = useAppContext()
    const authorities = me.authorities
    const has = (authority: AppAuthority): boolean =>
        authorities.includes(ALL_AUTHORITY) || authorities.includes(authority)
    return { has, isAdmin: has('F_NEOIPC_ADMIN') }
}
