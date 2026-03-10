# Changelog

All notable changes to BørneRutiner will be documented in this file.

## [1.2.0] - 2026-03-11

### Changed
- **Data now syncs across all devices** — storage moved from browser localStorage to Home Assistant's built-in server-side storage (`frontend/set_user_data`)
- Changes on phone now instantly appear on desktop, tablet, etc.
- Existing localStorage data is automatically migrated on first load

### Added
- Loading state shown while data is fetched from HA
- Fallback to localStorage if HA storage is unavailable

## [1.1.0] - 2026-03-11

### Changed
- Tasks and children now edit **inline** — clicking ✏️ turns the row into editable fields instead of using a separate form
- Editing rows are visually highlighted with a border
- "Add new" form is always visible at the bottom, separate from editing

### Fixed
- Focus now correctly targets the inline input when editing

## [1.0.0] - 2026-03-10

### Added
- Initial release
- Three routine sections: Morning ☀️, After School 📚, Evening 🌙
- Multi-child support with custom avatars
- Interactive task checkboxes with progress bars
- Confetti celebration when a routine is fully completed
- PIN-protected parent admin panel
- Add, edit, and remove tasks per routine
- Add, edit, and remove children
- Changeable parent PIN
- Daily auto-reset of completions
- 7-day completion history pruning
- Dark mode support via HA theme variables
- HACS-compatible repository structure
