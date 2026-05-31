# 5 · Architecture overview

This guide is the 10,000-foot view: how the files in `src/` connect, and the path a
user's click takes from the menu to a rendered report. Read it once to build a
mental map, then use [guide 6](./06-annotated-codebase-tour.md) for the file-by-file
detail.

## 5.1 The directory map

```
src/
├── App.tsx               App root: startup fetches, gating, providers, header
├── AppContext.tsx        App-wide data (current user, reference datasets) via React Context
│
├── shell/                The two-pane frame (nav + content) and routing
│   ├── AppShell.tsx
│   ├── LeftNav.tsx
│   ├── ContentArea.tsx
│   └── Shell.module.css
│
├── menu/
│   └── categories.tsx    The single source of truth for "what pages exist"
│
├── authority/            Access control
│   ├── Authority.ts       The two NeoIPC authority strings (a type)
│   └── useAuthorities.ts  Hook: "does the user have authority X?"
│
├── pages/                One component per screen (thin; delegate to forms/admin)
│   ├── reports/{Partner,Reference}ReportPage.tsx
│   └── admin/{ReferenceData,ValidationExceptions}Page.tsx
│
├── forms/                The report parameter forms (the bulk of the UI)
│   ├── {Partner,Reference}ReportForm.tsx
│   ├── {Partner,Reference}ReportForm.spec.ts   wire-field contract (drift-checked)
│   ├── enums.ts           vendored copies of backend enums + localised labels
│   └── fields/            reusable form controls (Date, NumberRange, OrgUnit)
│
├── render/               Showing a report result
│   ├── useReportRender.ts   submit→loading→result/error lifecycle (a hook)
│   ├── ReportResultPanel.tsx loading/error/HTML switch
│   ├── InlineHtmlReport.tsx  inject backend HTML fragment + re-run its scripts
│   └── report-theme.css
│
├── admin/                The generic upload/list/delete admin pages
│   ├── AdminListPage.tsx        one generic component for all admin resources
│   ├── AdminResourceType.ts     the config interface that parametrises it
│   ├── referenceDataResource.ts \ two concrete configs
│   └── validationExceptionsResource.ts /
│
├── api/                  All network calls live here (and only here)
│   ├── neoipcReporting.ts  fetch wrapper + error class for the reporting service
│   ├── referenceData.ts    GET /reference-data (public listing)
│   ├── reports.ts          build queries + render Partner/Reference reports
│   └── admin.ts            list/upload/delete admin resources
│
├── config/
│   └── dhis2Constants.ts  pinned UIDs, org-unit levels, the reporting base path
│
└── schemas/              vendored JSON snapshots of the backend's parameter schema
    ├── partner-report.json
    └── reference-report.json
```

A guiding principle you'll notice: **network access is confined to `src/api/`.**
UI components never call `fetch` directly (except the deliberate DOM work in
`InlineHtmlReport`). They call functions in `api/`, which keeps the components
focused on presentation and makes the wire contract easy to find and audit.

## 5.2 Startup sequence

What happens when the app loads, in order (`src/App.tsx`):

```
1. App renders. Two things start loading:
     • useDataQuery(meQuery)  → GET /api/me   (current user + authorities)
     • loadReferenceDataSets  → GET /neoipc/api/reference-data
2. While either is loading → show a centred spinner.
3. If either fails (other than a 401/403 on reference-data*) → show an error NoticeBox.
4. On success → mount <AppContextProvider> with { me, referenceDataSets },
   then <HashRouter> → <AppShell>.

* A 401/403 on reference-data means "no NeoIPC access". It's treated as an
  empty list so AppShell can show the friendlier "No NeoIPC access" notice,
  keyed off the user's (empty) authorities, instead of a scary error.
```

The point of front-loading these two fetches: by the time any page renders, the
current user and the reference datasets are guaranteed present, so deeper
components can read them synchronously via `useAppContext()` without their own
loading states.

## 5.3 The shell and routing

Once `AppShell` mounts:

