# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-03-29

### Added
- **Global:** Added `CONTRIBUTING.md` and `README.md` project documentation templates.
- **Global:** Added environment configuration templates (`.env.example`) across apps.

### Fixed
- **Web Build:** Bypassed Vite's regex dependency scanner attempting to resolve `openai` from documentation snippet strings in `+page.svelte`.
- **Web Dependencies:** Updated `@sveltejs/vite-plugin-svelte` to `^4.0.0-next.6` to ensure compatibility with Svelte 5 and suppress Vite warnings. Added corresponding overrides to prevent underlying mismatched peer dependencies.

## [0.1.0] - 2026-03-28

### Added
- Initial release.
- Added initial SvelteKit web application (`@promptvcs/web`).
- Added Hono API backend interface (`@promptvcs/api`).
- Added Typescript SDK repository structure (`promptvcs`).
