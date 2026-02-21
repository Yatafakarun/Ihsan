# Changelog

All notable changes to this project are documented in this file.

## 2026-02-21

### Added
- Static web app structure with `index.html`, CSS, and JS modules (no build tools).
- CSV fetching + robust parsing for Google Sheets (quoted fields, commas, newlines, optional header row).
- Language toggle (English/Arabic) with RTL/LTR handling and per-language category persistence.
- Dynamic categories, random reminder selection, copy, and share functionality.
- Diagnostics panel (`?debug=1`) with self-test and capability checks.
- Support for 7-column data model: `Text`, `Cats`, `Description`, `Ayah`, `Hadith`, `Quote`, `Other`.
- Optional description and sources rendering with per-line references.
- Custom font support:
  - `Jannah` for Arabic UI/main text.
  - `Uthmani Hafs` for Ayah references.

### Changed
- Visual design overhaul for a WhatsApp-status style card (gradient, depth, typography, spacing).
- RTL behavior refined: only main text is centered, details (references + description) align to start (RTL right).
- Ayah/Hadith prefixes automatically added:
  - Arabic: `قال تعالئ`, `قال رسول الله صلى الله عليه وسلم`.
  - English: `Allah, the Most High, says:` and `The Messenger of Allah (peace be upon him) said`.
- Ayah references enlarged and description text reduced for hierarchy.
- Fixed `card p` selector to target only `#reminderText`, so description size is not overridden.
- Copy/Share buttons disable when no reminders match the current filter.

### Fixed
- CSV parser syntax issues that prevented app initialization.
- `hidden` attribute styling to ensure proper visibility toggling.
- Category persistence not being overwritten before data load.
- RTL alignment inconsistencies for references and descriptions.
- `file://` fetch issue guidance (requires local HTTP server).

### Data
- English CSV URL configured in `assets/js/app.js`.
- Arabic CSV URL configured in `assets/js/app.js`.
