# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-03-29

### Fixed
- **Build:** Bypassed Vite's regex dependency scanner attempting to resolve `openai` from documentation snippet strings in `+page.svelte`.
- **Dependencies:** Updated `@sveltejs/vite-plugin-svelte` to `^4.0.0-next.6` to ensure compatibility with Svelte 5 and suppress Vite warnings. Added corresponding overrides to prevent underlying mismatched peer dependencies.
