// Package core owns the local file contract for Manta projects.
//
// Responsibilities:
//   - project anchor (.manta/project.json)
//   - task file format and repository
//   - status as folder location (todo / in-progress / done)
//   - context document assembly, import/export contracts
//
// Prefer the Go standard library. Heavy runtime deps (SQLite) belong in
// internal/engine, not here.
package core
