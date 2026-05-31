# NeoIPC App — Developer Onboarding Guide

Welcome. This `docs/` folder exists for one purpose: to take a developer who has
**never used JavaScript, TypeScript, React, or the DHIS2 App Platform** and give
them enough understanding to confidently read, maintain, and extend the
`neoipc-app` codebase.

You do not need to read everything before touching the code. But if you are new
to this stack, reading the guides in order will save you a lot of confusion
later.

## What this app is, in one paragraph

`neoipc-app` is a **web application that runs inside DHIS2**. DHIS2 is a large
open-source health-information platform; "apps" are small front-end programs that
DHIS2 hosts and that talk to DHIS2's data API. This particular app lets NeoIPC
users (1) generate infection-surveillance **reports** by filling in a form, and
(2) **administer** the reference data and validation-exception files those
reports depend on. The heavy lifting of actually *building* a report (crunching
numbers, producing PDFs/HTML) happens on a separate backend service called
**NeoIPC-Reporting**; this app is the user interface that collects parameters,
sends them to that backend, and displays the result.

```
   You (browser)                DHIS2 server                 NeoIPC-Reporting
 ┌───────────────┐   /api/me   ┌──────────────┐   reverse   ┌────────────────┐
 │  neoipc-app   │────────────▶│ DHIS2 core    │   proxy     │  report engine  │
 │ (this repo)   │◀────────────│ (data, auth)  │◀───────────▶│ (PDF/HTML out)  │
 └───────────────┘             └──────────────┘  /neoipc/api └────────────────┘
```

## Recommended reading order

| # | Guide | Read this if you want to understand… |
|---|-------|--------------------------------------|
| 1 | [Getting started](./01-getting-started.md) | How to install dependencies and run the app locally. |
| 2 | [JavaScript & TypeScript](./02-javascript-and-typescript.md) | The language. Modules, `async`/`await`, types, generics — as actually used here. |
| 3 | [React](./03-react.md) | Components, JSX, props, and hooks (`useState`, `useEffect`, …). |
| 4 | [The DHIS2 App Platform](./04-dhis2-app-platform.md) | What "App Platform" means, `d2.config.js`, `app-runtime`, `@dhis2/ui`, i18n. |
| 5 | [Architecture overview](./05-architecture-overview.md) | How the pieces fit together — the 10,000-foot view with diagrams. |
| 6 | [Annotated codebase tour](./06-annotated-codebase-tour.md) | A guided, file-by-file walk through every source file. |
| 7 | [Forms & the reporting backend](./07-forms-and-the-reporting-backend.md) | The report forms, the wire contract, and the schema-drift guard. |
| 8 | [Styling, i18n & authorities](./08-styling-i18n-and-authorities.md) | CSS Modules, translation, and how access control works. |
| 9 | [Build, test & deploy](./09-build-test-deploy.md) | The scripts in `package.json` and what they do. |
| 10 | [Glossary](./10-glossary.md) | A dictionary of every acronym and jargon term used in this repo. |

## How to use this guide

- **Every concept is anchored to real code in this repo.** When a guide says "see
  `src/App.tsx`", open that file alongside the guide. The explanations are written
  *about this code*, not in the abstract.
- **File references use the `path:line` form** (e.g. `src/App.tsx:34`). In most
  editors and on GitHub these are clickable.
- **External links point to the official documentation.** When you want the
  authoritative, always-up-to-date answer, follow those links rather than trusting
  a summary here — summaries go stale, official docs are maintained.

## Where the authoritative docs live

| Topic | Official documentation |
|-------|------------------------|
| JavaScript (the language) | <https://developer.mozilla.org/en-US/docs/Web/JavaScript> |
| TypeScript | <https://www.typescriptlang.org/docs/> |
| React | <https://react.dev/> |
| React Router | <https://reactrouter.com/> |
| DHIS2 Developer Portal (home for all of the below) | <https://developers.dhis2.org/> |
| DHIS2 App Platform | <https://developers.dhis2.org/docs/app-platform/getting-started/> |
| DHIS2 App Runtime (`@dhis2/app-runtime`) | <https://developers.dhis2.org/docs/app-runtime/getting-started/> |
| DHIS2 UI library (`@dhis2/ui`) | <https://developers.dhis2.org/docs/tutorials/ui-library/> · live demos <https://ui.dhis2.nu/> |
| DHIS2 Web API | <https://docs.dhis2.org/en/develop/develop.html> |

> **The 📖 convention:** inside the concept guides (2–4 especially), a 📖 line
> after each topic links straight to the official documentation for it. Follow
> those when you want the complete reference — the guides only cover the slice this
> codebase uses.

## A note for maintainers of this guide

These documents describe the code as it is **today**. When you change the
architecture, move a file, or rename a wire parameter, update the relevant guide
in the *same* change — the repo-wide guardrail in [`CLAUDE.md`](../CLAUDE.md)
about keeping documentation in sync with the code it describes applies here too. A
guide that lies is worse than no guide.
</content>
</invoke>
