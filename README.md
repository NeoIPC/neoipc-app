# neoipc-app

This repository contains the DHIS2 App Platform application for the NeoIPC Project.

## Developing against the local stack

Bring up the DHIS2 stack from the workspace (DHIS2 + `neoipc-reporting` behind
Nginx on `http://localhost:8080`) and leave it running:

```sh
# from the workspace root
./scripts/Verify-NeoIpcApp.ps1 -KeepRunning
```

Then start the app in same-origin dev mode:

```sh
yarn start:dev
```

This serves the app on `http://localhost:3000` and points it at its **own**
origin, while the Vite dev server proxies the DHIS2 paths (`/api`, `/neoipc`,
…) to `http://localhost:8080`. Because every request is same-origin, there is
**no CORS to configure** — no `corsWhitelist` entry, no proxy flag, no cache to
clear. Log in with the local DHIS2 credentials (`admin` / `district`); the
login modal only asks for username and password (the server is fixed to the
dev origin). Edits hot-reload.

- Different DHIS2 instance: `DHIS2_PROXY_TARGET=<url> yarn start:dev`.
- Different port: `PORT=3001 yarn start:dev` (ensure the port is free).
- Plain `yarn start` instead lets you type any server in the login modal — use
  it for a remote instance that already allowlists this origin.

To validate without a stack (typecheck + schema-drift + unit tests):

```sh
yarn validate
```

## Licensing

- **Code** — MIT License (see [LICENSE](LICENSE)).
- **Documentation / content** — Creative Commons Attribution (CC-BY).
- **NeoIPC symbol & icon assets** — the app icons in [`public/`](public/) and the icon sources in [`design/`](design/) depict the NeoIPC symbol, © Fondazione Penta ETS, used under the NeoIPC brand guideline. They are **not** covered by the MIT or CC-BY licences — see [COPYRIGHT](COPYRIGHT).
