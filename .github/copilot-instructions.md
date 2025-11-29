# Copilot / AI assistant instructions — Mission Control (CeciltheGreat)

This file gives short, concrete guidance so an AI coding assistant can be productive immediately in this repository.

Summary
- Single-page React app implemented primarily in a single component: `src/MissionControlApp.jsx`.
- Firebase (Realtime/Auth/Firestore) is used directly; data path and shapes are defined in the code.
- Build uses `react-scripts` and Netlify config (`netlify.toml`) that publishes the `build/` directory.

Key files to read first
- `src/MissionControlApp.jsx` — the entire UX and Firestore access patterns live here (CRUD, snapshot subscriptions, auth flows).
- `src/index.js` — lightweight entry and warnings about global dev-only tokens (`__initial_auth_token`, `__app_id`).
- `package.json` — dev scripts (start/build/test/eject) and runtime deps (React, Firebase).
- `netlify.toml` — deploys with `npm run build` and serves `build/` (redirects all paths to `/index.html`).

Architecture & data flow (concise)
- Frontend-only React SPA connecting to Firestore. No server code in repo.
- Auth: app tries `__initial_auth_token` (custom token) or falls back to `signInAnonymously()`.
- Firestore collection layout used across the app:
  artifacts / <appId> / users / <user.uid> / mission_items
- mission_items document shape (discoverable fields):
  title, description, level (1..5), parentId, status (pending|complete), deliverableUrl, startDate, dueDate, startTime, endTime, createdAt, dependencies

Project patterns & conventions
- This project keeps most logic in a single React component file. When adding features prefer smaller, clearly-named helper functions or new components in `src/` so reviewers can follow changes easily.
- UI state vs Firestore: the app subscribes via `onSnapshot` and performs optimistic reads/writes. Follow the same subscription pattern for live updates.
- Depth rule: items have levels 1..5 (Mission → Task → Subtask → Action → Step). UI enforces max depth (5).
- Locking logic: an item is considered "locked" when dependencies exist and are not complete — check `isLocked()`.

Dev / debug / build workflows
- Run locally: `npm install` (if needed) and `npm start` -> opens dev server (react-scripts).
- Build for production: `npm run build` -> artifacts placed in `build/` (Netlify uses this directory).
- Tests: `npm test` (uses react-scripts default). There are no project-specific tests found — be cautious adding tests that rely on remote Firebase.
- Deploy: Netlify (see `netlify.toml`), build step is `npm run build` and publish `build/`.

Security & environment notes
- `src/MissionControlApp.jsx` includes a firebaseConfig object and `apiKey` — these appear in repo but should be treated as sensitive in general. Avoid introducing more secrets or committing service account credentials.
- `src/index.js` warns about global tokens: `__initial_auth_token` and `__app_id`. When adding integrations, prefer explicit env variables or documented local test hooks rather than adding globals.

Practical guidance for the AI assistant
- When making edits, limit surface area: modify `MissionControlApp.jsx` or add small components under `src/` and keep the API shape consistent.
- If changing Firestore keys/paths update every reference (search for `artifacts`, `mission_items`, `appId`, `user.uid`).
- Prefer read-only changes or feature flags when uncertain — this repo expects a single-component approach, so big refactors should be broken into small, testable commits.
- For offline testing, warn the user that Firestore is remote; propose running a local Firebase emulator (not currently configured in repo) if they want full offline tests.

Examples (how to quickly find the right spots)
- To change how deliverables are stored: edit `handleUploadDeliverable` in `src/MissionControlApp.jsx`.
- To change the DB collection root or app id: search for `collection(db, 'artifacts'` and inspect the `appId` variable near top of `src/MissionControlApp.jsx`.

If anything here is unclear or you want more examples (tests, CI, or a suggested refactor plan), tell me which area to expand and I’ll update this file.
