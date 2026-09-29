# Paperless Inbox

Your [paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) inbox on your Elgato Stream Deck: see how many documents are waiting, and jump to them with one press.

Unofficial plugin, not affiliated with the paperless-ngx project.

## Features

* **Inbox** key: the number of documents carrying the inbox tag.
  * Gray at zero, amber from a configurable number of documents on.
  * With several inbox tags the counts are added up, or you pick one tag in the key settings.
  * The tag name is drawn on the key (left out if you set your own title).
  * Pressing the key opens the inbox in your browser (`<paperless>/documents?tags__id__all=<tag>`).
* **Tasks** key: how many consume / OCR tasks are running, and how many have failed. The key turns red as soon as one task failed (until you dismiss it in paperless). Pressing it opens the tasks page.
* Polls the paperless-ngx REST API every 60 seconds and refreshes right away after a settings change.

## Installation

Download the [latest release](https://github.com/kirkanos/Streamdeck-Paperless/releases/latest) and open `com.kirkanos.paperless.streamDeckPlugin`. Requires Stream Deck 7.1 or newer.

## Settings

Add a key, open its settings and enter the URL of your paperless-ngx instance and an API token, then press **Connect**. The connection is shared by all keys of the plugin.

To create the token in paperless-ngx: open your profile (the user menu at the top right, **My Profile**), and in the **API auth token** section click the generate button and copy the token. Alternatively, the Django admin under `/admin/authtoken/tokenproxy/` can create tokens for any user. The plugin only reads tags, document counts and tasks, so a user with view permissions on documents, tags and tasks is enough.

Per Inbox key you can choose the inbox tag (when there are several) and the number of documents from which the key turns amber.

## Development

Paperless Inbox is a Node.js plugin built with the official [Stream Deck SDK](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/) (`@elgato/streamdeck`, TypeScript, rollup). The settings pages use [sdpi-components](https://sdpi-components.dev).

| Path | Content |
| --- | --- |
| `src/actions/` | One class per Stream Deck action |
| `src/paperless/` | REST client polling paperless-ngx and the pure logic on its data |
| `src/render/` | SVG images for the keys |
| `plugin/` | Static plugin files: manifest, icons, settings pages (`ui/`) |
| `assets/` | Plugin icon source (rendered to PNG by the build) |
| `scripts/` | Build |

```sh
npm install
npm test               # unit tests
npm run typecheck

# Development: a parallel-installable copy "Paperless Inbox (dev)"
npm run link:dev       # build + link into Stream Deck (once)
npm run watch:dev      # rebuild and restart the plugin on every change

npm run validate       # build + streamdeck validate
npm run pack           # Release/com.kirkanos.paperless.streamDeckPlugin
```

Linking and restarting need the Stream Deck developer mode (`npx streamdeck dev`, then restart the Stream Deck app once). Plugin logs are written to `dist/<plugin id>.sdPlugin/logs/`.

GitHub Actions builds and tests every push (`.github/workflows/ci.yml`) and publishes a release with the packed plugin for tags like `v1.0.0` (`.github/workflows/release.yml`).

## Troubleshooting

* **Keys show "Connect":** enter URL and API token in the settings of any key.
* **Keys show "Offline / check settings":** paperless is not reachable from this computer or the token was rejected; the settings page shows the exact error.
* **Keys show "No inbox tag found":** mark a tag as inbox tag in paperless (Tags › edit › *Inbox tag*).
* Anything else: [open an issue](https://github.com/kirkanos/Streamdeck-Paperless/issues).
