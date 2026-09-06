# Changelog

Notable changes to the NeoIPC DHIS2 app.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version lives in
[package.json](package.json). The release workflow reads the section matching the released version
out of this file and publishes it as the GitHub Release body, so a release cannot be cut for a
version this file does not describe.

## [0.0.1-alpha] - 2026-07-02

First published version.

### Added

- The Partner Report and Reference Report forms, rendering to inline HTML or a PDF download through
  the NeoIPC reporting service.
- Administration of the reference datasets the Reference Report is rendered from, and of the
  validation-exception file.
- Authority-filtered navigation: what a user sees follows the `F_NEOIPC_*` authorities they hold, so
  a report-only user is offered neither admin view.
- Per-user org-unit scoping on the department picker, so a partner reaches their own department and
  no other.
- A localized user interface, following the DHIS2 user's own locale setting.
