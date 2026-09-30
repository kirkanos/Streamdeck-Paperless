# Streamdeck-Paperless

Stream Deck plugin `com.kirkanos.paperless`. Status: M1–M4 done, released 1.0.0.

## Goal

See whether documents are waiting in the paperless-ngx inbox, and jump to them with one press.

## Keys & dials

- **Inbox** key: number of documents carrying the inbox tag, gray at zero, amber from a configurable threshold. Press opens `https://paperless.example.com/documents?tags__id__all=<inboxTagId>` in the browser.
- **Tasks** key (optional): number of running or failed consume/OCR tasks, red on failure. Press opens the tasks page.

## Data source & API

- paperless-ngx REST with `Authorization: Token <token>`:
  - `GET /api/tags/?is_inbox_tag=true` to find the inbox tag IDs.
  - `GET /api/documents/?tags__id__all={id}&page_size=1` and read `count`.
  - `GET /api/tasks/` for the Tasks key.
- Poll every 60 s. The instance is served without an SSO proxy in front of the API, so the token is enough.

## Settings

- Base URL (e.g. `https://paperless.example.com`), API token, threshold.

## Open questions

- Several inbox tags are possible; the key sums them unless one is selected.
- Whether the plugin should also show a folder profile with the newest inbox documents (title, press opens the document). Nice to have, not planned.

## Milestones

- M1: Inbox key with count and open action.
- M2: Tasks key.
- M4: CI workflows, release `v1.0.0` (no dial needed).

## Scaffold

Copy the tooling from [Kuma Glance](https://github.com/kirkanos/kuma-glance) (`../Streamdeck-Uptime-Kuma`), not from Termine:

- `@elgato/streamdeck` ^3, `@elgato/cli`, TypeScript, rollup via `scripts/build.mjs` and `createRollupConfig()` from its `rollup.config.mjs`; `tsconfig` extends `@tsconfig/node20`, `moduleResolution: Bundler`, `customConditions: ["node"]`.
- Manifest: SDKVersion 3, Nodejs 24, `Software.MinimumVersion` 7.1, version `0.0.0.0` (the build fills it in).
- Layout: `plugin/` (manifest, `ui/`, `layouts/`, icons), `src/plugin.ts`, `src/actions/`, `src/<service>/`, `src/render/` (reuse `svg.ts` and `theme.ts`).
- Dev variant `<uuid>-dev` via `--dev`, `npm run link:dev`, `npm run watch:dev`.
- Settings pages: static HTML with vendored sdpi-components 4.0.1 in `plugin/ui/`.
- CI: `.github/workflows/ci.yml` (typecheck, vitest, pack, artifact) and `release.yml` (tag `v*`, `PLUGIN_VERSION`, `gh release create`).
- Tests: vitest for model and render code, like `render.test.ts` in Kuma Glance.
- Secrets live in the action settings, never in global settings. Passwords are exchanged for a token once and not stored.
- No license for now.
