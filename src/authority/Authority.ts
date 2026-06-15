/**
 * Custom NeoIPC authorities declared in `d2.config.js`. DHIS2 creates
 * these authority strings on app install and exposes them in the User
 * Role editor; the app's menu and admin endpoints gate visibility on
 * a user holding the matching authority.
 *
 * The literal `'ALL'` DHIS2 superuser authority is honoured implicitly
 * by `hasAuthority(...)` in `useAuthorities` — superusers see
 * everything regardless of the NeoIPC-specific authorities.
 */
export type AppAuthority = 'F_NEOIPC_ADMIN' | 'F_NEOIPC_REPORT'