```
AppShell  (src/shell/AppShell.tsx)
  │  asks useAuthorities() + visibleCategories(has)
  │  → the list of menu categories THIS user may see
  │
  ├─ if empty → "No NeoIPC access" notice
  │
  └─ otherwise, a two-pane grid:
       ├── <LeftNav categories=…>      renders one MenuItem per category;
       │                                clicking navigates (useNavigate)
       └── <ContentArea visibleCategories=…>
              <Suspense>                shows a spinner while a page chunk loads
                <Routes>                one <Route> per visible category
                  → renders that category's lazy <Page/>
```

The crucial design choice: **the menu is the single source of truth for the
routes.** `src/menu/categories.tsx` lists every page once, with its route segment,
label, icon, required authority, and lazy component. `LeftNav` and `ContentArea`
both derive from that same filtered list, so the navigation and the routing can
never disagree, and a page the user lacks authority for is *not even declared as a
route* (visiting it redirects away).

## 5.4 A report, end to end

Follow a user generating a Partner Report:

```
PartnerReportPage (src/pages/reports/PartnerReportPage.tsx)
  │  const render = useReportRender(renderPartnerReport)
  │
  ├── <PartnerReportForm onSubmit={render.submit} submitting={render.loading} />
  │        user fills fields → form holds them in useState
  │        on submit → calls render.submit(values)
  │
  └── <ReportResultPanel loading … fragmentHtml … error … />

useReportRender.submit(values)  (src/render/useReportRender.ts)
  │  starts an elapsed-seconds timer (renders can take minutes)
  │  calls renderPartnerReport(baseUrl, values)
  │
  └─ renderPartnerReport  (src/api/reports.ts)
        builds URLSearchParams from the form values
        online mode → GET /neoipc/api/partner-report?…
        dataFile mode → POST /neoipc/api/partner-report (file as body)
        via fetchNeoipcReporting (src/api/neoipcReporting.ts)
        returns a RenderResult: { html } or { pdf blob }

back in useReportRender:
  • PDF result → trigger a browser download (downloadBlob), panel shows nothing
  • HTML result → store it; ReportResultPanel renders <InlineHtmlReport/>
  • error → enrich the message (RFC 7807 body) and store it; panel shows NoticeBox
```

The Reference Report follows the same shape with a different form and a different
`renderReferenceReport`; the *entire* lifecycle is shared because both pages use
the one `useReportRender` hook. This is the clearest example in the codebase of why
the hooks/components/api split pays off.

## 5.5 The admin pages, end to end

```
ReferenceDataPage / ValidationExceptionsPage
  → <AdminListPage resource={someResourceConfig} />     (ONE generic component)

AdminListPage (src/admin/AdminListPage.tsx)
  • on mount: adminList()  → GET /neoipc/api/admin/<segment>   → fill the table
  • upload form: adminUpload() → POST … → prepend the new row locally
  • per-row delete: adminDelete() → DELETE … → remove the row locally
  • download link: adminDownloadUrl() → opens the stored file in a new tab
```

The two admin screens differ *only* by a configuration object
(`referenceDataResource` vs `validationExceptionsResource`) that describes the URL
segment, labels, accepted file types, and any extra table columns. Adding a third
admin resource family means writing one more config — no new page logic. See
[guide 6](./06-annotated-codebase-tour.md#the-admin-layer) and the generics section
of [the JS/TS guide](./02-javascript-and-typescript.md#generics--types-with-a-placeholder).

## 5.6 Two backends, one app — a recurring source of confusion

This app talks to **two different servers**, and keeping them straight is essential:

| Backend | Reached via | Used for |
|---------|-------------|----------|
| **DHIS2 Web API** (`/api/...`) | `useDataQuery` (`@dhis2/app-runtime`) | current user, organisation units |
| **NeoIPC-Reporting** (`/neoipc/api/...`) | our own `fetch` wrapper (`src/api/`) | rendering reports, admin file storage, reference-data listing |

NeoIPC-Reporting is a *separate* .NET service, reverse-proxied under `/neoipc/api`
on the same DHIS2 origin (so the session cookie is shared). The base path is pinned
in `src/config/dhis2Constants.ts:36` (`NEOIPC_REPORTING_BASE`). When you read the
`api/` files, remember: those are **not** DHIS2 endpoints.

---

Next: [Annotated codebase tour](./06-annotated-codebase-tour.md) — every file,
explained.
</content>
