// Dev-only same-origin proxy for `yarn start:dev` (scripts/start-dev.mjs).
// That launcher sets DHIS2_BASE_URL to the dev server's own origin, so the app
// shell calls itself and the Vite dev-server proxy below forwards the DHIS2
// paths to `dhis2ProxyTarget`. Every request is then same-origin — no CORS,
// and no per-instance corsWhitelist entry to manage. Point at a different
// instance with DHIS2_PROXY_TARGET=<url>. `server.proxy` only affects
// `vite serve` (dev); production builds ignore it.
const dhis2ProxyTarget = process.env.DHIS2_PROXY_TARGET || 'http://localhost:8080'

const dhis2ProxyOptions = {
    target: dhis2ProxyTarget,
    changeOrigin: true,
    // Rewrite redirect Location headers (e.g. DHIS2's login 302) from the
    // target host back to the dev-server origin, so the browser stays
    // same-origin through the login round-trip.
    autoRewrite: true,
    // Drop the cookie Domain attribute so the DHIS2 session cookie is scoped
    // to the dev-server host the browser actually talked to.
    cookieDomainRewrite: '',
    // Tolerate a self-signed cert when DHIS2_PROXY_TARGET points at https.
    secure: false,
}

/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: 'neoipc-app',
    title: 'NeoIPC',
    description: 'NeoIPC report generation and administration',
    entryPoints: {
        app: './src/App.tsx',
    },
    minDHIS2Version: '2.40',
    customAuthorities: ['NEOIPC_ADMIN', 'NEOIPC_REPORT'],
    dataStoreNamespace: 'neoipc-app',
    shortcuts: [
        { name: 'Partner Report', url: '#/reports/partner' },
        { name: 'Reference Report', url: '#/reports/reference' },
        { name: 'Reference data', url: '#/admin/reference-data' },
        { name: 'Validation exceptions', url: '#/admin/validation-exceptions' },
    ],
    // Vite's default chunkSizeWarningLimit is 500 kB; most of our
    // baseline bundle is @dhis2/ui (the design system — ~hundreds of
    // components) which we can't meaningfully shrink. Bumping to
    // 1000 kB keeps the warning useful as a signal for *unexpected*
    // growth (a stray heavy dep landing in the shared bundle) without
    // crying wolf on every build.
    viteConfigExtensions: {
        build: {
            chunkSizeWarningLimit: 1000,
        },
        server: {
            proxy: {
                '/api': dhis2ProxyOptions,
                '/neoipc': dhis2ProxyOptions,
                '/dhis-web-commons-security': dhis2ProxyOptions,
                '/dhis-web-commons': dhis2ProxyOptions,
                '/uaa': dhis2ProxyOptions,
            },
        },
    },
}

module.exports = config
