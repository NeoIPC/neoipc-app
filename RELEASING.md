# Releasing

neoipc-app is a single product released with **`vX.Y.Z` git tags** (npm/semver, so a pre-release
suffix like `v0.0.1-alpha` is valid). The version in `package.json` is the source of truth (the
`d2-app-scripts` build reads it; `d2.config.js` sets no `version`).

## How a release works

1. **Bump `package.json`'s `version`** on `main` (via a PR) to the version you intend to release.
2. **Publish a GitHub Release** whose tag is `v<that-version>` (e.g. `v0.0.1-alpha`). Mark it
   **pre-release** while the app is alpha. Creating the Release is a deliberate human step.
3. CI (`.github/workflows/release.yml`) then, on the published Release:
   - verifies the tag (minus `v`) equals `package.json`'s version (a mismatch fails the release);
   - runs `yarn build`, producing the installable bundle `build/bundle/neoipc-app-<version>.zip`;
   - attaches the `.zip` to the Release.

Manual `workflow_dispatch` builds the bundle without attaching (a build smoke-test).

## Installing a release

The `.zip` asset is a standard DHIS2 app bundle. Install it on a DHIS2 instance via **App Management
→ Upload app**, or with `d2-app-scripts deploy`. Publishing to the **DHIS2 App Hub** is a separate,
credentialed step and is not automated here.

## Consumers

The reporting stack records which neoipc-app release it was validated against: the NeoIPC Surveillance
Reports product (Surveillance-Toolkit `reports/compatibility.yml`) names the `neoipc-app` version it
was tested with, and the NeoIPC-Reporting image derives that value onto itself as a
`net.neoipc.app.tested` label. That reports release's CI blocks it from naming an unreleased
neoipc-app, so a referenced version is always a real released tag.
