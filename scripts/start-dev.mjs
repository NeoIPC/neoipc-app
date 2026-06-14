#!/usr/bin/env node
/*
 * Local-stack dev launcher.
 *
 * Serves the app same-origin against the DHIS2 stack brought up by the
 * workspace `scripts/Verify-NeoIpcApp.ps1 -KeepRunning` (DHIS2 on
 * http://localhost:8080). It sets DHIS2_BASE_URL to the dev server's own
 * origin, so the app shell targets itself and the Vite dev-server proxy (see
 * d2.config.js) forwards /api, /neoipc, etc. to DHIS2 — every request is then
 * same-origin, so there is no CORS and no per-instance corsWhitelist entry to
 * manage.
 *
 * Assumes the dev server can bind port 3000 (override with PORT); the proxy
 * target defaults to http://localhost:8080 (override with DHIS2_PROXY_TARGET).
 * Use plain `yarn start` instead to choose a server in the login modal — e.g.
 * a remote instance that already allowlists this origin.
 */
import { spawn } from 'node:child_process'

const port = String(process.env.PORT || 3000)
if (!/^\d+$/.test(port)) {
    console.error(`start-dev: PORT must be numeric, got "${port}"`)
    process.exit(1)
}

// Pass a single command string (not an args array) so Node doesn't warn about
// unescaped args under shell:true (DEP0190). shell:true lets the platform
// resolve the d2-app-scripts bin shim from node_modules/.bin (on PATH because
// this runs via a yarn script); `port` is validated numeric above, so its
// interpolation into the shell string is safe.
const child = spawn(`d2-app-scripts start --port ${port}`, {
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        DHIS2_BASE_URL:
            process.env.DHIS2_BASE_URL || `http://localhost:${port}`,
    },
})

child.on('exit', (code) => process.exit(code ?? 0))
