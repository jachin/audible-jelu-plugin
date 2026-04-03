# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-03

### Changed

- Replaced the overly broad `<all_urls>` host permission with the minimum required
  permissions: `*://*.audible.com/*`, `*://*.audible.ca/*`, and `*://*.audible.co.uk/*`.
  The extension now requests access to the user's Jelu server URL on demand at login
  time via the browser's optional permissions API, rather than holding blanket access
  to all websites.
- Corrected the `license` field in `package.json` from `ISC` to `MIT` to match the
  `LICENSE` file, and added the author name.

## [1.0.0] - 2025-01-01

### Added

- Initial release.
- Automatic book data detection on Audible book pages.
- Import of audiobook metadata (title, authors, narrators, cover art, series, and
  more) to a self-hosted Jelu instance.
- Duplicate detection to prevent re-importing books already in your library.
- Persistent Jelu sessions using token-based authentication (password is never stored).
- Support for audible.com, audible.ca, and audible.co.uk.

[1.0.1]: https://github.com/jachin/audible-jelu-plugin/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jachin/audible-jelu-plugin/releases/tag/v1.0.0