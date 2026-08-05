# desktop — Wails Local Workspace

Manta desktop GUI. Replaces the former Electron app.

## Rules

- Backend is Go. Bind to `internal/core` (and `internal/engine` when needed).
- Do **not** shell out to the `manta` CLI or parse CLI stdout/stderr.
- Frontend is presentation only. File contract and state transitions live in Go.
- Preview is read-only; no file writes without an explicit save action.

## Commands

```bash
# From this directory, after `wails init` / scaffold exists:
wails dev
wails build
```

Scaffold the Wails app when Phase 4 (Local GUI) starts. Until then this
directory is a placeholder for the stack decision (Wails, not Electron).
