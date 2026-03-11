# Changelog

All notable changes to BørneRutiner will be documented in this file.

## [1.4.0] - 2026-03-11

### Changed
- **Server-level shared storage** — data is now stored in a shared HA entity (`sensor.boerne_rutiner_data`) instead of per-user storage, so ALL users see the same data regardless of which HA account they are logged in with
- Real-time sync via HA's built-in entity state push — changes appear instantly on all devices without polling
- Per-user storage kept as backup for HA restart recovery

### Added
- Automatic migration from per-user storage to shared entity on first load
- Echo suppression to prevent re-rendering your own saves

## [1.3.0] - 2026-03-11

### Added
- **Cross-device sync** — periodic background resync every 30 seconds
- Visibility-change refresh: data reloads instantly when app/tab is foregrounded
- Smart change detection: only re-renders when data actually changed

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
