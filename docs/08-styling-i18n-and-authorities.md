# 8 · Styling, i18n & authorities

Three concerns cut across the whole app. None is hard, but each has a "why is it
done *this* way?" that confuses newcomers. This guide answers those.

## 8.1 Styling

The app gets most of its appearance for free from `@dhis2/ui` components. Where it
adds its own CSS, it does so in two ways.

### Design tokens (CSS variables)

`App.tsx:81` renders `<CssVariables colors spacers theme />`, which injects DHIS2's
design tokens as CSS custom properties. The app's own CSS then references them
instead of hard-coding values:

```css
border-right: 1px solid var(--colors-grey300);   /* Shell.module.css */
padding: var(--spacers-dp16) 0;
```

Using tokens means the app tracks DHIS2's look automatically. The token names
(`--colors-grey300`, `--spacers-dp16`, `--spacers-dp24`, …) are documented with the
UI library at <https://ui.dhis2.nu/>.

### CSS Modules

`src/shell/Shell.module.css` is a **CSS Module** — any file named `*.module.css`.
You import it as an object and use its class names as properties:

```tsx
import styles from './Shell.module.css'
…
<div className={styles.shell}> … <nav className={styles.leftNav}>
```

The build tool rewrites each class name to a unique string at build time, so
`.shell` here can never clash with a `.shell` defined elsewhere. The
`types/modules.d.ts` declaration is what tells TypeScript that importing a
`.module.css` yields an object of strings.

> **Plain CSS vs CSS Module — when is which used?** `report-theme.css` is plain
> (non-module) CSS, imported once in `App.tsx` for its side effect. That's
> deliberate: it styles HTML that is injected later by `InlineHtmlReport` under a
> *fixed* id (`#neoipc-rendered-report`), so its selectors must be global and
> stable — exactly what a CSS Module's name-scrambling would prevent. The container
> id is a contract with the backend (which prefix-scopes the report's own styles to
> that id); see `src/render/InlineHtmlReport.tsx` and `report-theme.css`.

### Print isolation

`report-theme.css`'s `@media print` block hides everything except the rendered
report when the user prints. It uses `visibility: hidden` rather than `display:
none` so the print engine can still measure layout. This is the kind of detail
worth knowing exists before you "tidy up" the CSS.

> 📖 **Reference:** MDN — [Using CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) · [`@media`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media). CSS Modules: the [css-modules spec](https://github.com/css-modules/css-modules) and [Vite's CSS Modules support](https://vite.dev/guide/features.html#css-modules).

## 8.2 Internationalisation (i18n)

DHIS2 runs worldwide, so **every** user-facing string must be translatable. The
library is `@dhis2/d2-i18n` and the rule is simple to apply but has consequences
for how you write strings.

### The basic usage

Wrap display text in `i18n.t(...)`:

```tsx
<h1>{i18n.t('Partner Report')}</h1>
<NoticeBox title={i18n.t('No NeoIPC access')} warning> … </NoticeBox>
```

Interpolation uses named placeholders:

```tsx
i18n.t('Rendering report... (elapsed {{seconds}}s …)', { seconds: elapsedSeconds })
```
(`src/render/ReportResultPanel.tsx:35`)

### The extraction pipeline

- `yarn i18n:extract` scans the source for `i18n.t('...')` calls and writes the
  source strings into `i18n/en.pot` (a template).
- Translators produce per-language `.po` files (`i18n/de.po`, etc.).
- `yarn i18n:generate` compiles those into the runtime bundle (the git-ignored
  `src/locales/`).

### The consequence: literal strings only

The extractor finds strings by reading the source text — it does **not** run the
code. So the argument to `i18n.t` must be a **literal string at the call site**.
This single constraint explains several otherwise-odd patterns in the codebase:

- **Labels are thunks `() => i18n.t('…')`** (menu categories, admin resource
  configs). If a label were stored as a plain string computed once at module load,
  (a) the extractor would still see the literal, but (b) it wouldn't re-translate
  when the user switches language. The thunk defers the lookup to render time. See
  `src/menu/categories.tsx` and `src/admin/AdminResourceType.ts`.
- **Enum labels use big `switch` statements** rather than a clever
  `i18n.t(someVariable)` (`src/forms/enums.ts`). Passing a *variable* to `i18n.t`
  would be invisible to the extractor — the strings would never make it into the
  template. So each case is a separate literal `i18n.t('Birth weight figure')`,
  etc. The doc comments in `enums.ts` call this out explicitly.

If you ever write `i18n.t(someVariable)`, the string won't be translated. That's
the one i18n mistake to watch for.

> 📖 **Reference:** [Guide: How to add translation support to an application](https://developers.dhis2.org/docs/guides/translation-support/) · [`@dhis2/d2-i18n` on npm](https://www.npmjs.com/package/@dhis2/d2-i18n)

## 8.3 Authorities (access control)

"Authorities" are permission strings DHIS2 attaches to a user's role. This app uses
them to decide what each user can see.

### The two custom authorities

Declared in `d2.config.js` (`customAuthorities: ['NEOIPC_ADMIN',
'NEOIPC_REPORT']`) and typed in `src/authority/Authority.ts`:

```ts
export type AppAuthority = 'NEOIPC_ADMIN' | 'NEOIPC_REPORT'
```

On install, DHIS2 makes these assignable in the User Role editor. A user's
authorities arrive at startup via `GET /api/me` (`src/App.tsx:27`) and are stored
in context.

### The `has` predicate

`useAuthorities()` (`src/authority/useAuthorities.ts`) returns `{ has }`, where
`has(authority)` is true if the user holds that authority **or** the DHIS2 superuser
authority `'ALL'`:

```ts
has: (authority) =>
    authorities.includes('ALL') || authorities.includes(authority)
```

Honouring `'ALL'` means superusers see everything without needing the
NeoIPC-specific authorities assigned — standard DHIS2 behaviour.

### How access shapes the UI

The menu is filtered by authority in `visibleCategories(has)`
(`src/menu/categories.tsx`): each category names a `requiredAuthority`, and only
categories the user qualifies for are returned. Because `LeftNav` *and* the routes
in `ContentArea` both derive from that filtered list:

- the user only sees menu items they can use, **and**
- the corresponding routes don't even exist for them — visiting one redirects to
  their first allowed page.

If the filtered list is empty, `AppShell` shows the "No NeoIPC access" notice
instead of an empty frame.

### Where access is *not* fully enforced

Client-side gating is for UX, not security. The real enforcement is on the
**backend** — the NeoIPC-Reporting service and DHIS2 itself check permissions on
every request. That's why `App.tsx` treats a 401/403 from the reference-data
endpoint as "no access" (an expected outcome) rather than a crash: the server is
the final authority, and the UI adapts to what it says. Never assume hiding a menu
item is sufficient protection — the server check is what actually protects data.

> 📖 **Reference:** DHIS2 — [Configuring authorities for user roles](https://docs.dhis2.org/en/use/user-guides/dhis-core-version-master/configuring-the-system/users-roles-and-groups.html) · App-level custom authorities are declared via [`customAuthorities` in `d2.config.js`](https://developers.dhis2.org/docs/app-platform/config/d2-config-js-reference/).

---

Next: [Build, test & deploy](./09-build-test-deploy.md) — the commands and what
they produce.
</content>
